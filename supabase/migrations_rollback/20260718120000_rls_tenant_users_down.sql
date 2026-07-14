-- Rollback da migration 018d
-- (supabase/migrations/20260718120000_rls_tenant_users.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Seguro rodar a qualquer momento: remove as quatro policies e volta
-- tenant_users pro estado da 016 (RLS habilitado, zero policies —
-- bloqueado por padrão pra anon/authenticated). Ordem inversa da
-- criação: delete, update, insert, select.

DROP POLICY IF EXISTS "tenant_users_delete_platform_admin_only" ON public.tenant_users;
DROP POLICY IF EXISTS "tenant_users_update_platform_admin_only" ON public.tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert_platform_admin_only" ON public.tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_same_tenant_or_platform_admin" ON public.tenant_users;
