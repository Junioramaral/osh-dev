-- ============================================
-- FASE 1: Sistema de Roles Seguro
-- ============================================

-- Criar novo enum com hierarquia de roles
CREATE TYPE app_role AS ENUM (
  'super_admin',      -- Otimizzo (acesso total ao sistema)
  'tenant_admin',     -- Admin de um tenant específico
  'analyst_db',       -- Analista DB do tenant
  'analyst_app',      -- Analista APP do tenant
  'user'              -- Usuário comum do tenant
);

-- Criar tabela user_roles (segura, evita privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  tenant_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role, tenant_id)
);

-- Índices para performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS: Usuários podem ver suas próprias roles
CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS: Super admins podem gerenciar todas as roles
CREATE POLICY "Super admins can manage all roles"
ON user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
);

-- Função segura para verificar roles (SECURITY DEFINER evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Função para obter tenant_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = _user_id AND tenant_id IS NOT NULL
  LIMIT 1
$$;

-- Migrar roles existentes de profiles para user_roles
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT 
  p.id,
  CASE p.role::text
    WHEN 'admin' THEN 'super_admin'::app_role
    WHEN 'analista-db' THEN 'analyst_db'::app_role
    WHEN 'analista-app' THEN 'analyst_app'::app_role
    WHEN 'cliente' THEN 'user'::app_role
    ELSE 'user'::app_role
  END,
  p.client_id
FROM public.profiles p
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- ============================================
-- FASE 2: Transformar Clients em Tenants
-- ============================================

-- Adicionar campos de multi-tenancy à tabela clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'customer' CHECK (tenant_type IN ('otimizzo', 'customer'));
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS segments TEXT[] DEFAULT ARRAY['DB', 'APP']::TEXT[];
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 10;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_clients_tenant_type ON clients(tenant_type);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

-- Criar tenant Otimizzo
INSERT INTO public.clients (id, name, tenant_type, segments, status, is_active, cnpj)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Otimizzo',
  'otimizzo',
  ARRAY['DB', 'APP'],
  'ativo',
  true,
  '00.000.000/0001-00'
)
ON CONFLICT (id) DO UPDATE SET 
  tenant_type = 'otimizzo',
  segments = ARRAY['DB', 'APP'],
  is_active = true;

-- ============================================
-- FASE 3: Atualizar RLS Policies
-- ============================================

-- TICKETS: Drop políticas antigas
DROP POLICY IF EXISTS "Clients can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "DB Analysts can view DB tickets" ON tickets;
DROP POLICY IF EXISTS "APP Analysts can view APP tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can update any ticket" ON tickets;
DROP POLICY IF EXISTS "Analysts can update unlocked tickets in their segment" ON tickets;

-- TICKETS: Super admins veem e gerenciam tudo
CREATE POLICY "Super admins can manage all tickets"
ON tickets FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- TICKETS: Usuários do tenant veem tickets do tenant
CREATE POLICY "Tenant users can view tenant tickets"
ON tickets FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin(auth.uid())
  AND client_id = public.get_user_tenant_id(auth.uid())
);

-- TICKETS: Tenant admins podem gerenciar tickets do tenant
CREATE POLICY "Tenant admins can manage tenant tickets"
ON tickets FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin') 
  AND client_id = public.get_user_tenant_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin')
  AND client_id = public.get_user_tenant_id(auth.uid())
);

-- TICKETS: Analistas podem atualizar tickets do tenant no seu segmento
CREATE POLICY "Analysts can update tenant tickets in segment"
ON tickets FOR UPDATE
TO authenticated
USING (
  client_id = public.get_user_tenant_id(auth.uid())
  AND (
    (segment = 'DB' AND public.has_role(auth.uid(), 'analyst_db'))
    OR
    (segment = 'APP' AND public.has_role(auth.uid(), 'analyst_app'))
  )
);

-- CLIENTS: Drop políticas antigas
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON clients;
DROP POLICY IF EXISTS "Admins can update clients" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;
DROP POLICY IF EXISTS "Analysts can view all clients" ON clients;
DROP POLICY IF EXISTS "Clients can view their own client" ON clients;

-- CLIENTS: Super admins gerenciam tudo
CREATE POLICY "Super admins can manage all clients"
ON clients FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- CLIENTS: Usuários do tenant veem seu próprio tenant
CREATE POLICY "Tenant users can view own tenant"
ON clients FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin(auth.uid())
  AND id = public.get_user_tenant_id(auth.uid())
);

-- DATABASE_INSTANCES: Drop políticas antigas
DROP POLICY IF EXISTS "Admins can delete database instances" ON database_instances;
DROP POLICY IF EXISTS "Admins can insert database instances" ON database_instances;
DROP POLICY IF EXISTS "Admins can update database instances" ON database_instances;
DROP POLICY IF EXISTS "DB Analysts can insert database instances" ON database_instances;
DROP POLICY IF EXISTS "DB Analysts can update database instances" ON database_instances;
DROP POLICY IF EXISTS "Users can view DB instances of their accessible clients" ON database_instances;

-- DATABASE_INSTANCES: Super admins gerenciam tudo
CREATE POLICY "Super admins can manage all db instances"
ON database_instances FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- DATABASE_INSTANCES: Usuários do tenant veem instâncias do tenant
CREATE POLICY "Tenant users can view tenant db instances"
ON database_instances FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin(auth.uid())
  AND client_id = public.get_user_tenant_id(auth.uid())
);

