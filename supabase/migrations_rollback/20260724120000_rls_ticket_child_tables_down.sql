-- Rollback da migration 020d
-- (supabase/migrations/20260724120000_rls_ticket_child_tables.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 7 policies novas e recria as 12 legado literalmente como
-- estavam antes da 020d (texto exato capturado na auditoria read-only
-- de pg_policies, antes de qualquer alteração). Reverter isto também
-- reabre as 3 falhas reais corrigidas nesta migration (comentários sem
-- checar client_id, histórico visível sem checar client_id, INSERT em
-- ticket_history sem checar ticket nenhum) — ciente disso antes de rodar.

-- ===================== ticket_comments =====================

DROP POLICY IF EXISTS "ticket_comments_select_tenant_staff_or_own_client_non_internal" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_insert_tenant_staff_or_own_client_non_internal" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_delete_tenant_admin" ON public.ticket_comments;

CREATE POLICY "Admins can delete ticket comments"
  ON public.ticket_comments
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'tenant_admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_comments.ticket_id
          AND t.client_id = get_user_tenant_id(auth.uid())
      )
    )
  );

CREATE POLICY "Insert comments scoped to tenant"
  ON public.ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND (
          is_super_admin(auth.uid())
          OR is_otimizzo_user(auth.uid())
          OR t.client_id = get_user_tenant_id(auth.uid())
        )
    )
  );

CREATE POLICY "View comments"
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_comments.ticket_id
    )
    AND (
      (NOT is_internal)
      OR is_super_admin(auth.uid())
      OR is_otimizzo_user(auth.uid())
    )
  );

CREATE POLICY "Viewers can view tenant comments"
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND t.client_id = get_user_tenant_id(auth.uid())
    )
  );

-- ===================== ticket_history =====================

DROP POLICY IF EXISTS "ticket_history_select_tenant_staff_or_own_client" ON public.ticket_history;
DROP POLICY IF EXISTS "ticket_history_insert_tenant_staff_or_own_client" ON public.ticket_history;
DROP POLICY IF EXISTS "ticket_history_delete_tenant_admin" ON public.ticket_history;

CREATE POLICY "Admins can delete ticket history"
  ON public.ticket_history
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'tenant_admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_history.ticket_id
          AND t.client_id = get_user_tenant_id(auth.uid())
      )
    )
  );

CREATE POLICY "Authenticated can insert ticket history"
  ON public.ticket_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view ticket history for accessible tickets"
  ON public.ticket_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_history.ticket_id
    )
  );

CREATE POLICY "Viewers can view tenant ticket history"
  ON public.ticket_history
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_history.ticket_id
        AND t.client_id = get_user_tenant_id(auth.uid())
    )
  );

-- ===================== ticket_time_logs =====================

DROP POLICY IF EXISTS "ticket_time_logs_all_tenant_staff" ON public.ticket_time_logs;

CREATE POLICY "Admins can delete ticket time logs"
  ON public.ticket_time_logs
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      has_role(auth.uid(), 'tenant_admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_time_logs.ticket_id
          AND t.client_id = get_user_tenant_id(auth.uid())
      )
    )
  );

CREATE POLICY "Otimizzo manage logs"
  ON public.ticket_time_logs
  FOR ALL
  TO authenticated
  USING (is_otimizzo_user(auth.uid()))
  WITH CHECK (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage logs"
  ON public.ticket_time_logs
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view tenant time logs"
  ON public.ticket_time_logs
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_time_logs.ticket_id
        AND t.client_id = get_user_tenant_id(auth.uid())
    )
  );
