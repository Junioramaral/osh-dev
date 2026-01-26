-- Alterar coluna segment de enum para TEXT
ALTER TABLE public.teams 
ALTER COLUMN segment TYPE TEXT 
USING segment::TEXT;