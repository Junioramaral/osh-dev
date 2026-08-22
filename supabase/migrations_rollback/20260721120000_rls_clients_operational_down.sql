-- Rollback da migration 020a
-- (supabase/migrations/20260721120000_rls_clients_operational.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 3 policies novas e recria as 4 legado literalmente como
-- estavam antes da 020a (texto exato capturado na auditoria read-only
-- de pg_policies, antes de qualquer alteração).

DROP POLICY IF EXISTS "clients_select_tenant_staff_or_own" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_tenant_admin" ON public.clients;
DROP POLICY IF EXISTS "clients_update_tenant_admin" ON public.clients;

CREATE POLICY "Client view own"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    (NOT is_super_admin(auth.uid()))
    AND (NOT is_otimizzo_user(auth.uid()))
    AND (id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Otimizzo view clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view own client"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND (id = get_user_tenant_id(auth.uid()))
  );
