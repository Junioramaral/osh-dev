-- Migration 020g do plano de refatoração multi-tenant.
-- RLS de user_queues.
--
-- SEM bypass de is_platform_admin() em nenhuma das 3 policies novas:
-- user_queues é OPERACIONAL, fora da lista fechada de exceções do
-- CLAUDE.md (só tenants, platform_admins e tenant_users têm esse
-- bypass — Regra crítica #1).
--
-- MUDANÇA DE COMPORTAMENTO: a policy legado "Otimizzo view user_queues"
-- dava visão de TODAS as atribuições user↔queue, de qualquer tenant. A
-- nova versão restringe a visão de terceiros (além da própria linha) a
-- tenant_admin, e só dentro do próprio tenant (via join com
-- queues.tenant_id, adicionado na 020e).
--
-- Rollback: supabase/migrations_rollback/20260727120000_rls_user_queues_down.sql

DROP POLICY IF EXISTS "Otimizzo view user_queues" ON public.user_queues;
DROP POLICY IF EXISTS "Super admins manage user_queues" ON public.user_queues;
DROP POLICY IF EXISTS "View own queues" ON public.user_queues;

-- Vê a própria linha OU é tenant_admin do tenant dono da queue
-- (precisa gerenciar quem está em qual fila)
CREATE POLICY "user_queues_select_own_or_tenant_admin"
  ON public.user_queues
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      is_tenant_admin()
      AND EXISTS (
        SELECT 1 FROM public.queues q
        WHERE q.id = user_queues.queue_id
          AND q.tenant_id = get_current_tenant_id()
      )
    )
  );

-- Atribuir alguém a uma queue: só tenant_admin, e só para queues do
-- próprio tenant
CREATE POLICY "user_queues_insert_tenant_admin"
  ON public.user_queues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_tenant_admin()
    AND EXISTS (
      SELECT 1 FROM public.queues q
      WHERE q.id = user_queues.queue_id
        AND q.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "user_queues_delete_tenant_admin"
  ON public.user_queues
  FOR DELETE
  TO authenticated
  USING (
    is_tenant_admin()
    AND EXISTS (
      SELECT 1 FROM public.queues q
      WHERE q.id = user_queues.queue_id
        AND q.tenant_id = get_current_tenant_id()
    )
  );
