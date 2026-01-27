-- Add columns for SLA acknowledgment system
ALTER TABLE public.sla_notifications
ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN acknowledged_by UUID REFERENCES auth.users(id),
ADD COLUMN notification_level INTEGER DEFAULT 1,
ADD COLUMN acknowledgment_token UUID DEFAULT gen_random_uuid();

-- Create index for faster lookups on pending acknowledgments
CREATE INDEX idx_sla_notifications_pending_ack 
ON public.sla_notifications(alert_type, acknowledged_at) 
WHERE acknowledged_at IS NULL;

-- Allow Otimizzo/Super Admin to update acknowledgment fields
CREATE POLICY "Otimizzo can acknowledge notifications"
ON public.sla_notifications FOR UPDATE
USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()))
WITH CHECK (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));