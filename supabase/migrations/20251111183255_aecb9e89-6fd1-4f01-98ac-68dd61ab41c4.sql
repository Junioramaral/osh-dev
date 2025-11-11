-- Add is_active column to profiles table for soft delete
ALTER TABLE public.profiles 
ADD COLUMN is_active boolean DEFAULT true;

-- Create index for better performance on is_active queries
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Update RLS policies to consider is_active status
-- Users can only view active profiles when querying
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Super admins can view all profiles (active or not)
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Tenant admins can view profiles from their tenant
CREATE POLICY "Tenant admins can view tenant profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) 
  AND client_id = get_user_tenant_id(auth.uid())
);

-- Super admins can manage all profiles
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Tenant admins can update profiles from their tenant
CREATE POLICY "Tenant admins can manage tenant profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) 
  AND client_id = get_user_tenant_id(auth.uid())
);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_active IS 'Soft delete flag - false means user is deactivated but data is preserved';