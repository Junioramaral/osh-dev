import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UserPermission {
  id: string;
  full_name: string;
  email: string;
  client_id: string | null;
  client_name: string | null;
  role: "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user";
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

      // Buscar roles
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
        const userRole = roles?.find((r: any) => r.user_id === profile.id);
        const authUser = authUsers.find((u: any) => u.id === profile.id);
        const client = clients?.find((c: any) => c.id === profile.client_id);

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: authUser?.email || "",
          client_id: profile.client_id,
          client_name: client?.name || "Otimizzo",
          role: (userRole?.role as "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user") || "user",
          is_active: profile.is_active || false,
        };
      });

      // Aplicar filtro de role
      let filteredUsers = usersWithPermissions;
      if (filters?.role && filters.role !== "all") {
        filteredUsers = filteredUsers.filter(u => u.role === filters.role);
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

  // Mutation para alterar role
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: "super_admin" | "tenant_admin" | "analyst_db" | "analyst_app" | "user";
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const user = users.find(u => u.id === variables.userId);
      const roleLabels = {
        super_admin: "Super Admin",
        tenant_admin: "Tenant Admin",
        analyst_db: "Analista DB",
        analyst_app: "Analista APP",
        user: "Usuário"
      };
      toast({
        title: "Permissão alterada com sucesso",
        description: `${user?.full_name} agora é ${roleLabels[variables.newRole]}`,
      });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar permissão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoading,
    updateRole: updateRoleMutation.mutate,
    isUpdating: updateRoleMutation.isPending,
  };
};
