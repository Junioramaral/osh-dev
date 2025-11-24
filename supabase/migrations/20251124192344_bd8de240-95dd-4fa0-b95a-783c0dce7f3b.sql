-- Funções SQL para gerenciar secrets no Vault
-- Estas funções são chamadas pela Edge Function com Service Role

-- Função para criar secret no Vault
CREATE OR REPLACE FUNCTION public.create_machine_secret(
  secret_value TEXT,
  secret_name TEXT
) RETURNS UUID AS $$
  SELECT vault.create_secret(
    secret_value,
    secret_name,
    'Machine credential'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Função para descriptografar secret do Vault
CREATE OR REPLACE FUNCTION public.decrypt_machine_secret(
  secret_id UUID
) RETURNS TEXT AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Função para atualizar secret existente no Vault
CREATE OR REPLACE FUNCTION public.update_machine_secret(
  secret_id UUID,
  new_value TEXT
) RETURNS VOID AS $$
BEGIN
  PERFORM vault.update_secret(secret_id, new_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover permissões públicas (apenas Service Role pode executar)
REVOKE ALL ON FUNCTION public.create_machine_secret FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_machine_secret FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_machine_secret FROM PUBLIC;