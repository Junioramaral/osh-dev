
-- Fix 1: Replace overly broad "Otimizzo users can view all profiles" with scoped access
DROP POLICY IF EXISTS "Otimizzo users can view all profiles" ON public.profiles;

CREATE POLICY "Otimizzo view work-related profiles" 
ON public.profiles FOR SELECT
USING (
  is_otimizzo_user(auth.uid()) AND (
    -- View other Otimizzo staff (for collaboration and ticket assignment)
    client_id = '00000000-0000-0000-0000-000000000001'
    OR
    -- View profiles of clients that have tickets (for support purposes)
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.client_id = profiles.client_id
    )
  )
);

-- Fix 2: Create a security definer function to return only non-sensitive analyst info for clients
-- This replaces direct profile access with a safe subset of data
CREATE OR REPLACE FUNCTION public.get_analyst_public_info(_analyst_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, team_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.team_id
  FROM public.profiles p
  WHERE p.id = _analyst_id;
$$;
