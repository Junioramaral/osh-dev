-- Make tickets bucket private (secure files)
UPDATE storage.buckets 
SET public = false 
WHERE name = 'tickets';

-- Add RLS policy for viewing ticket files (authenticated users with access)
CREATE POLICY "Authenticated users can view ticket files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tickets' AND
  (
    is_super_admin(auth.uid()) OR
    is_otimizzo_user(auth.uid()) OR
    (storage.foldername(name))[1]::uuid = get_user_tenant_id(auth.uid())
  )
);

-- Keep existing upload policy but ensure proper access
DROP POLICY IF EXISTS "ticket_upload_check" ON storage.objects;

CREATE POLICY "Users can upload to their tenant tickets folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tickets' AND
  (
    is_super_admin(auth.uid()) OR
    is_otimizzo_user(auth.uid()) OR
    (storage.foldername(name))[1]::uuid = get_user_tenant_id(auth.uid())
  )
);

-- Fix SLA notifications - remove overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON sla_notifications;

-- Create more restrictive policy (Otimizzo users/super admins only)
CREATE POLICY "Otimizzo can insert sla notifications"
ON sla_notifications
FOR INSERT
TO authenticated
WITH CHECK (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));