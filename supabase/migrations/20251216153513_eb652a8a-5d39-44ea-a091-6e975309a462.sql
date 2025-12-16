-- Add receive_monthly_report column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS receive_monthly_report boolean DEFAULT false;

COMMENT ON COLUMN public.clients.receive_monthly_report IS 
'Indica se o cliente deve receber o relatório mensal automaticamente por email';

-- Create table to log report sends
CREATE TABLE IF NOT EXISTS public.report_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'monthly',
  month integer NOT NULL,
  year integer NOT NULL,
  recipients text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_send_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_send_logs
CREATE POLICY "Otimizzo can view report logs" ON public.report_send_logs
  FOR SELECT USING (is_otimizzo_user(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "System can insert report logs" ON public.report_send_logs
  FOR INSERT WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_send_logs_client_id ON public.report_send_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_report_send_logs_sent_at ON public.report_send_logs(sent_at DESC);