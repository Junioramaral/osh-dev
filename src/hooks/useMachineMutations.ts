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
  location?: string;
}

export const useCreateMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMachineData) => {
      let rootPasswordSecretId = null;

      // Se tem senha root, criar secret no Vault
      if (data.root_password) {
        const { data: secretData, error: secretError } = await supabase.functions.invoke(
          'machine-secrets',
          {
            body: {
              action: 'create',
              password: data.root_password,
              name: `machine_root_${data.hostname}`
            }
          }
        );

        if (secretError) throw new Error(`Erro ao criar secret root: ${secretError.message}`);
        rootPasswordSecretId = secretData.secretId;
      }

      // Processar additional_users (também criptografar senhas)
      const encryptedAdditionalUsers = [];
      for (const user of data.additional_users) {
        if (user.password) {
          const { data: userSecretData, error: userSecretError } = await supabase.functions.invoke(
            'machine-secrets',
            {
              body: {
                action: 'create',
                password: user.password,
                name: `machine_user_${data.hostname}_${user.username}`
              }
            }
          );

          if (userSecretError) throw new Error(`Erro ao criar secret do usuário ${user.username}: ${userSecretError.message}`);
          
          encryptedAdditionalUsers.push({
            username: user.username,
            password_secret_id: userSecretData.secretId,
            description: user.description || null
          });
        }
      }

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
        root_password_secret_id: rootPasswordSecretId,
        additional_users: encryptedAdditionalUsers,
        description: data.description || null,
        location: data.location || null,
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

export const useUpdateMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, originalMachine }: { id: string; data: CreateMachineData; originalMachine?: any }) => {
      let rootPasswordSecretId = originalMachine?.root_password_secret_id || null;

      // Se tem senha root nova ou alterada
      if (data.root_password) {
        if (rootPasswordSecretId) {
          // Atualizar secret existente
          const { error: updateError } = await supabase.functions.invoke(
            'machine-secrets',
            {
              body: {
                action: 'update',
                secretId: rootPasswordSecretId,
                password: data.root_password
              }
            }
          );

          if (updateError) throw new Error(`Erro ao atualizar secret root: ${updateError.message}`);
        } else {
          // Criar novo secret
          const { data: secretData, error: secretError } = await supabase.functions.invoke(
            'machine-secrets',
            {
              body: {
                action: 'create',
                password: data.root_password,
                name: `machine_root_${data.hostname}`
              }
            }
          );

          if (secretError) throw new Error(`Erro ao criar secret root: ${secretError.message}`);
          rootPasswordSecretId = secretData.secretId;
        }
      }

      // Processar additional_users (criptografar senhas novas/alteradas)
      const encryptedAdditionalUsers = [];
      for (const user of data.additional_users) {
        if (user.password) {
          // Verificar se é uma senha existente que não foi alterada (começa com uuid pattern)
          const isExistingSecret = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.password);
          
          if (isExistingSecret) {
            // Manter secret_id existente
            encryptedAdditionalUsers.push({
              username: user.username,
              password_secret_id: user.password,
              description: user.description || null
            });
          } else {
            // Criar novo secret para senha em texto plano
            const { data: userSecretData, error: userSecretError } = await supabase.functions.invoke(
              'machine-secrets',
              {
                body: {
                  action: 'create',
                  password: user.password,
                  name: `machine_user_${data.hostname}_${user.username}`
                }
              }
            );

            if (userSecretError) throw new Error(`Erro ao criar secret do usuário ${user.username}: ${userSecretError.message}`);
            
            encryptedAdditionalUsers.push({
              username: user.username,
              password_secret_id: userSecretData.secretId,
              description: user.description || null
            });
          }
        }
      }

      const updateData: any = {
        client_id: data.client_id,
        hostname: data.hostname,
        machine_type: data.machine_type,
        operating_system: data.operating_system,
        criticality: data.criticality || "media",
        environment: data.environment || null,
        ip_address: data.ip_address || null,
        root_username: data.root_username || null,
        root_password_secret_id: rootPasswordSecretId,
        additional_users: encryptedAdditionalUsers,
        description: data.description || null,
        location: data.location || null,
      };

      const { data: machine, error } = await supabase
        .from("machines")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return machine;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success("Máquina atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar máquina", {
        description: error.message,
      });
    },
  });
};
