ALTER TABLE public.rfc_steps ADD COLUMN started_at timestamptz;
ALTER TABLE public.rfc_steps ADD COLUMN started_by uuid;