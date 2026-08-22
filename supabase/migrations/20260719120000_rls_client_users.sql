-- Migration 018e do plano de refatoração multi-tenant.
-- Policies de RLS para public.client_users.
--
-- SEM bypass de is_platform_admin() na SELECT: confirmado no CLAUDE.md
-- que client_users está fora da lista fechada de exceções (só tenants,
-- platform_admins e tenant_users têm esse bypass). Um usuário só vê os
-- colegas do próprio client (mesma empresa cliente), nunca vê usuários
-- de outro client, nem mesmo sendo platform admin, por esta policy.
--
-- INSERT/UPDATE/DELETE são platform_admin OU tenant_admin — diferente da
-- 018d (tenant_users), aqui o tenant_admin já entra: é o próprio tenant
-- que cadastra os clientes finais dele.
--
-- LIMITAÇÃO CONHECIDA, a corrigir antes da 020 (reescrita das RLS
-- operacionais): is_tenant_admin() só verifica O PAPEL do usuário, não
-- verifica de qual tenant é o client_id alvo. Um tenant_admin do Tenant
-- A, com esta policy, tecnicamente pode inserir/editar/remover
-- client_users de um client que pertence ao Tenant B. Corrigir isso
-- exige comparar client_id contra a lista de clients do tenant do
-- usuário (join com a tabela clients), o que está fora do escopo desta
-- migration — não corrigido aqui de propósito.
--
-- Rollback: supabase/migrations_rollback/20260719120000_rls_client_users_down.sql

CREATE POLICY "client_users_select_own_client"
  ON public.client_users
  FOR SELECT
  TO authenticated
  USING (client_id = get_current_client_id());

CREATE POLICY "client_users_insert_platform_admin_or_tenant_admin"
  ON public.client_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin() OR is_tenant_admin());

CREATE POLICY "client_users_update_platform_admin_or_tenant_admin"
  ON public.client_users
  FOR UPDATE
  TO authenticated
  USING (is_platform_admin() OR is_tenant_admin())
  WITH CHECK (is_platform_admin() OR is_tenant_admin());

CREATE POLICY "client_users_delete_platform_admin_or_tenant_admin"
  ON public.client_users
  FOR DELETE
  TO authenticated
  USING (is_platform_admin() OR is_tenant_admin());
