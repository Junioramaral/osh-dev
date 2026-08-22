-- Rollback da migration 018c
-- (supabase/migrations/20260717120000_rls_tenants.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Seguro rodar a qualquer momento: remove as duas policies e volta
-- tenants pro estado da 015 (RLS habilitado, zero policies — bloqueado
-- por padrão pra anon/authenticated).

DROP POLICY IF EXISTS "tenants_select_own_or_platform_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_platform_admin_only" ON public.tenants;
