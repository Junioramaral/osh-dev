-- Fix RLS policy on ticket_comments to prevent internal comment exposure
-- Internal comments should only be visible to analysts and admins

DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON public.ticket_comments;

CREATE POLICY "Users can view comments on accessible tickets"
ON public.ticket_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM tickets t
    WHERE t.id = ticket_comments.ticket_id
  )
  AND (
    -- Non-internal comments visible to all with ticket access
    NOT is_internal
    OR
    -- Internal comments only visible to analysts and admins
    has_role(auth.uid(), 'analyst_db'::app_role)
    OR has_role(auth.uid(), 'analyst_app'::app_role)
    OR has_role(auth.uid(), 'tenant_admin'::app_role)
    OR is_super_admin(auth.uid())
  )
);