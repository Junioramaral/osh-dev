-- Migration 018d do plano de refatoração multi-tenant.
-- Policies de RLS para public.tenant_users.
--
-- Um usuário vê os colegas do próprio tenant (equipe inteira, não só a
-- própria linha) OU o platform admin vê todos. tenant_users passa a ser
-- uma terceira tabela com bypass `OR is_platform_admin()` além de
-- tenants e platform_admins — não contradiz a Regra crítica #1 do
-- CLAUDE.md (que proíbe esse bypass em tabelas OPERACIONAIS: clients,
-- tickets, teams, queues, projects, SLA, auditoria, FAQ, CSAT, RFC).
-- tenant_users é dado de estrutura/administração de tenant, não dado
-- operacional de tenant.
--
-- Sem recursão: get_current_tenant_id() e is_platform_admin() são
-- SECURITY DEFINER e rodam com o dono da função (role de migration,
-- dono também da tabela) — table owners bypassam RLS por padrão (sem
-- FORCE ROW LEVEL SECURITY), então a subquery interna a essas funções
-- não reaciona a policy que está sendo definida aqui. Mesmo mecanismo já
-- validado em produção desde a 018b (is_platform_admin() consultando
-- platform_admins dentro de uma policy da própria platform_admins).
--
-- INSERT/UPDATE/DELETE exclusivos de platform admin nessa fase:
-- adicionar, promover/mudar role ou remover alguém de um tenant não é
-- ação de tenant_admin ainda. Intencional e temporário — dar a
-- tenant_admin permissão de gerenciar a própria equipe é um passo
-- futuro fora do escopo desta migration, pois exige uma policy mais
-- cuidadosa (tenant_admin só mexe em linhas do PRÓPRIO tenant, nunca
-- altera o próprio tenant_id pra sair dele) que ainda não foi desenhada.
--
-- Rollback: supabase/migrations_rollback/20260718120000_rls_tenant_users_down.sql

CREATE POLICY "tenant_users_select_same_tenant_or_platform_admin"
  ON public.tenant_users
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR is_platform_admin()
  );

CREATE POLICY "tenant_users_insert_platform_admin_only"
  ON public.tenant_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

CREATE POLICY "tenant_users_update_platform_admin_only"
  ON public.tenant_users
  FOR UPDATE
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "tenant_users_delete_platform_admin_only"
  ON public.tenant_users
  FOR DELETE
  TO authenticated
  USING (is_platform_admin());
