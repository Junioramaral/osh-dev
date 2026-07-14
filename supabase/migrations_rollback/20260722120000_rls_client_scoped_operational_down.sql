-- Rollback da migration 020b
-- (supabase/migrations/20260722120000_rls_client_scoped_operational.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 12 policies novas (3 por tabela) e recria as 16 legado
-- literalmente como estavam antes da 020b (texto exato capturado na
-- auditoria read-only de pg_policies, antes de qualquer alteração).

-- ===================== client_contacts =====================

DROP POLICY IF EXISTS "client_contacts_select_tenant_staff_or_own_client" ON public.client_contacts;
DROP POLICY IF EXISTS "client_contacts_insert_tenant_admin" ON public.client_contacts;
DROP POLICY IF EXISTS "client_contacts_update_tenant_admin" ON public.client_contacts;

CREATE POLICY "Client view own contacts"
  ON public.client_contacts
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL)
    AND (NOT is_super_admin(auth.uid()))
    AND (NOT is_otimizzo_user(auth.uid()))
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Otimizzo view contacts"
  ON public.client_contacts
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL)
    AND is_otimizzo_user(auth.uid())
  );

CREATE POLICY "Super admins manage contacts"
  ON public.client_contacts
  FOR ALL
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL)
    AND is_super_admin(auth.uid())
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL)
    AND is_super_admin(auth.uid())
  );

CREATE POLICY "Viewers can view tenant contacts"
  ON public.client_contacts
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

-- ===================== machines =====================

DROP POLICY IF EXISTS "machines_select_tenant_staff_or_own_client" ON public.machines;
DROP POLICY IF EXISTS "machines_insert_tenant_admin" ON public.machines;
DROP POLICY IF EXISTS "machines_update_tenant_admin" ON public.machines;

CREATE POLICY "Client view own machines"
  ON public.machines
  FOR SELECT
  TO authenticated
  USING (
    (NOT is_super_admin(auth.uid()))
    AND (NOT is_otimizzo_user(auth.uid()))
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Otimizzo view machines"
  ON public.machines
  FOR SELECT
  TO authenticated
  USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage machines"
  ON public.machines
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view tenant machines"
  ON public.machines
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

-- ===================== database_instances =====================

DROP POLICY IF EXISTS "database_instances_select_tenant_staff_or_own_client" ON public.database_instances;
DROP POLICY IF EXISTS "database_instances_insert_tenant_admin" ON public.database_instances;
DROP POLICY IF EXISTS "database_instances_update_tenant_admin" ON public.database_instances;

CREATE POLICY "Client view own db"
  ON public.database_instances
  FOR SELECT
  TO authenticated
  USING (
    (NOT is_super_admin(auth.uid()))
    AND (NOT is_otimizzo_user(auth.uid()))
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Otimizzo view db"
  ON public.database_instances
  FOR SELECT
  TO authenticated
  USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage db"
  ON public.database_instances
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view tenant databases"
  ON public.database_instances
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

-- ===================== application_instances =====================

DROP POLICY IF EXISTS "application_instances_select_tenant_staff_or_own_client" ON public.application_instances;
DROP POLICY IF EXISTS "application_instances_insert_tenant_admin" ON public.application_instances;
DROP POLICY IF EXISTS "application_instances_update_tenant_admin" ON public.application_instances;

CREATE POLICY "Client view own app"
  ON public.application_instances
  FOR SELECT
  TO authenticated
  USING (
    (NOT is_super_admin(auth.uid()))
    AND (NOT is_otimizzo_user(auth.uid()))
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Otimizzo view app"
  ON public.application_instances
  FOR SELECT
  TO authenticated
  USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage app"
  ON public.application_instances
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view tenant applications"
  ON public.application_instances
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND (client_id = get_user_tenant_id(auth.uid()))
  );
