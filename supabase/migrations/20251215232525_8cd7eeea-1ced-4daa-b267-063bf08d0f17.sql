-- Drop existing RLS policies on client_contacts
DROP POLICY IF EXISTS "Client view own contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Otimizzo view contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Super admins manage contacts" ON public.client_contacts;

-- Recreate policies with explicit authentication checks
-- Super admins can manage all contacts (requires authentication)
CREATE POLICY "Super admins manage contacts"
ON public.client_contacts
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND is_super_admin(auth.uid()))
WITH CHECK (auth.uid() IS NOT NULL AND is_super_admin(auth.uid()));

-- Otimizzo users can view all contacts (requires authentication)
CREATE POLICY "Otimizzo view contacts"
ON public.client_contacts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_otimizzo_user(auth.uid()));

-- Client users can only view contacts from their own organization (requires authentication)
CREATE POLICY "Client view own contacts"
ON public.client_contacts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT is_super_admin(auth.uid()) 
  AND NOT is_otimizzo_user(auth.uid()) 
  AND client_id = get_user_tenant_id(auth.uid())
);