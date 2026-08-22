-- Rollback de 20260804120000_tenant_scope_catalog_tables.sql
-- Restaura as policies "catálogo global" originais (020h/022) e remove
-- tenant_id das 7 tabelas.

DROP POLICY IF EXISTS "application_products_select_tenant_scoped" ON public.application_products;
DROP POLICY IF EXISTS "application_products_manage_own_tenant_admin" ON public.application_products;
CREATE POLICY "application_products_select_authenticated"
  ON public.application_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "application_products_manage_platform_admin"
  ON public.application_products FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "ticket_categories_select_tenant_scoped" ON public.ticket_categories;
DROP POLICY IF EXISTS "ticket_categories_manage_own_tenant_admin" ON public.ticket_categories;
CREATE POLICY "ticket_categories_select_authenticated"
  ON public.ticket_categories FOR SELECT TO authenticated USING (is_active = true OR is_platform_admin());
CREATE POLICY "ticket_categories_manage_platform_admin"
  ON public.ticket_categories FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "ticket_subcategories_select_tenant_scoped" ON public.ticket_subcategories;
DROP POLICY IF EXISTS "ticket_subcategories_manage_own_tenant_admin" ON public.ticket_subcategories;
CREATE POLICY "ticket_subcategories_select_authenticated"
  ON public.ticket_subcategories FOR SELECT TO authenticated USING (is_active = true OR is_platform_admin());
CREATE POLICY "ticket_subcategories_manage_platform_admin"
  ON public.ticket_subcategories FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "segments_select_tenant_scoped" ON public.segments;
DROP POLICY IF EXISTS "segments_manage_own_tenant_admin" ON public.segments;
CREATE POLICY "segments_select_authenticated"
  ON public.segments FOR SELECT TO authenticated USING (is_active = true OR is_platform_admin());
CREATE POLICY "segments_manage_platform_admin"
  ON public.segments FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "database_engines_select_tenant_scoped" ON public.database_engines;
DROP POLICY IF EXISTS "database_engines_manage_own_tenant_admin" ON public.database_engines;
CREATE POLICY "database_engines_select_authenticated"
  ON public.database_engines FOR SELECT TO authenticated USING (is_active = true OR is_platform_admin());
CREATE POLICY "database_engines_manage_platform_admin"
  ON public.database_engines FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "system_configs_select_tenant_scoped" ON public.system_configs;
DROP POLICY IF EXISTS "system_configs_manage_own_tenant_admin" ON public.system_configs;
CREATE POLICY "system_configs_select_authenticated"
  ON public.system_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "system_configs_manage_platform_admin"
  ON public.system_configs FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "sla_holidays_select_tenant_scoped" ON public.sla_holidays;
DROP POLICY IF EXISTS "sla_holidays_manage_own_tenant_admin" ON public.sla_holidays;
CREATE POLICY "sla_holidays_select_authenticated"
  ON public.sla_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "sla_holidays_manage_platform_admin"
  ON public.sla_holidays FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

ALTER TABLE public.system_configs DROP CONSTRAINT system_configs_tenant_key_key;
ALTER TABLE public.system_configs ADD CONSTRAINT system_configs_key_key UNIQUE (key);

ALTER TABLE public.application_products DROP COLUMN tenant_id;
ALTER TABLE public.ticket_categories DROP COLUMN tenant_id;
ALTER TABLE public.ticket_subcategories DROP COLUMN tenant_id;
ALTER TABLE public.segments DROP COLUMN tenant_id;
ALTER TABLE public.database_engines DROP COLUMN tenant_id;
ALTER TABLE public.system_configs DROP COLUMN tenant_id;
ALTER TABLE public.sla_holidays DROP COLUMN tenant_id;
