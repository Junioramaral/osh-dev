-- Rollback da migration 020g
-- (supabase/migrations/20260727120000_rls_user_queues.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 3 policies novas e recria as 3 legado literalmente como
-- estavam antes da 020g (texto exato capturado na auditoria read-only
-- de pg_policies, antes de qualquer alteração). Reverter isto reabre a
-- visão cross-tenant de todas as atribuições user↔queue via
-- "Otimizzo view user_queues" — ciente disso antes de rodar.

DROP POLICY IF EXISTS "user_queues_select_own_or_tenant_admin" ON public.user_queues;
DROP POLICY IF EXISTS "user_queues_insert_tenant_admin" ON public.user_queues;
DROP POLICY IF EXISTS "user_queues_delete_tenant_admin" ON public.user_queues;

CREATE POLICY "Otimizzo view user_queues"
  ON public.user_queues
  FOR SELECT
  TO authenticated
  USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage user_queues"
  ON public.user_queues
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View own queues"
  ON public.user_queues
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
