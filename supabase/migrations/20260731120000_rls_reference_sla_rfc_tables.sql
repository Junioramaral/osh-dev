-- Migration 022 do plano de refatoração multi-tenant.
-- Substitui as policies legado das últimas 9 tabelas que ainda dependiam
-- só do sistema antigo (is_super_admin()/is_otimizzo_user()/
-- get_user_tenant_id()/is_viewer()/has_role() — todas lendo de
-- public.user_roles). São as únicas tabelas fora do bloco 020 (021-030)
-- que ainda não tinham sido migradas.
--
-- ACHADO GRAVE desta auditoria: is_otimizzo_user() no banco compara
-- contra o UUID hardcoded '00000000-0000-0000-0000-000000000001' — o
-- mesmo anti-padrão já flagado em AuthContext.tsx (Regra crítica #2 do
-- CLAUDE.md), só que dentro de uma função SECURITY DEFINER usada em RLS
-- de produção. Essa função (e as outras do sistema antigo) NÃO são
-- removidas nesta migration — podem estar em uso por policies não
-- auditadas aqui. Candidatas a DROP numa migration futura de limpeza,
-- só depois de confirmar zero referências restantes.
--
-- Duas categorias de tabela, tratamento diferente:
--
-- (A) CATÁLOGO GLOBAL — ticket_categories, ticket_subcategories,
-- segments, database_engines, system_configs, sla_holidays. Nenhuma tem
-- tenant_id/client_id (confirmado via information_schema). Mesma
-- justificativa da 020h/application_products: ausência total de
-- conceito de tenant no domínio da tabela — não existe "tenant_admin
-- gerenciando isso" como alternativa. BYPASS de is_platform_admin() é
-- apropriado aqui pela mesma razão específica. sla_holidays era o caso
-- ambíguo (citada como "SLA" na lista fechada do CLAUDE.md) — decisão
-- confirmada com o usuário: mesma exceção da application_products se
-- aplica, por não ter coluna de tenant pra isolar.
--
-- (B) DADO REAL DE TENANT via join em tickets/clients — rfc_steps,
-- sla_notifications, report_send_logs. SEM bypass de is_platform_admin,
-- mesma regra operacional das migrations 020c/020d.
--
-- O papel "viewer" do modelo legado (is_viewer()) NÃO é recriado em
-- nenhuma das 9 — mesma justificativa das migrations 020c/020d/020g
-- (zero usuários com esse papel, confirmado na auditoria da 019).
--
-- CORREÇÃO DE FALHA REAL (mesma classe da encontrada na 020d): a policy
-- legado "Authenticated can insert report logs" tinha with_check =
-- (auth.uid() IS NOT NULL) — qualquer authenticated inseria log de
-- report pra QUALQUER client, sem checar tenant nenhum. A nova
-- "report_send_logs_insert_tenant_staff" corrige isso. ATENÇÃO: se essa
-- tabela for gravada por função de sistema (send-monthly-report) via
-- service_role, a restrição não afeta ela (service_role bypassa RLS) —
-- não verificado nesta migration, checar antes de aplicar se algum
-- fluxo insere como usuário autenticado comum.
--
-- Rollback: supabase/migrations_rollback/20260731120000_rls_reference_sla_rfc_tables_down.sql

-- ===================== (A) Catálogo global =====================

-- ticket_categories
DROP POLICY IF EXISTS "Super admins manage categories" ON public.ticket_categories;
DROP POLICY IF EXISTS "View active categories" ON public.ticket_categories;

CREATE POLICY "ticket_categories_select_authenticated"
  ON public.ticket_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true OR is_platform_admin());

CREATE POLICY "ticket_categories_manage_platform_admin"
  ON public.ticket_categories
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ticket_subcategories
DROP POLICY IF EXISTS "Super admins manage subcategories" ON public.ticket_subcategories;
DROP POLICY IF EXISTS "View active subcategories" ON public.ticket_subcategories;

CREATE POLICY "ticket_subcategories_select_authenticated"
  ON public.ticket_subcategories
  FOR SELECT
  TO authenticated
  USING (is_active = true OR is_platform_admin());

CREATE POLICY "ticket_subcategories_manage_platform_admin"
  ON public.ticket_subcategories
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- segments (drop também a policy de viewer, sem uso)
DROP POLICY IF EXISTS "Everyone can view active segments" ON public.segments;
DROP POLICY IF EXISTS "Super admins manage segments" ON public.segments;
DROP POLICY IF EXISTS "Viewers can view all segments" ON public.segments;

