-- Corrigir search_path das funções vault para segurança

-- Recriar função create_machine_secret com search_path seguro
CREATE OR REPLACE FUNCTION public.create_machine_secret(
  secret_value TEXT,
  secret_name TEXT
) RETURNS UUID AS $$
  SELECT vault.create_secret(
    secret_value,
    secret_name,
    'Machine credential'
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public, vault;

-- Recriar função decrypt_machine_secret com search_path seguro
CREATE OR REPLACE FUNCTION public.decrypt_machine_secret(
  secret_id UUID
) RETURNS TEXT AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public, vault;

-- Recriar função update_machine_secret com search_path seguro
CREATE OR REPLACE FUNCTION public.update_machine_secret(
  secret_id UUID,
  new_value TEXT
) RETURNS VOID AS $$
BEGIN
  PERFORM vault.update_secret(secret_id, new_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault;