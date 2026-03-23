-- Fix viewer RLS policies to restrict by tenant

-- tickets
DROP POLICY IF EXISTS "Viewers can view all tickets" ON public.tickets;
CREATE POLICY "Viewers can view tenant tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- ticket_comments
DROP POLICY IF EXISTS "Viewers can view all comments" ON public.ticket_comments;
CREATE POLICY "Viewers can view tenant comments"
  ON public.ticket_comments FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_comments.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  ));

-- ticket_history
DROP POLICY IF EXISTS "Viewers can view all ticket history" ON public.ticket_history;
CREATE POLICY "Viewers can view tenant ticket history"
  ON public.ticket_history FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_history.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  ));

-- ticket_time_logs
DROP POLICY IF EXISTS "Viewers can view time logs" ON public.ticket_time_logs;
CREATE POLICY "Viewers can view tenant time logs"
  ON public.ticket_time_logs FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_time_logs.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  ));

-- machines
DROP POLICY IF EXISTS "Viewers can view all machines" ON public.machines;
CREATE POLICY "Viewers can view tenant machines"
  ON public.machines FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- database_instances
DROP POLICY IF EXISTS "Viewers can view all databases" ON public.database_instances;
CREATE POLICY "Viewers can view tenant databases"
  ON public.database_instances FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- application_instances
DROP POLICY IF EXISTS "Viewers can view all applications" ON public.application_instances;
CREATE POLICY "Viewers can view tenant applications"
  ON public.application_instances FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- client_contacts
DROP POLICY IF EXISTS "Viewers can view all contacts" ON public.client_contacts;
CREATE POLICY "Viewers can view tenant contacts"
  ON public.client_contacts FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- client_projects
DROP POLICY IF EXISTS "Viewers can view all projects" ON public.client_projects;
CREATE POLICY "Viewers can view tenant projects"
  ON public.client_projects FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- clients
DROP POLICY IF EXISTS "Viewers can view all clients" ON public.clients;
CREATE POLICY "Viewers can view own client"
  ON public.clients FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND id = get_user_tenant_id(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Viewers can view all profiles" ON public.profiles;
CREATE POLICY "Viewers can view tenant profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND (
    id = auth.uid() OR client_id = get_user_tenant_id(auth.uid())
  ));

-- faq_articles
DROP POLICY IF EXISTS "Viewers can view all faq articles" ON public.faq_articles;
CREATE POLICY "Viewers can view tenant faq articles"
  ON public.faq_articles FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND (
    visibility = 'global' OR
    (visibility = 'client_specific' AND client_id = get_user_tenant_id(auth.uid()))
  ));

-- faq_history
DROP POLICY IF EXISTS "Viewers can view faq history" ON public.faq_history;
CREATE POLICY "Viewers can view tenant faq history"
  ON public.faq_history FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND EXISTS (
    SELECT 1 FROM faq_articles fa WHERE fa.id = faq_history.article_id AND (
      fa.visibility = 'global' OR
      (fa.visibility = 'client_specific' AND fa.client_id = get_user_tenant_id(auth.uid()))
    )
  ));

-- sla_notifications
DROP POLICY IF EXISTS "Viewers can view sla notifications" ON public.sla_notifications;
CREATE POLICY "Viewers can view tenant sla notifications"
  ON public.sla_notifications FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = sla_notifications.ticket_id AND t.client_id = get_user_tenant_id(auth.uid())
  ));

-- report_send_logs
DROP POLICY IF EXISTS "Viewers can view report logs" ON public.report_send_logs;
CREATE POLICY "Viewers can view tenant report logs"
  ON public.report_send_logs FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- user_roles - restrict to own tenant
DROP POLICY IF EXISTS "Viewers can view all roles" ON public.user_roles;
CREATE POLICY "Viewers can view tenant roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (is_viewer(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));