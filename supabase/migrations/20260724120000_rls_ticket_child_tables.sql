-- Migration 020d do plano de refatoração multi-tenant.
-- Substitui as policies legado de ticket_comments, ticket_history e
-- ticket_time_logs — nenhuma das 3 tem client_id direto, todas
-- verificam via EXISTS (SELECT 1 FROM tickets ...).
--
-- SEM bypass de is_platform_admin() em nenhuma das 7 policies novas:
-- as 3 tabelas são OPERACIONAIS, fora da lista fechada de exceções do
-- CLAUDE.md (só tenants, platform_admins e tenant_users têm esse
-- bypass — Regra crítica #1).
--
-- O papel "viewer" do modelo legado (is_viewer()) NÃO foi recriado:
-- zero usuários com esse papel hoje, mesma justificativa das migrations
-- 020c/020b (auditoria da 019 confirma soma exata de 13 user_id entre
-- super_admin/tenant-role/user, sem sobra pra um papel "viewer").
--
-- CORREÇÃO DE FALHA REAL (3ª encontrada nesta auditoria, depois de
-- "View comments" e "Authenticated can view ticket history for
-- accessible tickets" já flagadas antes): a policy legado
-- "Authenticated can insert ticket history" tinha with_check = (auth.uid()
-- IS NOT NULL) — qualquer authenticated inseria linha de histórico pra
-- QUALQUER ticket, sem checar client_id/tenant nenhum. A nova
-- "ticket_history_insert_tenant_staff_or_own_client" corrige isso
-- exigindo EXISTS ticket do tenant/client do usuário. ATENÇÃO: se
-- ticket_history for gravada por trigger/função de sistema (audit log
-- automático) em vez de INSERT direto do usuário, essa função precisa
-- ser SECURITY DEFINER pra não ser bloqueada por esta nova restrição —
-- não verificado nesta migration, checar antes de aplicar se há tal
-- trigger.
--
-- Rollback: supabase/migrations_rollback/20260724120000_rls_ticket_child_tables_down.sql

-- ===================== ticket_comments =====================

DROP POLICY IF EXISTS "Admins can delete ticket comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Insert comments scoped to tenant" ON public.ticket_comments;
DROP POLICY IF EXISTS "View comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Viewers can view tenant comments" ON public.ticket_comments;

CREATE POLICY "ticket_comments_select_tenant_staff_or_own_client_non_internal"
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
    OR (
      NOT is_internal
      AND EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = ticket_comments.ticket_id
          AND t.client_id = get_current_client_id()
      )
    )
  );

CREATE POLICY "ticket_comments_insert_tenant_staff_or_own_client_non_internal"
  ON public.ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
    OR (
      NOT is_internal
      AND EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = ticket_comments.ticket_id
          AND t.client_id = get_current_client_id()
      )
    )
  );

CREATE POLICY "ticket_comments_delete_tenant_admin"
  ON public.ticket_comments
  FOR DELETE
  TO authenticated
  USING (
    is_tenant_admin()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );

-- Sem policy de UPDATE: preserva o comportamento legado (comentários
-- nunca foram editáveis via RLS, só criados/deletados)

-- ===================== ticket_history =====================

DROP POLICY IF EXISTS "Admins can delete ticket history" ON public.ticket_history;
DROP POLICY IF EXISTS "Authenticated can insert ticket history" ON public.ticket_history;
DROP POLICY IF EXISTS "Authenticated can view ticket history for accessible tickets" ON public.ticket_history;
DROP POLICY IF EXISTS "Viewers can view tenant ticket history" ON public.ticket_history;

CREATE POLICY "ticket_history_select_tenant_staff_or_own_client"
  ON public.ticket_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_history.ticket_id
        AND (
          t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
          OR t.client_id = get_current_client_id()
        )
    )
  );

CREATE POLICY "ticket_history_insert_tenant_staff_or_own_client"
  ON public.ticket_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_history.ticket_id
        AND (
          t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
          OR t.client_id = get_current_client_id()
        )
    )
  );

CREATE POLICY "ticket_history_delete_tenant_admin"
  ON public.ticket_history
  FOR DELETE
  TO authenticated
  USING (
    is_tenant_admin()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_history.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );

-- ===================== ticket_time_logs =====================
-- Sem visão de cliente nenhuma, de propósito — segue o padrão legado
-- (time logs sempre foram só internos, nenhuma policy client-facing
-- existia antes)

DROP POLICY IF EXISTS "Admins can delete ticket time logs" ON public.ticket_time_logs;
DROP POLICY IF EXISTS "Otimizzo manage logs" ON public.ticket_time_logs;
DROP POLICY IF EXISTS "Super admins manage logs" ON public.ticket_time_logs;
DROP POLICY IF EXISTS "Viewers can view tenant time logs" ON public.ticket_time_logs;

CREATE POLICY "ticket_time_logs_all_tenant_staff"
  ON public.ticket_time_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_time_logs.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_time_logs.ticket_id
        AND t.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    )
  );
