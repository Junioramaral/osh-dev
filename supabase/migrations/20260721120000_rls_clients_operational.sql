-- Migration 020a do plano de refatoração multi-tenant.
-- Substitui as 4 policies legado de public.clients (era Lovable, usando
-- is_super_admin()/is_otimizzo_user()/get_user_tenant_id()/is_viewer())
-- pelas novas, usando as funções da 018a.
--
-- SEM bypass de is_platform_admin() em nenhuma das 3 novas policies:
-- clients é tabela OPERACIONAL, fora da lista fechada de exceções do
-- CLAUDE.md (só tenants, platform_admins e tenant_users têm esse
-- bypass — Regra crítica #1). Um platform_admin que não for também
-- tenant_user de um tenant específico NÃO vê nenhum client por esta
-- policy — isso é intencional, não é bug: o Super Admin não tem acesso
-- a dado operacional de tenant nenhum.
--
-- SEM policy de DELETE para authenticated/anon de propósito: o hard
-- delete conhecido em TenantAdmin.tsx (risco real da auditoria inicial,
-- ainda não corrigido — isso é escopo da 021) fica bloqueado pela RLS a
-- partir de agora, como proteção extra até a 021 trocar por soft delete
-- de verdade. Exclusão continua só via service_role.
--
-- Rollback: supabase/migrations_rollback/20260721120000_rls_clients_operational_down.sql

-- Remove as 4 policies legado primeiro
DROP POLICY IF EXISTS "Client view own" ON public.clients;
DROP POLICY IF EXISTS "Otimizzo view clients" ON public.clients;
DROP POLICY IF EXISTS "Super admins manage clients" ON public.clients;
DROP POLICY IF EXISTS "Viewers can view own client" ON public.clients;

-- SELECT: equipe do tenant dono vê todos os clients do tenant, OU o
-- próprio client (via client_users) vê a si mesmo
CREATE POLICY "clients_select_tenant_staff_or_own"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR id = get_current_client_id()
  );

-- INSERT/UPDATE: só tenant_admin do tenant dono
CREATE POLICY "clients_insert_tenant_admin"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin()
  );

CREATE POLICY "clients_update_tenant_admin"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (tenant_id = get_current_tenant_id() AND is_tenant_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_tenant_admin());
