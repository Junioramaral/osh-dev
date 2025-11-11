-- Add domain column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS domain TEXT;

-- Create index for domain lookups
CREATE INDEX IF NOT EXISTS idx_clients_domain ON public.clients(domain);

-- Add unique constraint to ensure one domain per tenant
ALTER TABLE public.clients 
ADD CONSTRAINT unique_domain UNIQUE (domain);

-- Update Otimizzo tenant with its domain
UPDATE public.clients 
SET domain = 'otimizzo.com'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Function to extract domain from email
CREATE OR REPLACE FUNCTION public.extract_domain_from_email(_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(SPLIT_PART(_email, '@', 2))
$$;

-- Function to find tenant by email domain
CREATE OR REPLACE FUNCTION public.get_tenant_by_domain(_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.clients
  WHERE domain = public.extract_domain_from_email(_email)
    AND is_active = true
  LIMIT 1
$$;

-- Update handle_new_user trigger to auto-map users to tenants
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _default_role app_role;
BEGIN
  -- Extract tenant_id based on email domain
  _tenant_id := public.get_tenant_by_domain(NEW.email);
  
  -- Define default role from metadata or 'user'
  _default_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'user'::app_role
  );
  
  -- Create profile with automatic tenant_id
  INSERT INTO public.profiles (id, full_name, client_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _tenant_id
  );
  
  -- Create user_roles entry with mapped tenant
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (
    NEW.id,
    _default_role,
    _tenant_id
  );
  
  RETURN NEW;
END;
$$;