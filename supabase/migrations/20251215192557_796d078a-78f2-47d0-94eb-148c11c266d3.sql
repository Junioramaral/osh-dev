-- Create ticket_categories table
CREATE TABLE public.ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment public.ticket_segment NULL, -- NULL means applies to both segments
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, segment)
);

-- Enable RLS
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View active categories"
ON public.ticket_categories
FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage categories"
ON public.ticket_categories
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Insert initial DB categories
INSERT INTO public.ticket_categories (name, segment, sort_order) VALUES
  ('Erro de Performance', 'DB', 1),
  ('Backup/Restore', 'DB', 2),
  ('Replicação', 'DB', 3),
  ('Erro SQL', 'DB', 4),
  ('Tunning', 'DB', 5),
  ('Alta Disponibilidade', 'DB', 6),
  ('Migração', 'DB', 7),
  ('Segurança', 'DB', 8),
  ('Instalação/Configuração', 'DB', 9);

-- Insert initial APP categories
INSERT INTO public.ticket_categories (name, segment, sort_order) VALUES
  ('Erro de Interface', 'APP', 1),
  ('Integração', 'APP', 2),
  ('Relatórios', 'APP', 3),
  ('Performance', 'APP', 4),
  ('Login/Autenticação', 'APP', 5),
  ('Importação/Exportação', 'APP', 6),
  ('Configuração', 'APP', 7),
  ('Funcionalidade', 'APP', 8);