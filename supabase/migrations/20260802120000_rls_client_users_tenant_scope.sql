-- Migration 024 do plano de refatoração multi-tenant.
-- Fecha a lacuna documentada na 018e (20260719120000_rls_client_users.sql):
-- is_tenant_admin() só verificava O PAPEL do usuário, não verificava se o
-- client_id alvo pertence ao tenant do usuário. Um tenant_admin do Tenant A
-- podia inserir/editar/remover client_users de um client do Tenant B.
--
-- Postgres não tem CREATE OR REPLACE POLICY — precisa DROP + CREATE. Mesma
-- condição nas 3 policies (INSERT/UPDATE/DELETE): is_platform_admin() sem
-- scoping (inalterado, é a mesma exceção estrutural já concedida a
-- tenant_users) OU tenant_admin do tenant dono do client_id alvo.
--
-- SELECT (client_users_select_own_client) não muda — nunca fez parte da
-- lacuna, já era `client_id = get_current_client_id()`.
--
-- Rollback: supabase/migrations_rollback/20260802120000_rls_client_users_tenant_scope_down.sql

DROP POLICY IF EXISTS "client_users_insert_platform_admin_or_tenant_admin" ON public.client_users;
DROP POLICY IF EXISTS "client_users_update_platform_admin_or_tenant_admin" ON public.client_users;
DROP POLICY IF EXISTS "client_users_delete_platform_admin_or_tenant_admin" ON public.client_users;

CREATE POLICY "client_users_insert_platform_admin_or_own_tenant_admin"
  ON public.client_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin()
    OR (
      is_tenant_admin()
      AND client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );

CREATE POLICY "client_users_update_platform_admin_or_own_tenant_admin"
  ON public.client_users
  FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin()
    OR (
      is_tenant_admin()
      AND client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  )
  WITH CHECK (
    is_platform_admin()
    OR (
      is_tenant_admin()
      AND client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );

CREATE POLICY "client_users_delete_platform_admin_or_own_tenant_admin"
  ON public.client_users
  FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR (
      is_tenant_admin()
      AND client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );
