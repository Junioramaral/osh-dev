-- Rollback da migration 020i
-- (supabase/migrations/20260729120000_rls_faq_articles_history.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 6 policies novas e recria as 4+3 legado literalmente como
-- estavam antes da 020i (texto exato capturado na auditoria read-only
-- de pg_policies, antes de qualquer alteração). Reverter isto reabre a
-- falha real corrigida no item (3) da migration up: INSERT em
-- faq_history sem checar o artigo — ciente disso antes de rodar.

-- ===================== faq_articles =====================

DROP POLICY IF EXISTS "faq_articles_select_global_or_tenant_staff_or_own_client" ON public.faq_articles;
DROP POLICY IF EXISTS "faq_articles_insert_tenant_staff" ON public.faq_articles;
DROP POLICY IF EXISTS "faq_articles_update_tenant_staff" ON public.faq_articles;
DROP POLICY IF EXISTS "faq_articles_delete_tenant_admin" ON public.faq_articles;

CREATE POLICY "Otimizzo manage faq"
  ON public.faq_articles
  FOR ALL
  TO public
  USING (is_otimizzo_user(auth.uid()))
  WITH CHECK (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage faq"
  ON public.faq_articles
  FOR ALL
  TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View faq based on visibility"
  ON public.faq_articles
  FOR SELECT
  TO public
  USING (
    is_super_admin(auth.uid())
    OR is_otimizzo_user(auth.uid())
    OR ((visibility = 'global'::faq_visibility) AND (status = 'publicado'::text))
    OR (
      (visibility = 'client_specific'::faq_visibility)
      AND (status = 'publicado'::text)
      AND (client_id = get_user_tenant_id(auth.uid()))
    )
  );

CREATE POLICY "Viewers can view tenant faq articles"
  ON public.faq_articles
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND (
      (visibility = 'global'::faq_visibility)
      OR (
        (visibility = 'client_specific'::faq_visibility)
        AND (client_id = get_user_tenant_id(auth.uid()))
      )
    )
  );

-- ===================== faq_history =====================

DROP POLICY IF EXISTS "faq_history_select_if_can_see_article" ON public.faq_history;
DROP POLICY IF EXISTS "faq_history_insert_if_can_see_article" ON public.faq_history;

CREATE POLICY "Authenticated can insert faq history"
  ON public.faq_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Otimizzo can view faq history"
  ON public.faq_history
  FOR SELECT
  TO public
  USING (
    is_otimizzo_user(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Viewers can view tenant faq history"
  ON public.faq_history
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND EXISTS (
      SELECT 1 FROM faq_articles fa
      WHERE fa.id = faq_history.article_id
        AND (
          (fa.visibility = 'global'::faq_visibility)
          OR (
            (fa.visibility = 'client_specific'::faq_visibility)
            AND (fa.client_id = get_user_tenant_id(auth.uid()))
          )
        )
    )
  );
