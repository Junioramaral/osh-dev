-- Migration 025 do plano de refatoração multi-tenant.
-- Corrige um erro real encontrado testando com um segundo tenant real
-- (copawoke): application_products, ticket_categories, ticket_subcategories,
-- segments, database_engines, system_configs e sla_holidays foram
-- classificadas como "catálogo global da plataforma" nas migrations 020h/022
-- por não terem coluna tenant_id/client_id. Essa checagem olhou só a
-- ESTRUTURA da tabela, não o DADO — os registros de application_products
-- (ContaDia, LexisFlow, Sec4File) são produtos comerciais específicos da
-- Otimizzo, não um catálogo genérico da plataforma. As outras 6 tabelas têm
-- o mesmo problema estrutural: qualquer tenant enxergava (e, via bug
-- separado, nenhum tenant_admin conseguia editar — só is_platform_admin()
-- tinha policy de escrita, mas a tela SystemSettings.tsx deixa qualquer
-- tenant_admin entrar) os dados de configuração operacional da Otimizzo.
--
-- Rollback: supabase/migrations_rollback/20260804120000_tenant_scope_catalog_tables_down.sql

-- ===================== 1. Adicionar tenant_id + backfill =====================

DO $$
DECLARE
  v_otimizzo_tenant_id uuid;
BEGIN
  SELECT id INTO v_otimizzo_tenant_id FROM public.tenants WHERE is_platform_owner = true;

  ALTER TABLE public.application_products ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.application_products SET tenant_id = v_otimizzo_tenant_id;
  ALTER TABLE public.application_products ALTER COLUMN tenant_id SET NOT NULL;

  ALTER TABLE public.ticket_categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.ticket_categories SET tenant_id = v_otimizzo_tenant_id;
  ALTER TABLE public.ticket_categories ALTER COLUMN tenant_id SET NOT NULL;

  ALTER TABLE public.ticket_subcategories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.ticket_subcategories SET tenant_id = v_otimizzo_tenant_id;
  ALTER TABLE public.ticket_subcategories ALTER COLUMN tenant_id SET NOT NULL;

  ALTER TABLE public.segments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.segments SET tenant_id = v_otimizzo_tenant_id;
  ALTER TABLE public.segments ALTER COLUMN tenant_id SET NOT NULL;

  ALTER TABLE public.database_engines ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.database_engines SET tenant_id = v_otimizzo_tenant_id;
  ALTER TABLE public.database_engines ALTER COLUMN tenant_id SET NOT NULL;

  ALTER TABLE public.system_configs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.system_configs SET tenant_id = v_otimizzo_tenant_id;
  ALTER TABLE public.system_configs ALTER COLUMN tenant_id SET NOT NULL;

  ALTER TABLE public.sla_holidays ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
  UPDATE public.sla_holidays SET tenant_id = v_otimizzo_tenant_id;
  ALTER TABLE public.sla_holidays ALTER COLUMN tenant_id SET NOT NULL;
END $$;

CREATE INDEX idx_application_products_tenant_id ON public.application_products(tenant_id);
CREATE INDEX idx_ticket_categories_tenant_id ON public.ticket_categories(tenant_id);
CREATE INDEX idx_ticket_subcategories_tenant_id ON public.ticket_subcategories(tenant_id);
CREATE INDEX idx_segments_tenant_id ON public.segments(tenant_id);
CREATE INDEX idx_database_engines_tenant_id ON public.database_engines(tenant_id);
CREATE INDEX idx_system_configs_tenant_id ON public.system_configs(tenant_id);
CREATE INDEX idx_sla_holidays_tenant_id ON public.sla_holidays(tenant_id);

-- system_configs.key era UNIQUE global (uma linha por chave em todo o
-- sistema) — precisa virar UNIQUE por tenant, senão o segundo tenant nem
-- consegue ter sua própria linha "business_hours_start".
ALTER TABLE public.system_configs DROP CONSTRAINT system_configs_key_key;
ALTER TABLE public.system_configs ADD CONSTRAINT system_configs_tenant_key_key UNIQUE (tenant_id, key);

-- ===================== 2. RLS: SELECT tenant-scoped =====================
-- Staff do tenant vê tudo (ativo ou não, para poder reativar um registro
-- desativado) OU client-contact do mesmo tenant vê só os ativos. Isso já
-- corrige uma limitação que existia mesmo antes desta migration: só
-- is_platform_admin() enxergava registros inativos, então nenhum
-- tenant_admin conseguia reativar uma categoria/engine desativada.

