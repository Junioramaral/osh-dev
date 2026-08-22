-- Migration 020c do plano de refatoração multi-tenant.
-- Substitui as 7 policies legado de public.tickets pelas novas.
--
-- SEM bypass de is_platform_admin() em nenhuma das 4 policies novas:
-- tickets é tabela OPERACIONAL, fora da lista fechada de exceções do
-- CLAUDE.md (só tenants, platform_admins e tenant_users têm esse
-- bypass — Regra crítica #1).
--
-- O papel "viewer" do modelo legado (is_viewer()) NÃO foi recriado:
-- zero usuários com esse papel hoje, confirmado na auditoria da 019
-- (distinct_users_super_admin=1, distinct_users_tenant_role=1,
-- distinct_users_user_role=11, soma bate com o total de 13 — nenhuma
-- sobra pra um papel "viewer"). Fica como item de backlog se for
-- preciso um perfil só-leitura no futuro.
--
-- Rollback: supabase/migrations_rollback/20260723120000_rls_tickets_down.sql

DROP POLICY IF EXISTS "Client users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Client users can update their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Client users can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Otimizzo users can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Super admins can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Tenant admins can delete own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Viewers can view tenant tickets" ON public.tickets;

-- SELECT/INSERT/UPDATE: qualquer membro da equipe do tenant dono do
-- client (qualquer role — analyst_db, analyst_app, tenant_admin, não só
-- admin, porque são eles que trabalham os tickets no dia a dia) OU o
-- próprio client (via client_users) para os próprios tickets

CREATE POLICY "tickets_select_tenant_staff_or_own_client"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    OR client_id = get_current_client_id()
  );

CREATE POLICY "tickets_insert_tenant_staff_or_own_client"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    OR client_id = get_current_client_id()
  );

CREATE POLICY "tickets_update_tenant_staff_or_own_client"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    OR client_id = get_current_client_id()
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    OR client_id = get_current_client_id()
  );

-- DELETE: só tenant_admin (equivalente exato da regra legado "Tenant
-- admins can delete own tickets")
CREATE POLICY "tickets_delete_tenant_admin"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE tenant_id = get_current_tenant_id())
    AND is_tenant_admin()
  );
