import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  roles: string[];
  is_active: boolean;
  email_confirmed_at: string | null;
  invited_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  team_id: string | null;
  team_name: string | null;
  queue_ids: string[];
  queue_names: string[];
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
          team_id,
          teams (
            name
          ),
          user_roles (
            role,
            tenant_id
          )
        `)
        .eq("client_id", tenantId);

      if (profilesError) throw profilesError;

      // Get auth users data (email, confirmation status)
      const userIds = profiles?.map(p => p.id) || [];
      if (userIds.length === 0) return [];

      // Fetch user_queues for all users in parallel with auth users
      const [authUsersResult, userQueuesResult] = await Promise.all([
        supabase.functions.invoke("manage-user", {
          body: { action: "list_users" }
        }).catch(err => {
          console.error("Error fetching auth users:", err);
          return { data: null, error: err };
        }),
        supabase
          .from("user_queues")
          .select("user_id, queue_id, queues(name)")
          .in("user_id", userIds),
      ]);

      const authUsers = authUsersResult.data?.data?.users || [];
      const userQueuesData = userQueuesResult.data || [];

      // Build a map of user_id -> { queue_ids, queue_names }
      const userQueuesMap: Record<string, { queue_ids: string[]; queue_names: string[] }> = {};
      for (const uq of userQueuesData) {
        if (!userQueuesMap[uq.user_id]) {
          userQueuesMap[uq.user_id] = { queue_ids: [], queue_names: [] };
        }
        userQueuesMap[uq.user_id].queue_ids.push(uq.queue_id);
        userQueuesMap[uq.user_id].queue_names.push((uq.queues as any)?.name || "");
      }

      // Combine data
      const combinedUsers: TenantUser[] = (profiles || []).map((profile: any) => {
        const authUser = authUsers?.find((u: any) => u.id === profile.id);
        const userRolesArray = Array.isArray(profile.user_roles) 
          ? profile.user_roles 
          : profile.user_roles ? [profile.user_roles] : [];
        
        // Extract all roles for this user
        const roles = userRolesArray.map((r: any) => r?.role).filter(Boolean);
        const uqData = userQueuesMap[profile.id] || { queue_ids: [], queue_names: [] };

        return {
          id: profile.id,
          email: authUser?.email || "N/A",
          full_name: profile.full_name,
          phone: profile.phone || null,
          roles: roles.length > 0 ? roles : ["user"],
          is_active: profile.is_active,
          email_confirmed_at: authUser?.email_confirmed_at || null,
          invited_at: authUser?.invited_at || null,
          created_at: profile.created_at,
          last_sign_in_at: authUser?.last_sign_in_at || null,
          team_id: profile.team_id || null,
          team_name: (profile as any).teams?.name || null,
          queue_ids: uqData.queue_ids,
          queue_names: uqData.queue_names,
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
      roles: string[];
      phone?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: params.email,
          full_name: params.full_name,
          tenant_id: tenantId,
          roles: params.roles,
          phone: params.phone || null,
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

      // Then delete from auth.users using edge function
      const { data, error: authError } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", userId }
      });
      
      if (authError || data?.error) {
        console.error("Error deleting auth user:", authError || data?.error);
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
      roles?: string[];
      team_id?: string | null;
      queue_ids?: string[];
    }) => {
      // Update profile (full_name, phone, team_id)
      const profileUpdates: Record<string, any> = {};
      if (params.full_name !== undefined) profileUpdates.full_name = params.full_name;
      if (params.phone !== undefined) profileUpdates.phone = params.phone || null;
      if (params.team_id !== undefined) profileUpdates.team_id = params.team_id || null;

      if (Object.keys(profileUpdates).length > 0) {
        const { data: updatedRows, error: profileError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("id", params.userId)
          .select("id");

        if (profileError) throw profileError;
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error("Sem permissão para atualizar este usuário ou usuário não encontrado");
        }

        // Mirror name/phone into client_contacts so contact list stays in sync.
        // The trigger sync_profile_to_contacts already does this on the DB, but we
        // re-apply via the user's email to make sure rows created before the trigger
        // are also updated.
        if (
          profileUpdates.full_name !== undefined ||
          profileUpdates.phone !== undefined
        ) {
          const contactUpdates: Record<string, any> = {};
          if (profileUpdates.full_name !== undefined) contactUpdates.name = profileUpdates.full_name;
          if (profileUpdates.phone !== undefined) contactUpdates.phone = profileUpdates.phone;

          // Look up the user's email to match against client_contacts.email
          const targetEmail = params.email
            ?? (await supabase.functions
                  .invoke("manage-user", { body: { action: "get_user", userId: params.userId } })
                  .then((r: any) => r?.data?.data?.user?.email ?? null)
                  .catch(() => null));

          if (targetEmail && tenantId) {
            const { error: contactError } = await supabase
              .from("client_contacts")
              .update(contactUpdates)
              .eq("client_id", tenantId)
              .eq("email", targetEmail);
            if (contactError) {
              console.warn("[useTenantUsers] Falha ao sincronizar client_contacts:", contactError);
            }
          }
        }
      }

      // Update email via edge function
      if (params.email) {
        const { data, error: authError } = await supabase.functions.invoke("manage-user", {
          body: { 
            action: "update_email", 
            userId: params.userId, 
            data: { email: params.email } 
          }
        });
        
        if (authError || data?.error) {
          throw new Error(authError?.message || data?.error || "Erro ao atualizar email");
        }
      }

      // Update roles - safer approach: insert first, then delete old ones
      if (params.roles && params.roles.length > 0) {
        // Prepare new role inserts
        const roleInserts = params.roles.map(role => ({
          user_id: params.userId,
          role: role as any,
          tenant_id: tenantId,
        }));

        // First, get existing roles to compare
        const { data: existingRoles, error: fetchError } = await supabase
          .from("user_roles")
          .select("id, role")
          .eq("user_id", params.userId);

        if (fetchError) throw fetchError;

        const existingRoleNames = existingRoles?.map(r => r.role as string) || [];
        const newRoleNames = params.roles;

        // Determine roles to add and remove
        const rolesToAdd = newRoleNames.filter(r => !existingRoleNames.includes(r));
        const rolesToRemove = existingRoleNames.filter(r => !newRoleNames.includes(r));

        // Insert new roles first (before deleting to never leave user without roles)
        if (rolesToAdd.length > 0) {
          const addInserts = rolesToAdd.map(role => ({
            user_id: params.userId,
            role: role as any,
            tenant_id: tenantId,
          }));

          const { error: insertError } = await supabase
            .from("user_roles")
            .insert(addInserts);

          if (insertError) throw insertError;
        }

        // Remove old roles that are not in the new list
        if (rolesToRemove.length > 0) {
          const idsToRemove = existingRoles
            ?.filter(r => rolesToRemove.includes(r.role))
            .map(r => r.id) || [];

          if (idsToRemove.length > 0) {
            const { error: deleteError } = await supabase
              .from("user_roles")
              .delete()
              .in("id", idsToRemove);

            if (deleteError) throw deleteError;
          }
        }
      }

      // Update user_queues
      if (params.queue_ids !== undefined) {
        // Delete existing queue assignments
        const { error: deleteQueuesError } = await supabase
          .from("user_queues")
          .delete()
          .eq("user_id", params.userId);

        if (deleteQueuesError) throw deleteQueuesError;

        // Insert new queue assignments
        if (params.queue_ids.length > 0) {
          const queueInserts = params.queue_ids.map(queue_id => ({
            user_id: params.userId,
            queue_id,
          }));

          const { error: insertQueuesError } = await supabase
            .from("user_queues")
            .insert(queueInserts);

          if (insertQueuesError) throw insertQueuesError;
        }
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

      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { 
          action: "resend_invite", 
          data: { email: user.email } 
        }
      });
      
      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Erro ao reenviar convite");
      }
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
