-- Create RLS policy to allow clients to view analysts assigned to their tickets
-- This fixes the issue where clients see "Analyst not assigned" even when an analyst is assigned
CREATE POLICY "Client can view ticket analysts"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.analyst_id = profiles.id
    AND t.client_id = get_user_tenant_id(auth.uid())
  )
);