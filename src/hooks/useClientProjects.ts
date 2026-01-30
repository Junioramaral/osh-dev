import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientProject {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_overtime: boolean;
  created_at: string;
  updated_at: string;
}

export const useClientProjects = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_projects")
        .select("*")
        .eq("client_id", clientId as string)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as ClientProject[];
    },
    enabled: !!clientId,
  });
};

export const useCreateClientProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: { client_id: string; name: string; description?: string; is_active?: boolean; is_overtime?: boolean }) => {
      const { data, error } = await supabase
        .from("client_projects")
        .insert({
          client_id: project.client_id,
          name: project.name,
          description: project.description || null,
          is_active: project.is_active ?? true,
          is_overtime: project.is_overtime ?? false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-projects", variables.client_id] });
      toast.success("Projeto criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar projeto:", error);
      toast.error("Erro ao criar projeto");
    },
  });
};

export const useUpdateClientProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, client_id, ...data }: { id: string; client_id: string; name?: string; description?: string; is_active?: boolean; is_overtime?: boolean }) => {
      const { error } = await supabase
        .from("client_projects")
        .update(data as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-projects", variables.client_id] });
      toast.success("Projeto atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar projeto:", error);
      toast.error("Erro ao atualizar projeto");
    },
  });
};

export const useDeleteClientProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase
        .from("client_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-projects", variables.client_id] });
      toast.success("Projeto excluído!");
    },
    onError: (error) => {
      console.error("Erro ao excluir projeto:", error);
      toast.error("Erro ao excluir projeto");
    },
  });
};
