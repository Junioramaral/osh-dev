-- Rollback da migration 020f
-- (supabase/migrations/20260726120000_rls_teams_queues.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 6 policies novas e recria as 4 legado literalmente como
-- estavam antes da 020f (texto exato capturado na auditoria read-only
-- de pg_policies, incluindo roles={public} confirmado por consulta
-- direta antes desta migration). Reverter isto reabre o isolamento
-- perdido: "View active queues" volta a mostrar queues ativas de TODOS
-- os tenants pra qualquer authenticated — ciente disso antes de rodar.

-- ===================== teams =====================

DROP POLICY IF EXISTS "teams_select_tenant_staff" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_tenant_admin" ON public.teams;
DROP POLICY IF EXISTS "teams_update_tenant_admin" ON public.teams;

CREATE POLICY "Super admins manage teams"
  ON public.teams
  FOR ALL
  TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view all teams"
  ON public.teams
  FOR SELECT
  TO public
  USING (true);

-- ===================== queues =====================

DROP POLICY IF EXISTS "queues_select_tenant_staff" ON public.queues;
DROP POLICY IF EXISTS "queues_insert_tenant_admin" ON public.queues;
DROP POLICY IF EXISTS "queues_update_tenant_admin" ON public.queues;

CREATE POLICY "Super admins manage queues"
  ON public.queues
  FOR ALL
  TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View active queues"
  ON public.queues
  FOR SELECT
  TO public
  USING (
    (is_active = true)
    OR is_super_admin(auth.uid())
  );
