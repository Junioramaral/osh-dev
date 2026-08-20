-- Rollback da migration 022
-- (supabase/migrations/20260731120000_rls_reference_sla_rfc_tables.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 19 policies novas e recria as 20 legado literalmente como
-- estavam antes desta migration (texto exato capturado via pg_policies
-- antes da mudança, incluindo a coluna roles de cada uma — parte usava
-- TO public, parte TO authenticated, preservado como estava).

-- ticket_categories
DROP POLICY IF EXISTS "ticket_categories_select_authenticated" ON public.ticket_categories;
DROP POLICY IF EXISTS "ticket_categories_manage_platform_admin" ON public.ticket_categories;

CREATE POLICY "Super admins manage categories"
  ON public.ticket_categories FOR ALL TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View active categories"
  ON public.ticket_categories FOR SELECT TO public
  USING (is_active = true OR is_super_admin(auth.uid()));

-- ticket_subcategories
DROP POLICY IF EXISTS "ticket_subcategories_select_authenticated" ON public.ticket_subcategories;
DROP POLICY IF EXISTS "ticket_subcategories_manage_platform_admin" ON public.ticket_subcategories;

CREATE POLICY "Super admins manage subcategories"
  ON public.ticket_subcategories FOR ALL TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View active subcategories"
  ON public.ticket_subcategories FOR SELECT TO public
  USING (is_active = true OR is_super_admin(auth.uid()));

-- segments
DROP POLICY IF EXISTS "segments_select_authenticated" ON public.segments;
DROP POLICY IF EXISTS "segments_manage_platform_admin" ON public.segments;

CREATE POLICY "Everyone can view active segments"
  ON public.segments FOR SELECT TO public
  USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage segments"
  ON public.segments FOR ALL TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view all segments"
  ON public.segments FOR SELECT TO public
  USING (is_viewer(auth.uid()));

-- database_engines
DROP POLICY IF EXISTS "database_engines_select_authenticated" ON public.database_engines;
DROP POLICY IF EXISTS "database_engines_manage_platform_admin" ON public.database_engines;

CREATE POLICY "Super admins manage engines"
  ON public.database_engines FOR ALL TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View active engines"
  ON public.database_engines FOR SELECT TO public
  USING (is_active = true OR is_super_admin(auth.uid()));

-- system_configs
DROP POLICY IF EXISTS "system_configs_select_authenticated" ON public.system_configs;
DROP POLICY IF EXISTS "system_configs_manage_platform_admin" ON public.system_configs;

CREATE POLICY "Authenticated users can view configs"
  ON public.system_configs FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins manage configs"
  ON public.system_configs FOR ALL TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view configs"
  ON public.system_configs FOR SELECT TO public
  USING (is_viewer(auth.uid()));

-- sla_holidays
DROP POLICY IF EXISTS "sla_holidays_select_authenticated" ON public.sla_holidays;
DROP POLICY IF EXISTS "sla_holidays_manage_platform_admin" ON public.sla_holidays;

CREATE POLICY "Authenticated users can view holidays"
  ON public.sla_holidays FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Super admins manage holidays"
  ON public.sla_holidays FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- rfc_steps
DROP POLICY IF EXISTS "rfc_steps_select_tenant_staff_or_own_client" ON public.rfc_steps;
DROP POLICY IF EXISTS "rfc_steps_insert_tenant_staff" ON public.rfc_steps;
DROP POLICY IF EXISTS "rfc_steps_update_tenant_staff" ON public.rfc_steps;
DROP POLICY IF EXISTS "rfc_steps_delete_tenant_admin" ON public.rfc_steps;

CREATE POLICY "Client view own rfc_steps"
  ON public.rfc_steps FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM tickets t WHERE t.id = rfc_steps.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())));

CREATE POLICY "Otimizzo manage rfc_steps"
  ON public.rfc_steps FOR ALL TO public
  USING (is_otimizzo_user(auth.uid()))
  WITH CHECK (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage rfc_steps"
  ON public.rfc_steps FOR ALL TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins can delete own rfc steps"
  ON public.rfc_steps FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM tickets t WHERE t.id = rfc_steps.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())));

-- sla_notifications
DROP POLICY IF EXISTS "sla_notifications_all_tenant_staff" ON public.sla_notifications;

CREATE POLICY "Admins can delete sla notifications"
  ON public.sla_notifications FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM tickets t WHERE t.id = sla_notifications.ticket_id AND t.client_id = get_user_tenant_id(auth.uid()))));

CREATE POLICY "Otimizzo can acknowledge notifications"
  ON public.sla_notifications FOR UPDATE TO public
  USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo can insert sla notifications"
  ON public.sla_notifications FOR INSERT TO authenticated
  WITH CHECK (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo can view notifications"
  ON public.sla_notifications FOR SELECT TO authenticated
  USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));

-- report_send_logs
DROP POLICY IF EXISTS "report_send_logs_select_tenant_staff" ON public.report_send_logs;
DROP POLICY IF EXISTS "report_send_logs_insert_tenant_staff" ON public.report_send_logs;

CREATE POLICY "Authenticated can insert report logs"
  ON public.report_send_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Otimizzo can view report logs"
  ON public.report_send_logs FOR SELECT TO public
  USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view tenant report logs"
  ON public.report_send_logs FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));
