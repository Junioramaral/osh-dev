-- Rollback de 20260802120000_rls_client_users_tenant_scope.sql
-- Restaura as 3 policies exatamente como estavam na 018e
-- (20260719120000_rls_client_users.sql) — sem o scoping por tenant do
-- client_id alvo.

DROP POLICY IF EXISTS "client_users_insert_platform_admin_or_own_tenant_admin" ON public.client_users;
DROP POLICY IF EXISTS "client_users_update_platform_admin_or_own_tenant_admin" ON public.client_users;
DROP POLICY IF EXISTS "client_users_delete_platform_admin_or_own_tenant_admin" ON public.client_users;

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
