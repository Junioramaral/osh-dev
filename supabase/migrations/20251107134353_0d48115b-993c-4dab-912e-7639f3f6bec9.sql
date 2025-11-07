-- Fix security warnings: Add missing RLS policies and fix search_path

-- Add missing insert/update/delete policies for client_contacts
CREATE POLICY "Admins can insert client contacts" ON public.client_contacts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update client contacts" ON public.client_contacts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete client contacts" ON public.client_contacts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add missing insert/update/delete policies for machines
CREATE POLICY "Admins can insert machines" ON public.machines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update machines" ON public.machines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete machines" ON public.machines FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add missing insert/update/delete policies for database_instances
CREATE POLICY "Admins can insert database instances" ON public.database_instances FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "DB Analysts can insert database instances" ON public.database_instances FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'analista-db')
);
CREATE POLICY "Admins can update database instances" ON public.database_instances FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "DB Analysts can update database instances" ON public.database_instances FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'analista-db')
);
CREATE POLICY "Admins can delete database instances" ON public.database_instances FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add missing insert/update/delete policies for application_instances
CREATE POLICY "Admins can insert application instances" ON public.application_instances FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "APP Analysts can insert application instances" ON public.application_instances FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'analista-app')
);
CREATE POLICY "Admins can update application instances" ON public.application_instances FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "APP Analysts can update application instances" ON public.application_instances FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'analista-app')
);
CREATE POLICY "Admins can delete application instances" ON public.application_instances FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add missing policies for clients insert/update/delete
CREATE POLICY "Admins can insert clients" ON public.clients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add missing policies for ticket_comments insert
CREATE POLICY "Users can insert comments on accessible tickets" ON public.ticket_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments.ticket_id
  )
);

-- Add missing policies for ticket_time_logs
CREATE POLICY "Analysts can insert time logs" ON public.ticket_time_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('analista-db', 'analista-app', 'admin'))
);
CREATE POLICY "Analysts can view time logs" ON public.ticket_time_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('analista-db', 'analista-app', 'admin'))
);

-- Add missing policies for faq_articles
CREATE POLICY "Admins can insert FAQ articles" ON public.faq_articles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Analysts can insert FAQ articles" ON public.faq_articles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('analista-db', 'analista-app'))
);
CREATE POLICY "Admins can update FAQ articles" ON public.faq_articles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Authors can update their FAQ articles" ON public.faq_articles FOR UPDATE USING (
  created_by = auth.uid()
);
CREATE POLICY "Admins can delete FAQ articles" ON public.faq_articles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Fix search_path for existing functions
DROP FUNCTION IF EXISTS public.generate_ticket_number() CASCADE;
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  counter INTEGER;
BEGIN
  IF NEW.segment = 'DB' THEN
    prefix := 'DB';
  ELSE
    prefix := 'APP';
  END IF;
  
  SELECT COUNT(*) + 1 INTO counter FROM public.tickets WHERE segment = NEW.segment;
  NEW.ticket_number := prefix || '-' || LPAD(counter::TEXT, 6, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION public.generate_ticket_number();

DROP FUNCTION IF EXISTS public.calculate_sla_deadlines() CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_sla_deadlines()
RETURNS TRIGGER AS $$
DECLARE
  first_response_minutes INTEGER;
  resolution_minutes INTEGER;
BEGIN
  -- Get SLA from client based on segment and priority
  IF NEW.segment = 'DB' THEN
    CASE NEW.priority
      WHEN 'P1' THEN
        SELECT sla_db_p1_first_response, sla_db_p1_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P2' THEN
        SELECT sla_db_p2_first_response, sla_db_p2_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P3' THEN
        SELECT sla_db_p3_first_response, sla_db_p3_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P4' THEN
        SELECT sla_db_p4_first_response, sla_db_p4_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
    END CASE;
  ELSE
    CASE NEW.priority
      WHEN 'P1' THEN
        SELECT sla_app_p1_first_response, sla_app_p1_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P2' THEN
        SELECT sla_app_p2_first_response, sla_app_p2_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P3' THEN
        SELECT sla_app_p3_first_response, sla_app_p3_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
      WHEN 'P4' THEN
        SELECT sla_app_p4_first_response, sla_app_p4_resolution INTO first_response_minutes, resolution_minutes FROM public.clients WHERE id = NEW.client_id;
    END CASE;
  END IF;
  
  NEW.sla_first_response_deadline := NEW.created_at + (first_response_minutes || ' minutes')::INTERVAL;
  NEW.sla_resolution_deadline := NEW.created_at + (resolution_minutes || ' minutes')::INTERVAL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER calculate_sla_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sla_deadlines();

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_database_instances_updated_at BEFORE UPDATE ON public.database_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_application_instances_updated_at BEFORE UPDATE ON public.application_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faq_articles_updated_at BEFORE UPDATE ON public.faq_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();