-- First drop the policy that depends on profiles.role
DROP POLICY IF EXISTS "Users can view FAQ articles" ON public.faq_articles;

-- Remove the role column from profiles table for security
-- Roles should ONLY be managed via user_roles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Recreate the policy using user_roles instead
CREATE POLICY "Users can view FAQ articles" 
ON public.faq_articles 
FOR SELECT 
USING (
  (status = 'publicado'::text) 
  OR (
    has_role(auth.uid(), 'analyst_db'::app_role) 
    OR has_role(auth.uid(), 'analyst_app'::app_role) 
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR is_super_admin(auth.uid())
  )
);