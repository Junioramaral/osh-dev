import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UserPermission {
  id: string;
  full_name: string;
  email: string;
  client_id: string | null;
  client_name: string | null;
  roles: string[]; // Array de roles para suporte a múltiplas funções
  is_active: boolean;
}

export const useUserPermissions = (filters?: {
  tenantId?: string;
  role?: string;
  status?: string;
  search?: string;
}) => {
  const queryClient = useQueryClient();

  // Query para buscar todos os usuários com suas roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["user-permissions", filters],
    queryFn: async () => {
      // Buscar profiles
      let profilesQuery = supabase
        .from("profiles")
        .select("id, full_name, is_active, client_id");

      // Aplicar filtro de tenant
      if (filters?.tenantId && filters.tenantId !== "all") {
        profilesQuery = profilesQuery.eq("client_id", filters.tenantId);
      }

      // Aplicar filtro de status
      if (filters?.status === "active") {
        profilesQuery = profilesQuery.eq("is_active", true);
      } else if (filters?.status === "inactive") {
        profilesQuery = profilesQuery.eq("is_active", false);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Buscar clients
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name");

      // Buscar todas as roles (pode ter múltiplas por usuário)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Buscar emails via Edge Function
      const { data: authData, error: authError } = await supabase.functions.invoke("manage-user", {
        body: { action: "list_users" }
      });

      if (authError) {
        console.error("Error fetching users from Edge Function:", authError);
        throw authError;
      }

      // Extrair lista de usuários da resposta (estrutura: authData.data.users)
      const authUsers = authData?.data?.users || [];

      // Mapear dados
      const usersWithPermissions: UserPermission[] = profiles.map((profile: any) => {
        // Buscar TODAS as roles do usuário (não apenas a primeira)
        const userRoles = roles?.filter((r: any) => r.user_id === profile.id) || [];
        const authUser = authUsers.find((u: any) => u.id === profile.id);
        const client = clients?.find((c: any) => c.id === profile.client_id);

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: authUser?.email || "",
          client_id: profile.client_id,
          client_name: client?.name || "Otimizzo",
          roles: userRoles.map((r: any) => r.role), // Array de roles
          is_active: profile.is_active || false,
        };
      });

      // Aplicar filtro de role (verifica se o usuário possui a role)
      let filteredUsers = usersWithPermissions;
      if (filters?.role && filters.role !== "all") {
        filteredUsers = filteredUsers.filter(u => u.roles.includes(filters.role!));
      }

      // Aplicar busca por nome ou email
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(
          u =>
            u.full_name.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
      }

      // Ordenar por tenant e nome
      return filteredUsers.sort((a, b) => {
        const tenantCompare = (a.client_name || "").localeCompare(b.client_name || "");
        if (tenantCompare !== 0) return tenantCompare;
        return a.full_name.localeCompare(b.full_name);
      });
    },
  });

  type AppRole = "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user";

  // Mutation para alterar roles (suporta múltiplas)
  const updateRolesMutation = useMutation({
    mutationFn: async ({
      userId,
      newRoles,
    }: {
      userId: string;
      newRoles: string[];
    }) => {
      // Buscar roles existentes do usuário
      const { data: existingRoles, error: fetchError } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", userId);

      if (fetchError) throw fetchError;

      const existingRoleNames: string[] = existingRoles?.map(r => r.role) || [];
      
      // Calcular diferenças
      const rolesToAdd = newRoles.filter(r => !existingRoleNames.includes(r));
      const rolesToRemove = existingRoleNames.filter(r => !newRoles.includes(r));

      // Inserir novas roles primeiro (para nunca deixar usuário sem role)
      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(rolesToAdd.map(role => ({ user_id: userId, role: role as AppRole })));
        
        if (insertError) throw insertError;
      }

      // Remover roles antigas depois
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .in("role", rolesToRemove as AppRole[]);
        
        if (deleteError) throw deleteError;
      }
    },
    onSuccess: (_, variables) => {
      const user = users.find(u => u.id === variables.userId);
      const roleLabels: Record<string, string> = {
        super_admin: "Super Admin",
        tenant_admin: "Tenant Admin",
        analyst_db: "Analista DB",
        analyst_app: "Analista APP",
        user: "Usuário"
      };
      const rolesDisplay = variables.newRoles.map(r => roleLabels[r] || r).join(", ");
      toast({
        title: "Permissões alteradas com sucesso",
        description: `${user?.full_name} agora possui: ${rolesDisplay}`,
      });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar permissões",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoading,
    updateRoles: updateRolesMutation.mutate,
    isUpdating: updateRolesMutation.isPending,
  };
};
