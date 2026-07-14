-- Migration 020b do plano de refatoração multi-tenant.
-- Substitui as policies legado de client_contacts, machines,
-- database_instances e application_instances — mesmo padrão nas 4
-- tabelas, cada uma com client_id direto apontando pra clients.
--
-- Um arquivo único cobrindo as 4 tabelas de propósito: são pequenas e
-- seguem exatamente o mesmo padrão, dividir em 4 migrations aqui só
-- adicionaria overhead sem reduzir risco.
--
-- SEM bypass de is_platform_admin() em nenhuma das policies novas:
-- nenhuma dessas 4 tabelas está na lista fechada de exceções do
-- CLAUDE.md (só tenants, platform_admins e tenant_users têm esse
-- bypass — Regra crítica #1).
--
-- SEM policy de DELETE para authenticated/anon em nenhuma das 4 —
-- mesma decisão da 020a: exclusão só via service_role por enquanto.
--
-- Rollback: supabase/migrations_rollback/20260722120000_rls_client_scoped_operational_down.sql

-- ===================== client_contacts =====================

DROP POLICY IF EXISTS "Client view own contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Otimizzo view contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Super admins manage contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Viewers can view tenant contacts" ON public.client_contacts;

CREATE POLICY "client_contacts_select_tenant_staff_or_own_client"
  ON public.client_contacts
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    OR client_id = get_current_client_id()
  );

CREATE POLICY "client_contacts_insert_tenant_admin"
  ON public.client_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  );

CREATE POLICY "client_contacts_update_tenant_admin"
  ON public.client_contacts
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  );

-- ===================== machines =====================

DROP POLICY IF EXISTS "Client view own machines" ON public.machines;
DROP POLICY IF EXISTS "Otimizzo view machines" ON public.machines;
DROP POLICY IF EXISTS "Super admins manage machines" ON public.machines;
DROP POLICY IF EXISTS "Viewers can view tenant machines" ON public.machines;

CREATE POLICY "machines_select_tenant_staff_or_own_client"
  ON public.machines
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    OR client_id = get_current_client_id()
  );

CREATE POLICY "machines_insert_tenant_admin"
  ON public.machines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  );

CREATE POLICY "machines_update_tenant_admin"
  ON public.machines
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  );

-- ===================== database_instances =====================

DROP POLICY IF EXISTS "Client view own db" ON public.database_instances;
DROP POLICY IF EXISTS "Otimizzo view db" ON public.database_instances;
DROP POLICY IF EXISTS "Super admins manage db" ON public.database_instances;
DROP POLICY IF EXISTS "Viewers can view tenant databases" ON public.database_instances;

CREATE POLICY "database_instances_select_tenant_staff_or_own_client"
  ON public.database_instances
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    OR client_id = get_current_client_id()
  );

CREATE POLICY "database_instances_insert_tenant_admin"
  ON public.database_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  );

CREATE POLICY "database_instances_update_tenant_admin"
  ON public.database_instances
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  );

-- ===================== application_instances =====================

DROP POLICY IF EXISTS "Client view own app" ON public.application_instances;
DROP POLICY IF EXISTS "Otimizzo view app" ON public.application_instances;
DROP POLICY IF EXISTS "Super admins manage app" ON public.application_instances;
DROP POLICY IF EXISTS "Viewers can view tenant applications" ON public.application_instances;

CREATE POLICY "application_instances_select_tenant_staff_or_own_client"
  ON public.application_instances
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    OR client_id = get_current_client_id()
  );

CREATE POLICY "application_instances_insert_tenant_admin"
  ON public.application_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  );

CREATE POLICY "application_instances_update_tenant_admin"
  ON public.application_instances
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()
    )
    AND is_tenant_admin()
  );
