-- Migração 2: Criar função is_viewer e policies RLS

-- Criar função helper is_viewer
CREATE OR REPLACE FUNCTION public.is_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'viewer'
  )
$$;

-- Atualizar RLS policies para incluir viewer nas políticas de SELECT

-- tickets: Criar nova política para viewer ver todos os tickets
CREATE POLICY "Viewers can view all tickets"
ON public.tickets
FOR SELECT
USING (is_viewer(auth.uid()));

-- ticket_comments: Viewer pode ver todos os comentários (incluindo internos)
CREATE POLICY "Viewers can view all comments"
ON public.ticket_comments
FOR SELECT
USING (is_viewer(auth.uid()));

-- ticket_history: Viewer pode ver todo histórico
CREATE POLICY "Viewers can view all ticket history"
ON public.ticket_history
FOR SELECT
USING (is_viewer(auth.uid()));

-- profiles: Viewer pode ver todos os perfis
CREATE POLICY "Viewers can view all profiles"
ON public.profiles
FOR SELECT
USING (is_viewer(auth.uid()));

-- clients: Viewer pode ver todos os clientes
CREATE POLICY "Viewers can view all clients"
ON public.clients
FOR SELECT
USING (is_viewer(auth.uid()));

-- machines: Viewer pode ver todas as máquinas
CREATE POLICY "Viewers can view all machines"
ON public.machines
FOR SELECT
USING (is_viewer(auth.uid()));

-- database_instances: Viewer pode ver todos os DBs
CREATE POLICY "Viewers can view all databases"
ON public.database_instances
FOR SELECT
USING (is_viewer(auth.uid()));

-- application_instances: Viewer pode ver todas as apps
CREATE POLICY "Viewers can view all applications"
ON public.application_instances
FOR SELECT
USING (is_viewer(auth.uid()));

-- user_roles: Viewer pode ver todas as roles
CREATE POLICY "Viewers can view all roles"
ON public.user_roles
FOR SELECT
USING (is_viewer(auth.uid()));

-- faq_articles: Viewer pode ver todos os artigos
CREATE POLICY "Viewers can view all faq articles"
ON public.faq_articles
FOR SELECT
USING (is_viewer(auth.uid()));

-- faq_history: Viewer pode ver histórico de FAQ
CREATE POLICY "Viewers can view faq history"
ON public.faq_history
FOR SELECT
USING (is_viewer(auth.uid()));

-- sla_notifications: Viewer pode ver notificações SLA
CREATE POLICY "Viewers can view sla notifications"
ON public.sla_notifications
FOR SELECT
USING (is_viewer(auth.uid()));

-- report_send_logs: Viewer pode ver logs de envio
CREATE POLICY "Viewers can view report logs"
ON public.report_send_logs
FOR SELECT
USING (is_viewer(auth.uid()));

-- client_contacts: Viewer pode ver contatos
CREATE POLICY "Viewers can view all contacts"
ON public.client_contacts
FOR SELECT
USING ((auth.uid() IS NOT NULL) AND is_viewer(auth.uid()));

-- ticket_time_logs: Viewer pode ver logs de tempo
CREATE POLICY "Viewers can view time logs"
ON public.ticket_time_logs
FOR SELECT
USING (is_viewer(auth.uid()));

-- system_configs: Viewer pode ver configurações
CREATE POLICY "Viewers can view configs"
ON public.system_configs
FOR SELECT
USING (is_viewer(auth.uid()));