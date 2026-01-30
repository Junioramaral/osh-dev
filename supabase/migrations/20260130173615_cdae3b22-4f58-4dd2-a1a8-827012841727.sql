-- Criar tabela de projetos do cliente
CREATE TABLE IF NOT EXISTS public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices
CREATE INDEX idx_client_projects_client_id ON public.client_projects(client_id);

-- RLS
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (seguindo o padrão de client_contacts)
CREATE POLICY "Client view own projects"
  ON public.client_projects FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND NOT is_super_admin(auth.uid())
    AND NOT is_otimizzo_user(auth.uid())
    AND client_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Otimizzo view projects"
  ON public.client_projects FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_otimizzo_user(auth.uid()));

CREATE POLICY "Super admins manage projects"
  ON public.client_projects FOR ALL
  USING (auth.uid() IS NOT NULL AND is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND is_super_admin(auth.uid()));

CREATE POLICY "Viewers can view all projects"
  ON public.client_projects FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_viewer(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_client_projects_updated_at
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();