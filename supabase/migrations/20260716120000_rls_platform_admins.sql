-- Migration 018b do plano de refatoração multi-tenant.
-- Policies de RLS para public.platform_admins.
--
-- Só quem já é platform_admin consegue ver a lista de platform_admins
-- (inclusive a si mesmo). Ninguém mais enxerga essa tabela via API —
-- nem anon, nem authenticated comum.
--
-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated/anon:
-- promover alguém a platform_admin só acontece via service_role
-- (manualmente), nunca pelo app. Isso evita que um bug no frontend ou
-- uma falha de validação permita alguém se auto-promover a admin da
-- plataforma.
--
-- Rollback: supabase/migrations_rollback/20260716120000_rls_platform_admins_down.sql

CREATE POLICY "platform_admins_select_own"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (is_platform_admin());
