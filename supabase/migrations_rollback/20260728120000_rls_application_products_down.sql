-- Rollback da migration 020h
-- (supabase/migrations/20260728120000_rls_application_products.sql)
--
-- NÃO mover este arquivo para supabase/migrations/: o Supabase CLI roda
-- todo .sql dessa pasta em ordem sequencial no próximo `db push`/`db reset`,
-- então um arquivo "down" ali seria aplicado automaticamente logo após o
-- "up". Rodar manualmente (psql ou SQL editor do Supabase) só se precisar
-- reverter.
--
-- Remove as 2 policies novas e recria as 2 legado literalmente como
-- estavam antes da 020h (texto exato capturado na auditoria read-only
-- de pg_policies, incluindo roles={public} na de SELECT, como estava).

DROP POLICY IF EXISTS "application_products_select_authenticated" ON public.application_products;
DROP POLICY IF EXISTS "application_products_manage_platform_admin" ON public.application_products;

CREATE POLICY "Everyone can view application products"
  ON public.application_products
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Super admins manage products"
  ON public.application_products
  FOR ALL
  TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
