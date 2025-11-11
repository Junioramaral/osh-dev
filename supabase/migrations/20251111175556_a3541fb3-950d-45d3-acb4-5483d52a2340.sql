-- Fix infinite recursion in user_roles RLS policies

-- 1. Drop and recreate the recursive policy using is_super_admin function
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 2. Ensure the SELECT policy for users to view their own roles exists
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- 3. Ensure suporte@otimizzo.com has super_admin role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT u.id, 'super_admin'::app_role, null
FROM auth.users u
WHERE u.email = 'suporte@otimizzo.com'
AND NOT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = u.id AND ur.role = 'super_admin'
);