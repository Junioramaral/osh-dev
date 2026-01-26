-- Create segments table for dynamic segment configuration
CREATE TABLE public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Layers',
  color TEXT DEFAULT 'gray',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_segments_updated_at
BEFORE UPDATE ON public.segments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active segments"
ON public.segments FOR SELECT
USING (is_active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage segments"
ON public.segments FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Viewers can view all segments
CREATE POLICY "Viewers can view all segments"
ON public.segments FOR SELECT
USING (is_viewer(auth.uid()));

-- Insert initial data matching existing enum values
INSERT INTO public.segments (code, display_name, description, icon, color, sort_order)
VALUES 
  ('DB', 'Banco de Dados', 'Suporte a bancos de dados e infraestrutura de dados', 'Database', 'blue', 1),
  ('APP', 'Aplicação', 'Suporte a aplicações e sistemas', 'Package', 'green', 2);