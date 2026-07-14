-- Rollback da migration 020c
-- (supabase/migrations/20260723120000_rls_tickets.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 4 policies novas e recria as 7 legado literalmente como
-- estavam antes da 020c (texto exato capturado na auditoria read-only
-- de pg_policies, antes de qualquer alteração).

DROP POLICY IF EXISTS "tickets_select_tenant_staff_or_own_client" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_tenant_staff_or_own_client" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_tenant_staff_or_own_client" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete_tenant_admin" ON public.tickets;

CREATE POLICY "Client users can create tickets"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (NOT is_super_admin(auth.uid()))
    AND (NOT is_otimizzo_user(auth.uid()))
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Client users can update their tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    (NOT is_super_admin(auth.uid()))
    AND (NOT is_otimizzo_user(auth.uid()))
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Client users can view their tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    (NOT is_super_admin(auth.uid()))
    AND (NOT is_otimizzo_user(auth.uid()))
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Otimizzo users can manage all tickets"
  ON public.tickets
  FOR ALL
  TO authenticated
  USING (is_otimizzo_user(auth.uid()))
  WITH CHECK (is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins can manage all tickets"
  ON public.tickets
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins can delete own tickets"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'tenant_admin'::app_role)
    AND (client_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Viewers can view tenant tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    is_viewer(auth.uid())
    AND (client_id = get_user_tenant_id(auth.uid()))
  );
