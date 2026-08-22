-- Rollback da migration 018b
-- (supabase/migrations/20260716120000_rls_platform_admins.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Seguro rodar a qualquer momento: remove a policy e volta
-- platform_admins pro estado da 015 (RLS habilitado, zero policies —
-- bloqueado por padrão pra anon/authenticated).

DROP POLICY IF EXISTS "platform_admins_select_own" ON public.platform_admins;
