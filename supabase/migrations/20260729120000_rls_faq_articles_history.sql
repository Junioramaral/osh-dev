-- Migration 020i do plano de refatoração multi-tenant — última do bloco 020.
-- RLS de faq_articles e faq_history juntas: faq_history depende
-- inteiramente da regra de visibilidade do artigo (não tem client_id
-- próprio), então repete a mesma condição via EXISTS.
--
-- (1) SEM bypass de is_platform_admin() em nenhuma das 6 policies novas
-- — ambas OPERACIONAIS. A regra "global + publicado visível a qualquer
-- autenticado" é uma regra por VALOR DO DADO (visibility), não bypass
-- de cargo — não conflita com a Regra crítica #1 do CLAUDE.md.
--
-- (2) CORREÇÃO: a policy legado "View faq based on visibility" nunca
-- dava acesso real a artigos 'private' pra ninguém além de
-- is_super_admin()/is_otimizzo_user() (bypass de cargo) — nem a equipe
-- comum do próprio tenant via os próprios rascunhos/artigos privados. A
-- nova "faq_articles_select_global_or_tenant_staff_or_own_client"
-- corrige isso: equipe do tenant vê TODOS os artigos dos próprios
-- clients, incluindo private/rascunho.
--
-- (3) CORREÇÃO DE FALHA REAL (mesma categoria da falha corrigida na
-- 020d para ticket_history): a policy legado "Authenticated can insert
-- faq history" tinha with_check = (auth.uid() IS NOT NULL), sem checar
-- o artigo nenhum. A nova "faq_history_insert_if_can_see_article" exige
-- que o usuário consiga ver o artigo antes de inserir histórico nele.
--
-- (4) O papel "viewer" do modelo legado (is_viewer()) NÃO foi recriado:
-- zero usuários com esse papel hoje, mesma justificativa das migrations
-- anteriores do bloco 020.
--
-- Rollback: supabase/migrations_rollback/20260729120000_rls_faq_articles_history_down.sql

-- ===================== faq_articles =====================

DROP POLICY IF EXISTS "Otimizzo manage faq" ON public.faq_articles;
DROP POLICY IF EXISTS "Super admins manage faq" ON public.faq_articles;
DROP POLICY IF EXISTS "View faq based on visibility" ON public.faq_articles;
DROP POLICY IF EXISTS "Viewers can view tenant faq articles" ON public.faq_articles;

CREATE POLICY "faq_articles_select_global_or_tenant_staff_or_own_client"
  ON public.faq_articles
  FOR SELECT
  TO authenticated
  USING (
    (visibility = 'global' AND status = 'publicado')
    OR client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    OR (
      visibility = 'client_specific'
      AND status = 'publicado'
      AND client_id = get_current_client_id()
    )
  );

CREATE POLICY "faq_articles_insert_tenant_staff"
  ON public.faq_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
  );

CREATE POLICY "faq_articles_update_tenant_staff"
  ON public.faq_articles
  FOR UPDATE
  TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()))
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id()));

CREATE POLICY "faq_articles_delete_tenant_admin"
  ON public.faq_articles
  FOR DELETE
  TO authenticated
  USING (
    is_tenant_admin()
    AND client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
  );

-- ===================== faq_history =====================

DROP POLICY IF EXISTS "Authenticated can insert faq history" ON public.faq_history;
DROP POLICY IF EXISTS "Otimizzo can view faq history" ON public.faq_history;
DROP POLICY IF EXISTS "Viewers can view tenant faq history" ON public.faq_history;

CREATE POLICY "faq_history_select_if_can_see_article"
  ON public.faq_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.faq_articles fa
      WHERE fa.id = faq_history.article_id
        AND (
          (fa.visibility = 'global' AND fa.status = 'publicado')
          OR fa.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
          OR (
            fa.visibility = 'client_specific'
            AND fa.status = 'publicado'
            AND fa.client_id = get_current_client_id()
          )
        )
    )
  );

CREATE POLICY "faq_history_insert_if_can_see_article"
  ON public.faq_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faq_articles fa
      WHERE fa.id = faq_history.article_id
        AND (
          (fa.visibility = 'global' AND fa.status = 'publicado')
          OR fa.client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
          OR (
            fa.visibility = 'client_specific'
            AND fa.status = 'publicado'
            AND fa.client_id = get_current_client_id()
          )
        )
    )
  );
