-- Add feedback_token and csat_submitted_at columns to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS feedback_token uuid DEFAULT gen_random_uuid();
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS csat_submitted_at timestamp with time zone;

-- Create index for feedback token lookups
CREATE INDEX IF NOT EXISTS idx_tickets_feedback_token ON public.tickets(feedback_token);