DROP POLICY IF EXISTS "application_products_select_authenticated" ON public.application_products;
CREATE POLICY "application_products_select_tenant_scoped"
  ON public.application_products FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR (is_active = true AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = get_current_client_id()))
  );

DROP POLICY IF EXISTS "ticket_categories_select_authenticated" ON public.ticket_categories;
CREATE POLICY "ticket_categories_select_tenant_scoped"
  ON public.ticket_categories FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR (is_active = true AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = get_current_client_id()))
  );

DROP POLICY IF EXISTS "ticket_subcategories_select_authenticated" ON public.ticket_subcategories;
CREATE POLICY "ticket_subcategories_select_tenant_scoped"
  ON public.ticket_subcategories FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR (is_active = true AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = get_current_client_id()))
  );

DROP POLICY IF EXISTS "segments_select_authenticated" ON public.segments;
CREATE POLICY "segments_select_tenant_scoped"
  ON public.segments FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR (is_active = true AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = get_current_client_id()))
  );

DROP POLICY IF EXISTS "database_engines_select_authenticated" ON public.database_engines;
CREATE POLICY "database_engines_select_tenant_scoped"
  ON public.database_engines FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR (is_active = true AND tenant_id = (SELECT tenant_id FROM public.clients WHERE id = get_current_client_id()))
  );

DROP POLICY IF EXISTS "system_configs_select_authenticated" ON public.system_configs;
CREATE POLICY "system_configs_select_tenant_scoped"
  ON public.system_configs FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR tenant_id = (SELECT tenant_id FROM public.clients WHERE id = get_current_client_id())
  );

DROP POLICY IF EXISTS "sla_holidays_select_authenticated" ON public.sla_holidays;
CREATE POLICY "sla_holidays_select_tenant_scoped"
  ON public.sla_holidays FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    OR tenant_id = (SELECT tenant_id FROM public.clients WHERE id = get_current_client_id())
  );

-- ===================== 3. RLS: gerenciamento por tenant_admin do próprio tenant =====================
-- Remove o bypass is_platform_admin() inteiramente (Regra crítica #1 do
-- CLAUDE.md: platform admin não tem acesso a dado operacional — estas 7
-- tabelas são dado operacional, não estrutura de plataforma). Corrige
-- também o bug de tenant_admin ver a tela em SystemSettings.tsx mas ter o
-- salvamento recusado pela RLS.

DROP POLICY IF EXISTS "application_products_manage_platform_admin" ON public.application_products;
CREATE POLICY "application_products_manage_own_tenant_admin"
  ON public.application_products FOR ALL TO authenticated
  USING (is_tenant_admin() AND tenant_id = get_current_tenant_id())
  WITH CHECK (is_tenant_admin() AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "ticket_categories_manage_platform_admin" ON public.ticket_categories;
CREATE POLICY "ticket_categories_manage_own_tenant_admin"
  ON public.ticket_categories FOR ALL TO authenticated
  USING (is_tenant_admin() AND tenant_id = get_current_tenant_id())
  WITH CHECK (is_tenant_admin() AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "ticket_subcategories_manage_platform_admin" ON public.ticket_subcategories;
CREATE POLICY "ticket_subcategories_manage_own_tenant_admin"
  ON public.ticket_subcategories FOR ALL TO authenticated
  USING (is_tenant_admin() AND tenant_id = get_current_tenant_id())
  WITH CHECK (is_tenant_admin() AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "segments_manage_platform_admin" ON public.segments;
CREATE POLICY "segments_manage_own_tenant_admin"
  ON public.segments FOR ALL TO authenticated
  USING (is_tenant_admin() AND tenant_id = get_current_tenant_id())
  WITH CHECK (is_tenant_admin() AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "database_engines_manage_platform_admin" ON public.database_engines;
CREATE POLICY "database_engines_manage_own_tenant_admin"
  ON public.database_engines FOR ALL TO authenticated
  USING (is_tenant_admin() AND tenant_id = get_current_tenant_id())
  WITH CHECK (is_tenant_admin() AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "system_configs_manage_platform_admin" ON public.system_configs;
CREATE POLICY "system_configs_manage_own_tenant_admin"
  ON public.system_configs FOR ALL TO authenticated
  USING (is_tenant_admin() AND tenant_id = get_current_tenant_id())
  WITH CHECK (is_tenant_admin() AND tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "sla_holidays_manage_platform_admin" ON public.sla_holidays;
CREATE POLICY "sla_holidays_manage_own_tenant_admin"
  ON public.sla_holidays FOR ALL TO authenticated
  USING (is_tenant_admin() AND tenant_id = get_current_tenant_id())
  WITH CHECK (is_tenant_admin() AND tenant_id = get_current_tenant_id());
