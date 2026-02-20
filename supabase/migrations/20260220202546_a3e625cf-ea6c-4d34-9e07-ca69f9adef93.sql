ALTER TABLE public.rfc_steps
  ADD COLUMN IF NOT EXISTS procedimento text,
  ADD COLUMN IF NOT EXISTS scripts text;