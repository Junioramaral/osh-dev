-- Rollback da migration 018a
-- (supabase/migrations/20260715120000_create_helper_functions.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Seguro rodar a qualquer momento: nenhuma policy usa essas funções ainda
-- (escopo da 018b em diante).

DROP FUNCTION IF EXISTS public.is_platform_admin();
DROP FUNCTION IF EXISTS public.get_current_tenant_id();
DROP FUNCTION IF EXISTS public.get_current_client_id();
DROP FUNCTION IF EXISTS public.is_tenant_admin();

ALTER TABLE public.tenant_users DROP CONSTRAINT IF EXISTS tenant_users_user_id_key;
ALTER TABLE public.client_users DROP CONSTRAINT IF EXISTS client_users_user_id_key;