-- DATABASE_INSTANCES: DB Analysts e admins do tenant gerenciam
CREATE POLICY "DB analysts can manage tenant db instances"
ON database_instances FOR ALL
TO authenticated
USING (
  client_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst_db')
    OR public.has_role(auth.uid(), 'tenant_admin')
  )
)
WITH CHECK (
  client_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst_db')
    OR public.has_role(auth.uid(), 'tenant_admin')
  )
);

-- APPLICATION_INSTANCES: Drop políticas antigas
DROP POLICY IF EXISTS "Admins can delete application instances" ON application_instances;
DROP POLICY IF EXISTS "Admins can insert application instances" ON application_instances;
DROP POLICY IF EXISTS "Admins can update application instances" ON application_instances;
DROP POLICY IF EXISTS "APP Analysts can insert application instances" ON application_instances;
DROP POLICY IF EXISTS "APP Analysts can update application instances" ON application_instances;
DROP POLICY IF EXISTS "Users can view app instances of their accessible clients" ON application_instances;

-- APPLICATION_INSTANCES: Super admins gerenciam tudo
CREATE POLICY "Super admins can manage all app instances"
ON application_instances FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- APPLICATION_INSTANCES: Usuários do tenant veem instâncias do tenant
CREATE POLICY "Tenant users can view tenant app instances"
ON application_instances FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin(auth.uid())
  AND client_id = public.get_user_tenant_id(auth.uid())
);

-- APPLICATION_INSTANCES: APP Analysts e admins do tenant gerenciam
CREATE POLICY "APP analysts can manage tenant app instances"
ON application_instances FOR ALL
TO authenticated
USING (
  client_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst_app')
    OR public.has_role(auth.uid(), 'tenant_admin')
  )
)
WITH CHECK (
  client_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'analyst_app')
    OR public.has_role(auth.uid(), 'tenant_admin')
  )
);

-- MACHINES: Drop políticas antigas
DROP POLICY IF EXISTS "Admins can delete machines" ON machines;
DROP POLICY IF EXISTS "Admins can insert machines" ON machines;
DROP POLICY IF EXISTS "Admins can update machines" ON machines;
DROP POLICY IF EXISTS "Users can view machines of their accessible clients" ON machines;

-- MACHINES: Super admins gerenciam tudo
CREATE POLICY "Super admins can manage all machines"
ON machines FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- MACHINES: Usuários do tenant veem máquinas do tenant
CREATE POLICY "Tenant users can view tenant machines"
ON machines FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin(auth.uid())
  AND client_id = public.get_user_tenant_id(auth.uid())
);

-- MACHINES: Admins do tenant gerenciam máquinas
CREATE POLICY "Tenant admins can manage tenant machines"
ON machines FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin')
  AND client_id = public.get_user_tenant_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin')
  AND client_id = public.get_user_tenant_id(auth.uid())
);

-- CLIENT_CONTACTS: Drop políticas antigas
DROP POLICY IF EXISTS "Admins can delete client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Admins can insert client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Admins can update client contacts" ON client_contacts;
DROP POLICY IF EXISTS "Users can view contacts of their accessible clients" ON client_contacts;

-- CLIENT_CONTACTS: Super admins gerenciam tudo
CREATE POLICY "Super admins can manage all contacts"
ON client_contacts FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- CLIENT_CONTACTS: Usuários do tenant veem contatos do tenant
CREATE POLICY "Tenant users can view tenant contacts"
ON client_contacts FOR SELECT
TO authenticated
USING (
  NOT public.is_super_admin(auth.uid())
  AND client_id = public.get_user_tenant_id(auth.uid())
);

-- CLIENT_CONTACTS: Admins do tenant gerenciam contatos
CREATE POLICY "Tenant admins can manage tenant contacts"
ON client_contacts FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'tenant_admin')
  AND client_id = public.get_user_tenant_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'tenant_admin')
  AND client_id = public.get_user_tenant_id(auth.uid())
);

-- FAQ_ARTICLES: Drop políticas antigas
DROP POLICY IF EXISTS "Admins can delete FAQ articles" ON faq_articles;
DROP POLICY IF EXISTS "Admins can insert FAQ articles" ON faq_articles;
DROP POLICY IF EXISTS "Admins can update FAQ articles" ON faq_articles;
DROP POLICY IF EXISTS "Analysts can insert FAQ articles" ON faq_articles;

-- FAQ_ARTICLES: Super admins gerenciam tudo
CREATE POLICY "Super admins can manage all faq articles"
ON faq_articles FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- FAQ_ARTICLES: Analistas podem inserir artigos
CREATE POLICY "Analysts can insert faq articles"
ON faq_articles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'analyst_db')
  OR public.has_role(auth.uid(), 'analyst_app')
  OR public.has_role(auth.uid(), 'tenant_admin')
);

-- TICKET_TIME_LOGS: Drop políticas antigas
DROP POLICY IF EXISTS "Analysts can insert time logs" ON ticket_time_logs;
DROP POLICY IF EXISTS "Analysts can view time logs" ON ticket_time_logs;

-- TICKET_TIME_LOGS: Super admins gerenciam tudo
CREATE POLICY "Super admins can manage all time logs"
ON ticket_time_logs FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- TICKET_TIME_LOGS: Analistas e admins podem inserir/ver logs
CREATE POLICY "Analysts can manage time logs"
ON ticket_time_logs FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'analyst_db')
  OR public.has_role(auth.uid(), 'analyst_app')
  OR public.has_role(auth.uid(), 'tenant_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'analyst_db')
  OR public.has_role(auth.uid(), 'analyst_app')
  OR public.has_role(auth.uid(), 'tenant_admin')
);