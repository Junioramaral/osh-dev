import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CreateDatabaseData {
  client_id: string;
  machine_id?: string;
  engine: string;
  version: string;
  instance_name: string;
  endpoint?: string;
  port?: number;
  environment: string;
  criticality?: string;
  tags?: string[];
}

export interface UpdateDatabaseData {
  client_id?: string;
  machine_id?: string;
  engine?: string;
  version?: string;
  instance_name?: string;
  endpoint?: string;
  port?: number;
  environment?: string;
  criticality?: string;
  tags?: string[];
}

export const useCreateDatabase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDatabaseData) => {
      const insertData: any = {
        client_id: data.client_id,
        machine_id: data.machine_id || null,
        engine: data.engine,
        version: data.version,
        instance_name: data.instance_name,
        endpoint: data.endpoint || null,
        port: data.port || null,
        environment: data.environment,
        criticality: data.criticality || "media",
        tags: data.tags || [],
      };

      const { data: database, error } = await supabase
        .from("database_instances")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return database;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
      toast.success("Instância DB criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar instância", {
        description: error.message,
      });
    },
  });
};

export const useUpdateDatabase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDatabaseData }) => {
      const updateData: any = {
        client_id: data.client_id,
        machine_id: data.machine_id || null,
        engine: data.engine,
        version: data.version,
        instance_name: data.instance_name,
        endpoint: data.endpoint || null,
        port: data.port || null,
        environment: data.environment,
        criticality: data.criticality || "media",
        tags: data.tags || [],
      };

      const { data: database, error } = await supabase
        .from("database_instances")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return database;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
      toast.success("Instância DB atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar instância", {
        description: error.message,
      });
    },
  });
};

export const useDeleteDatabase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("database_instances")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
      toast.success("Instância DB excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir instância", {
        description: error.message,
      });
    },
  });
};