CREATE POLICY "segments_select_authenticated"
  ON public.segments
  FOR SELECT
  TO authenticated
  USING (is_active = true OR is_platform_admin());

CREATE POLICY "segments_manage_platform_admin"
  ON public.segments
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- database_engines
DROP POLICY IF EXISTS "Super admins manage engines" ON public.database_engines;
DROP POLICY IF EXISTS "View active engines" ON public.database_engines;

CREATE POLICY "database_engines_select_authenticated"
  ON public.database_engines
  FOR SELECT
  TO authenticated
  USING (is_active = true OR is_platform_admin());

CREATE POLICY "database_engines_manage_platform_admin"
  ON public.database_engines
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- system_configs (sem coluna is_active — select preserva "aberto pra
-- qualquer authenticated", igual ao legado)
DROP POLICY IF EXISTS "Authenticated users can view configs" ON public.system_configs;
DROP POLICY IF EXISTS "Super admins manage configs" ON public.system_configs;
DROP POLICY IF EXISTS "Viewers can view configs" ON public.system_configs;

CREATE POLICY "system_configs_select_authenticated"
  ON public.system_configs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "system_configs_manage_platform_admin"
  ON public.system_configs
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- sla_holidays (sem coluna is_active — select preserva "aberto pra
-- qualquer authenticated", igual ao legado)
DROP POLICY IF EXISTS "Authenticated users can view holidays" ON public.sla_holidays;
DROP POLICY IF EXISTS "Super admins manage holidays" ON public.sla_holidays;

CREATE POLICY "sla_holidays_select_authenticated"
  ON public.sla_holidays
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sla_holidays_manage_platform_admin"
  ON public.sla_holidays
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ===================== (B) Dado real de tenant =====================

-- rfc_steps: liga em tickets.client_id -> clients.tenant_id. Legado só
-- dava SELECT pro client (nunca insert/update/delete) — preservado.
DROP POLICY IF EXISTS "Client view own rfc_steps" ON public.rfc_steps;
DROP POLICY IF EXISTS "Otimizzo manage rfc_steps" ON public.rfc_steps;
DROP POLICY IF EXISTS "Super admins manage rfc_steps" ON public.rfc_steps;
DROP POLICY IF EXISTS "Tenant admins can delete own rfc steps" ON public.rfc_steps;

CREATE POLICY "rfc_steps_select_tenant_staff_or_own_client"
  ON public.rfc_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = rfc_steps.ticket_id
        AND (
          t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
          OR t.client_id = get_current_client_id()
        )
    )
  );

CREATE POLICY "rfc_steps_insert_tenant_staff"
  ON public.rfc_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = rfc_steps.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );

CREATE POLICY "rfc_steps_update_tenant_staff"
  ON public.rfc_steps
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = rfc_steps.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = rfc_steps.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );

CREATE POLICY "rfc_steps_delete_tenant_admin"
  ON public.rfc_steps
  FOR DELETE
  TO authenticated
  USING (
    is_tenant_admin()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = rfc_steps.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );

-- sla_notifications: nunca teve visão de client no legado (só staff) —
-- preservado. Um único FOR ALL de staff, igual ao padrão de
-- ticket_time_logs (020d).
DROP POLICY IF EXISTS "Admins can delete sla notifications" ON public.sla_notifications;
DROP POLICY IF EXISTS "Otimizzo can acknowledge notifications" ON public.sla_notifications;
DROP POLICY IF EXISTS "Otimizzo can insert sla notifications" ON public.sla_notifications;
DROP POLICY IF EXISTS "Otimizzo can view notifications" ON public.sla_notifications;

CREATE POLICY "sla_notifications_all_tenant_staff"
  ON public.sla_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = sla_notifications.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = sla_notifications.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );

-- report_send_logs: tem client_id direto (sem join em tickets). Legado
-- nunca deu visão de client — preservado, só staff.
DROP POLICY IF EXISTS "Authenticated can insert report logs" ON public.report_send_logs;
DROP POLICY IF EXISTS "Otimizzo can view report logs" ON public.report_send_logs;
DROP POLICY IF EXISTS "Viewers can view tenant report logs" ON public.report_send_logs;

CREATE POLICY "report_send_logs_select_tenant_staff"
  ON public.report_send_logs
  FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()));

CREATE POLICY "report_send_logs_insert_tenant_staff"
  ON public.report_send_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()));
