-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE public.user_role AS ENUM ('admin', 'analista-db', 'analista-app', 'cliente');
CREATE TYPE public.ticket_segment AS ENUM ('DB', 'APP');
CREATE TYPE public.ticket_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE public.ticket_type AS ENUM ('incidente', 'duvida', 'solicitacao');
CREATE TYPE public.ticket_status AS ENUM ('novo', 'em_atendimento', 'aguardando_cliente', 'resolvido', 'fechado');
CREATE TYPE public.lock_status AS ENUM ('locked', 'unlocked');
CREATE TYPE public.db_engine AS ENUM ('Oracle', 'PostgreSQL', 'MySQL', 'MongoDB', 'SQL Server');
CREATE TYPE public.environment_type AS ENUM ('prod', 'hom', 'qa', 'dev');
CREATE TYPE public.criticality_level AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.machine_type AS ENUM ('servidor', 'vm', 'desktop', 'cloud');
CREATE TYPE public.frequency_type AS ENUM ('pontual', 'intermitente', 'continuo');
CREATE TYPE public.business_impact AS ENUM ('nenhum', 'baixo', 'medio', 'alto', 'critico');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'cliente',
  client_id UUID,
  team_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  status TEXT DEFAULT 'ativo',
  tags TEXT[],
  sla_db_p1_first_response INTEGER DEFAULT 15,
  sla_db_p1_resolution INTEGER DEFAULT 240,
  sla_db_p2_first_response INTEGER DEFAULT 30,
  sla_db_p2_resolution INTEGER DEFAULT 480,
  sla_db_p3_first_response INTEGER DEFAULT 60,
  sla_db_p3_resolution INTEGER DEFAULT 960,
  sla_db_p4_first_response INTEGER DEFAULT 120,
  sla_db_p4_resolution INTEGER DEFAULT 1920,
  sla_app_p1_first_response INTEGER DEFAULT 15,
  sla_app_p1_resolution INTEGER DEFAULT 240,
  sla_app_p2_first_response INTEGER DEFAULT 30,
  sla_app_p2_resolution INTEGER DEFAULT 480,
  sla_app_p3_first_response INTEGER DEFAULT 60,
  sla_app_p3_resolution INTEGER DEFAULT 960,
  sla_app_p4_first_response INTEGER DEFAULT 120,
  sla_app_p4_resolution INTEGER DEFAULT 1920,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create client_contacts table
CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create machines table
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  machine_type machine_type NOT NULL,
  operating_system TEXT,
  location TEXT,
  serial_number TEXT,
  criticality criticality_level DEFAULT 'media',
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create application_products table (seed data)
CREATE TABLE public.application_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  modules JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create database_instances table
CREATE TABLE public.database_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  engine db_engine NOT NULL,
  version TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  endpoint TEXT,
  port INTEGER,
  environment environment_type NOT NULL,
  criticality criticality_level DEFAULT 'media',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create application_instances table
CREATE TABLE public.application_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.application_products(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  version TEXT NOT NULL,
  environment environment_type NOT NULL,
  active_modules JSONB DEFAULT '[]',
  integrations JSONB DEFAULT '[]',
  criticality criticality_level DEFAULT 'media',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  segment ticket_segment NOT NULL,
  specialization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  segment ticket_segment NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  priority ticket_priority NOT NULL,
  ticket_type ticket_type NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Sintomas obrigatórios
  opening_reason TEXT NOT NULL,
  problem_faced TEXT NOT NULL,
  error_displayed TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  frequency frequency_type NOT NULL,
  business_impact business_impact NOT NULL,
  workaround TEXT,
  reproduction_steps TEXT,
  evidences JSONB DEFAULT '[]',
  
  -- DB-specific (nullable, required if segment=DB)
  db_engine db_engine,
  db_instance_id UUID REFERENCES public.database_instances(id) ON DELETE SET NULL,
  db_machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  db_environment environment_type,
  
  -- APP-specific (nullable, required if segment=APP)
  app_product_id UUID REFERENCES public.application_products(id) ON DELETE SET NULL,
  app_instance_id UUID REFERENCES public.application_instances(id) ON DELETE SET NULL,
  app_module TEXT,
  app_machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  app_environment environment_type,
  app_version TEXT,
  
  -- Status and assignment
  status ticket_status DEFAULT 'novo',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  analyst_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- SLA
  sla_first_response_deadline TIMESTAMP WITH TIME ZONE,
  sla_resolution_deadline TIMESTAMP WITH TIME ZONE,
  sla_first_response_met BOOLEAN,
  sla_resolution_met BOOLEAN,
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Lock mechanism
  lock_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lock_at TIMESTAMP WITH TIME ZONE,
  lock_ttl INTEGER DEFAULT 3600,
  lock_status lock_status DEFAULT 'unlocked',
  
  -- CSAT
  csat_rating INTEGER CHECK (csat_rating >= 1 AND csat_rating <= 5),
  csat_comment TEXT,
  
  -- Optimistic locking
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_comments table
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ticket_time_logs table
CREATE TABLE public.ticket_time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  analyst_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hours DECIMAL(10,2) NOT NULL,
  description TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create faq_articles table
CREATE TABLE public.faq_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment ticket_segment NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[],
  status TEXT DEFAULT 'rascunho',
  db_engines db_engine[],
  db_categories TEXT[],
  app_product_ids UUID[],
  app_modules TEXT[],
  app_versions TEXT[],
  attachments JSONB DEFAULT '[]',
  view_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for clients (multi-tenant)
CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Analysts can view all clients" ON public.clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'analista-db' OR role = 'analista-app'))
);
CREATE POLICY "Clients can view their own client" ON public.clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND client_id = clients.id)
);

