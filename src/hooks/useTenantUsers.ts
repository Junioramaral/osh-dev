import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  email_confirmed_at: string | null;
  invited_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export const useTenantUsers = (tenantId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch users for a specific tenant
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get profiles with user_roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          phone,
          is_active,
          created_at,
          user_roles!inner (
            role,
            tenant_id
          )
        `)
        .eq("client_id", tenantId);

      if (profilesError) throw profilesError;

      // Get auth users data (email, confirmation status)
      const userIds = profiles?.map(p => p.id) || [];
      if (userIds.length === 0) return [];

      // Try to get auth users data - but don't fail if it errors
      let authUsers: any[] = [];
      try {
        const { data, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && data.users) {
          authUsers = data.users;
        }
      } catch (err) {
        console.error("Error fetching auth users:", err);
      }

      // Combine data
      const combinedUsers: TenantUser[] = (profiles || []).map((profile: any) => {
        const authUser = authUsers?.find(u => u.id === profile.id);
        const userRolesArray = Array.isArray(profile.user_roles) 
          ? profile.user_roles 
          : [profile.user_roles];
        const userRole = userRolesArray[0];

        return {
          id: profile.id,
          email: authUser?.email || "N/A",
          full_name: profile.full_name,
          phone: profile.phone || null,
          role: userRole?.role || "user",
          is_active: profile.is_active,
          email_confirmed_at: authUser?.email_confirmed_at || null,
          invited_at: authUser?.invited_at || null,
          created_at: profile.created_at,
          last_sign_in_at: authUser?.last_sign_in_at || null,
        };
      });

      return combinedUsers;
    },
    enabled: !!tenantId,
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (params: {
      email: string;
      full_name: string;
      role: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: params.email,
          full_name: params.full_name,
          tenant_id: tenantId,
          role: params.role,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
      toast.success("Usuário convidado com sucesso! Email de confirmação enviado.");
    },
    onError: (error: any) => {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Erro ao convidar usuário");
    },
  });

  // Deactivate user mutation (soft delete)
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
      toast.success("Usuário desativado com sucesso");
    },
    onError: (error: any) => {
      console.error("Error deactivating user:", error);
      toast.error("Erro ao desativar usuário");
    },
  });

  // Reactivate user mutation
  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: true })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
      toast.success("Usuário reativado com sucesso");
    },
    onError: (error: any) => {
      console.error("Error reactivating user:", error);
      toast.error("Erro ao reativar usuário");
    },
  });

  // Remove user mutation (hard delete)
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // First delete from profiles and user_roles (cascade will handle it)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      // Then delete from auth.users using admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.error("Error deleting auth user:", authError);
        // Note: Profile is already deleted, log but don't throw
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
      toast.success("Usuário removido permanentemente");
    },
    onError: (error: any) => {
      console.error("Error removing user:", error);
      toast.error("Erro ao remover usuário");
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (params: {
      userId: string;
      full_name?: string;
      email?: string;
      phone?: string;
      role?: string;
    }) => {
      // Update profile (full_name, phone)
      if (params.full_name !== undefined || params.phone !== undefined) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            ...(params.full_name !== undefined && { full_name: params.full_name }),
            ...(params.phone !== undefined && { phone: params.phone || null }),
          })
          .eq("id", params.userId);

        if (profileError) throw profileError;
      }

      // Update email via auth admin
      if (params.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          params.userId,
          { email: params.email }
        );
        if (authError) throw authError;
      }

      // Update role
      if (params.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: params.role as any })
          .eq("user_id", params.userId)
          .eq("tenant_id", tenantId);

        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
      toast.success("Usuário atualizado com sucesso");
    },
    onError: (error: any) => {
      console.error("Error updating user:", error);
      toast.error("Erro ao atualizar usuário");
    },
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const user = users?.find(u => u.id === userId);
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase.auth.admin.inviteUserByEmail(user.email);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite reenviado com sucesso");
    },
    onError: (error: any) => {
      console.error("Error resending invite:", error);
      toast.error("Erro ao reenviar convite");
    },
  });

  return {
    users,
    isLoading,
    error,
    inviteUser: inviteUserMutation.mutate,
    isInviting: inviteUserMutation.isPending,
    updateUser: updateUserMutation.mutate,
    isUpdating: updateUserMutation.isPending,
    deactivateUser: deactivateUserMutation.mutate,
    isDeactivating: deactivateUserMutation.isPending,
    reactivateUser: reactivateUserMutation.mutate,
    isReactivating: reactivateUserMutation.isPending,
    removeUser: removeUserMutation.mutate,
    isRemoving: removeUserMutation.isPending,
    resendInvite: resendInviteMutation.mutate,
    isResending: resendInviteMutation.isPending,
  };
};
