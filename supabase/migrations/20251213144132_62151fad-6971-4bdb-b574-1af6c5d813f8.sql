-- Create database_engines table
CREATE TABLE public.database_engines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.database_engines ENABLE ROW LEVEL SECURITY;

-- Everyone can view active engines
CREATE POLICY "View active engines"
  ON public.database_engines FOR SELECT
  USING (is_active = true OR is_super_admin(auth.uid()));

-- Super admins can manage engines
CREATE POLICY "Super admins manage engines"
  ON public.database_engines FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Migrate existing hardcoded engines
INSERT INTO public.database_engines (name, sort_order) VALUES 
  ('PostgreSQL', 1),
  ('MySQL', 2),
  ('SQL Server', 3),
  ('Oracle', 4),
  ('MongoDB', 5);

-- Add columns to application_products for consistency
ALTER TABLE public.application_products 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Drop existing policy if exists and create management policy
DROP POLICY IF EXISTS "Super admins manage products" ON public.application_products;

CREATE POLICY "Super admins manage products"
  ON public.application_products FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));