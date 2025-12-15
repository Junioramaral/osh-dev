-- Create queues table for team queue management
CREATE TABLE public.queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;

-- Super admins can manage queues
CREATE POLICY "Super admins manage queues" ON public.queues
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- All authenticated users can view active queues
CREATE POLICY "View active queues" ON public.queues
  FOR SELECT USING ((is_active = true) OR is_super_admin(auth.uid()));

-- Insert initial queues
INSERT INTO public.queues (name, description, sort_order) VALUES
  ('Oracle OCI', 'Fila para atendimento Oracle Cloud Infrastructure', 1),
  ('Oracle', 'Fila para atendimento Oracle Database', 2),
  ('PostgreSQL', 'Fila para atendimento PostgreSQL', 3),
  ('MySQL', 'Fila para atendimento MySQL', 4),
  ('SQLServer', 'Fila para atendimento SQL Server', 5),
  ('MongoDB', 'Fila para atendimento MongoDB', 6),
  ('SysOp', 'Fila para atendimento de Operações de Sistema', 7),
  ('Aplicações', 'Fila para atendimento de Aplicações', 8);