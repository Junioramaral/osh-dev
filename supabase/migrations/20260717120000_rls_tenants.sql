-- Migration 018c do plano de refatoração multi-tenant.
-- Policies de RLS para public.tenants.
--
-- tenants é uma das duas únicas tabelas do sistema (a outra é
-- platform_admins) onde o bypass `OR is_platform_admin()` é válido: o
-- Super Admin precisa enxergar todos os tenants pra operar a plataforma.
-- Não é o mesmo padrão de tabelas operacionais (clients, tickets, etc.),
-- onde esse bypass NUNCA deve aparecer.
--
-- Um usuário comum só vê o próprio tenant (uma linha). Só platform admin
-- pode editar um tenant (ex: desativar, mudar nome) — um tenant_admin
-- comum não pode editar os próprios dados de tenant por essa policy,
-- intencionalmente: nome/slug/is_active são gerenciados pela plataforma,
-- não pelo próprio tenant.
--
-- Nenhuma policy de INSERT/DELETE para authenticated/anon: criar ou
-- excluir um tenant é ação exclusiva de service_role. Ainda mais crítico
-- aqui do que em platform_admins, porque excluir um tenant por engano
-- teria efeito cascata sobre clients, tenant_users e client_users
-- inteiros daquele tenant.
--
-- Rollback: supabase/migrations_rollback/20260717120000_rls_tenants_down.sql

CREATE POLICY "tenants_select_own_or_platform_admin"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    id = get_current_tenant_id()
    OR is_platform_admin()
  );

CREATE POLICY "tenants_update_platform_admin_only"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
