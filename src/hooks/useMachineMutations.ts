import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdditionalUser {
  username: string;
  password: string;
  description?: string;
}

interface CreateMachineData {
  client_id: string;
  environment: string;
  operating_system: string;
  hostname: string;
  ip_address?: string;
  root_username?: string;
  root_password?: string;
  additional_users: AdditionalUser[];
  description?: string;
  machine_type: string;
  criticality?: string;
}

export const useCreateMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMachineData) => {
      // Prepare the insert data with proper typing
      const insertData: any = {
        client_id: data.client_id,
        hostname: data.hostname,
        machine_type: data.machine_type,
        operating_system: data.operating_system,
        criticality: data.criticality || "media",
        status: "ativo",
        environment: data.environment || null,
        ip_address: data.ip_address || null,
        root_username: data.root_username || null,
        root_password_secret_id: null, // Temporariamente null - implementar vault futuramente
        additional_users: data.additional_users.length > 0 ? data.additional_users : [],
        description: data.description || null,
      };

      const { data: machine, error } = await supabase
        .from("machines")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return machine;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success("Máquina criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar máquina", {
        description: error.message,
      });
    },
  });
};
