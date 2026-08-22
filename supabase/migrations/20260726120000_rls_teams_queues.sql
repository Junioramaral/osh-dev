-- Migration 020f do plano de refatoração multi-tenant.
-- RLS de teams e queues, agora que ambas têm tenant_id (020e).
--
-- SEM bypass de is_platform_admin() em nenhuma das 6 policies novas:
-- teams e queues são OPERACIONAIS, fora da lista fechada de exceções do
-- CLAUDE.md (só tenants, platform_admins e tenant_users têm esse
-- bypass — Regra crítica #1).
--
-- MUDANÇA DE COMPORTAMENTO INTENCIONAL em queues: a policy legado
-- "View active queues" tinha qual = (is_active = true OR is_super_admin
-- (auth.uid())) — ou seja, ANTES, qualquer authenticated comum via
-- TODAS as queues ativas de TODOS os tenants, sem isolamento nenhum. A
-- nova "queues_select_tenant_staff" restringe a queues do PRÓPRIO
-- tenant, independente de is_active — é MAIS RESTRITIVO que antes, de
-- propósito: isolar dado entre tenants é o objetivo desta fase do
-- refactor.
--
-- Sem policy de DELETE em nenhuma das duas — exclusão só via
-- service_role, mesmo padrão das tabelas anteriores.
--
-- Rollback: supabase/migrations_rollback/20260726120000_rls_teams_queues_down.sql

-- ===================== teams =====================

DROP POLICY IF EXISTS "Super admins manage teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view all teams" ON public.teams;

CREATE POLICY "teams_select_tenant_staff"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "teams_insert_tenant_admin"
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_tenant_admin());

CREATE POLICY "teams_update_tenant_admin"
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_tenant_admin());

-- ===================== queues =====================

DROP POLICY IF EXISTS "Super admins manage queues" ON public.queues;
DROP POLICY IF EXISTS "View active queues" ON public.queues;

CREATE POLICY "queues_select_tenant_staff"
  ON public.queues
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "queues_insert_tenant_admin"
  ON public.queues
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_tenant_admin());

CREATE POLICY "queues_update_tenant_admin"
  ON public.queues
  FOR UPDATE
  TO authenticated
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_tenant_admin());