-- RLS Policies for tickets (multi-tenant, segmented by role)
CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "DB Analysts can view DB tickets" ON public.tickets FOR SELECT USING (
  segment = 'DB' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'analista-db')
);
CREATE POLICY "APP Analysts can view APP tickets" ON public.tickets FOR SELECT USING (
  segment = 'APP' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'analista-app')
);
CREATE POLICY "Clients can view their own tickets" ON public.tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND client_id = tickets.client_id)
);

-- Insert policy for tickets
CREATE POLICY "Authenticated users can create tickets" ON public.tickets FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Update policy for tickets (respecting lock)
CREATE POLICY "Admins can update any ticket" ON public.tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Lock owner can update their locked ticket" ON public.tickets FOR UPDATE USING (
  lock_status = 'locked' AND lock_owner_id = auth.uid()
);
CREATE POLICY "Analysts can update unlocked tickets in their segment" ON public.tickets FOR UPDATE USING (
  lock_status = 'unlocked' AND (
    (segment = 'DB' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'analista-db')) OR
    (segment = 'APP' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'analista-app'))
  )
);

-- RLS for related tables
CREATE POLICY "Users can view contacts of their accessible clients" ON public.client_contacts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_contacts.client_id
  )
);

CREATE POLICY "Users can view machines of their accessible clients" ON public.machines FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = machines.client_id
  )
);

CREATE POLICY "Users can view DB instances of their accessible clients" ON public.database_instances FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = database_instances.client_id
  )
);

CREATE POLICY "Everyone can view application products" ON public.application_products FOR SELECT USING (true);

CREATE POLICY "Users can view app instances of their accessible clients" ON public.application_instances FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = application_instances.client_id
  )
);

CREATE POLICY "Users can view all teams" ON public.teams FOR SELECT USING (true);

CREATE POLICY "Users can view comments on accessible tickets" ON public.ticket_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_comments.ticket_id
  )
);

CREATE POLICY "Users can view FAQ articles" ON public.faq_articles FOR SELECT USING (
  status = 'publicado' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'analista-db', 'analista-app'))
);

-- Create indexes
CREATE INDEX idx_tickets_client ON public.tickets(client_id);
CREATE INDEX idx_tickets_segment ON public.tickets(segment);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_team ON public.tickets(team_id);
CREATE INDEX idx_tickets_analyst ON public.tickets(analyst_id);
CREATE INDEX idx_tickets_lock_status ON public.tickets(lock_status);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX idx_db_instances_client ON public.database_instances(client_id);
CREATE INDEX idx_db_instances_engine ON public.database_instances(engine);
CREATE INDEX idx_app_instances_client ON public.application_instances(client_id);
CREATE INDEX idx_app_instances_product ON public.application_instances(product_id);
CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_database_instances_updated_at BEFORE UPDATE ON public.database_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_application_instances_updated_at BEFORE UPDATE ON public.application_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faq_articles_updated_at BEFORE UPDATE ON public.faq_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate ticket number
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
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION public.generate_ticket_number();

-- Function to calculate SLA deadlines
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
$$ LANGUAGE plpgsql;

-- Trigger to calculate SLA on ticket creation
CREATE TRIGGER calculate_sla_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sla_deadlines();

-- Seed application products
INSERT INTO public.application_products (name, description, modules) VALUES
  ('ContaDia', 'Sistema de gestão contábil', '["Contabilidade", "Fiscal", "Relatórios"]'::jsonb),
  ('Sec4File', 'Sistema de gestão documental e segurança', '["Documentos", "Workflow", "Auditoria", "Assinatura Digital"]'::jsonb),
  ('LexisFlow', 'Sistema de gestão jurídica e processos', '["Processos", "Prazos", "Clientes", "Relatórios Jurídicos"]'::jsonb);

-- Seed teams
INSERT INTO public.teams (name, segment, specialization) VALUES
  ('DB - Oracle', 'DB', 'Oracle'),
  ('DB - PostgreSQL', 'DB', 'PostgreSQL'),
  ('DB - MySQL', 'DB', 'MySQL'),
  ('DB - MongoDB', 'DB', 'MongoDB'),
  ('DB - SQL Server', 'DB', 'SQL Server'),
  ('APP - ContaDia', 'APP', 'ContaDia'),
  ('APP - Sec4File', 'APP', 'Sec4File'),
  ('APP - LexisFlow', 'APP', 'LexisFlow');