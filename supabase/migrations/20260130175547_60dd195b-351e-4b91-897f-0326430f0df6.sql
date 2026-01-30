-- Add new columns to ticket_time_logs for date, time range, and project
ALTER TABLE public.ticket_time_logs 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.client_projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS work_date date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS start_time time NOT NULL DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS end_time time NOT NULL DEFAULT '18:00';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_logs_project ON public.ticket_time_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_work_date ON public.ticket_time_logs(work_date);

-- Add comment for documentation
COMMENT ON COLUMN public.ticket_time_logs.project_id IS 'Reference to the client project this work was performed on';
COMMENT ON COLUMN public.ticket_time_logs.work_date IS 'The date when the work was performed';
COMMENT ON COLUMN public.ticket_time_logs.start_time IS 'Start time of work (e.g., 08:00)';
COMMENT ON COLUMN public.ticket_time_logs.end_time IS 'End time of work (e.g., 18:30)';