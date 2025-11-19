-- ============================================
-- MIGRAÇÃO: Simplificação Roles (v3 - Final)
-- ============================================

-- 1. Criar função helper Otimizzo
CREATE OR REPLACE FUNCTION public.is_otimizzo_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND tenant_id = '00000000-0000-0000-0000-000000000001') $$;

-- 2. Migrar dados
UPDATE public.user_roles SET role = 'user' WHERE role IN ('tenant_admin', 'analyst_db', 'analyst_app');

-- 3. DROP TODAS as policies
DROP POLICY IF EXISTS "Analysts can update tenant tickets in segment" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Lock owner can update their locked ticket" ON public.tickets;
DROP POLICY IF EXISTS "Super admins can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Tenant admins can manage tenant tickets" ON public.tickets;
DROP POLICY IF EXISTS "Tenant users can view tenant tickets" ON public.tickets;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins can manage tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Tenant users can view own tenant" ON public.clients;
DROP POLICY IF EXISTS "DB analysts can manage tenant db instances" ON public.database_instances;
DROP POLICY IF EXISTS "Super admins can manage all db instances" ON public.database_instances;
DROP POLICY IF EXISTS "Tenant users can view tenant db instances" ON public.database_instances;
DROP POLICY IF EXISTS "APP analysts can manage tenant app instances" ON public.application_instances;
DROP POLICY IF EXISTS "Super admins can manage all app instances" ON public.application_instances;
DROP POLICY IF EXISTS "Tenant users can view tenant app instances" ON public.application_instances;
DROP POLICY IF EXISTS "Super admins can manage all machines" ON public.machines;
DROP POLICY IF EXISTS "Tenant admins can manage tenant machines" ON public.machines;
DROP POLICY IF EXISTS "Tenant users can view tenant machines" ON public.machines;
DROP POLICY IF EXISTS "Analysts can insert faq articles" ON public.faq_articles;
DROP POLICY IF EXISTS "Authors can update their FAQ articles" ON public.faq_articles;
DROP POLICY IF EXISTS "Super admins can manage all faq articles" ON public.faq_articles;
DROP POLICY IF EXISTS "Users can view FAQ articles" ON public.faq_articles;
DROP POLICY IF EXISTS "Super admins can manage all contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Tenant admins can manage tenant contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Tenant users can view tenant contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Analysts can manage time logs" ON public.ticket_time_logs;
DROP POLICY IF EXISTS "Super admins can manage all time logs" ON public.ticket_time_logs;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert comments on accessible tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON public.ticket_comments;

-- 4. DROP função has_role
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- 5. Alterar enum
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'user');
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
DROP TYPE public.app_role_old CASCADE;

-- 6. Recriar has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- 7. POLICIES - TICKETS
CREATE POLICY "Super admins can manage all tickets" ON public.tickets FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo users can manage all tickets" ON public.tickets FOR ALL TO authenticated
USING (is_otimizzo_user(auth.uid())) WITH CHECK (is_otimizzo_user(auth.uid()));

CREATE POLICY "Client users can view their tickets" ON public.tickets FOR SELECT TO authenticated
USING (NOT is_super_admin(auth.uid()) AND NOT is_otimizzo_user(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Client users can create tickets" ON public.tickets FOR INSERT TO authenticated
WITH CHECK (NOT is_super_admin(auth.uid()) AND NOT is_otimizzo_user(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Client users can update their tickets" ON public.tickets FOR UPDATE TO authenticated
USING (NOT is_super_admin(auth.uid()) AND NOT is_otimizzo_user(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- PROFILES
CREATE POLICY "Super admins can manage all profiles" ON public.profiles FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo users can view all profiles" ON public.profiles FOR SELECT TO authenticated
USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- CLIENTS
CREATE POLICY "Super admins manage clients" ON public.clients FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo view clients" ON public.clients FOR SELECT TO authenticated
USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Client view own" ON public.clients FOR SELECT TO authenticated
USING (NOT is_super_admin(auth.uid()) AND NOT is_otimizzo_user(auth.uid()) AND id = get_user_tenant_id(auth.uid()));

-- DB INSTANCES
CREATE POLICY "Super admins manage db" ON public.database_instances FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo view db" ON public.database_instances FOR SELECT TO authenticated
USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Client view own db" ON public.database_instances FOR SELECT TO authenticated
USING (NOT is_super_admin(auth.uid()) AND NOT is_otimizzo_user(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- APP INSTANCES
CREATE POLICY "Super admins manage app" ON public.application_instances FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo view app" ON public.application_instances FOR SELECT TO authenticated
USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Client view own app" ON public.application_instances FOR SELECT TO authenticated
USING (NOT is_super_admin(auth.uid()) AND NOT is_otimizzo_user(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- MACHINES
CREATE POLICY "Super admins manage machines" ON public.machines FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo view machines" ON public.machines FOR SELECT TO authenticated
USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Client view own machines" ON public.machines FOR SELECT TO authenticated
USING (NOT is_super_admin(auth.uid()) AND NOT is_otimizzo_user(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- FAQ
CREATE POLICY "Super admins manage faq" ON public.faq_articles FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo create faq" ON public.faq_articles FOR INSERT TO authenticated
WITH CHECK (is_otimizzo_user(auth.uid()));

CREATE POLICY "Otimizzo update faq" ON public.faq_articles FOR UPDATE TO authenticated
USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "All view published faq" ON public.faq_articles FOR SELECT TO authenticated
USING (status = 'publicado' OR is_super_admin(auth.uid()) OR is_otimizzo_user(auth.uid()));

-- CONTACTS
CREATE POLICY "Super admins manage contacts" ON public.client_contacts FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo view contacts" ON public.client_contacts FOR SELECT TO authenticated
USING (is_otimizzo_user(auth.uid()));

CREATE POLICY "Client view own contacts" ON public.client_contacts FOR SELECT TO authenticated
USING (NOT is_super_admin(auth.uid()) AND NOT is_otimizzo_user(auth.uid()) AND client_id = get_user_tenant_id(auth.uid()));

-- TIME LOGS
CREATE POLICY "Super admins manage logs" ON public.ticket_time_logs FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Otimizzo manage logs" ON public.ticket_time_logs FOR ALL TO authenticated
USING (is_otimizzo_user(auth.uid())) WITH CHECK (is_otimizzo_user(auth.uid()));

-- USER ROLES
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated
USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- COMMENTS
CREATE POLICY "Insert comments" ON public.ticket_comments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_comments.ticket_id));

CREATE POLICY "View comments" ON public.ticket_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_comments.ticket_id) AND (NOT is_internal OR is_super_admin(auth.uid()) OR is_otimizzo_user(auth.uid())));