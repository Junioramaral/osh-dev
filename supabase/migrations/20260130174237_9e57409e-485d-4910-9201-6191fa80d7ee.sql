-- Adicionar coluna is_overtime na tabela client_projects
ALTER TABLE public.client_projects 
ADD COLUMN is_overtime boolean DEFAULT false;

COMMENT ON COLUMN public.client_projects.is_overtime IS 
'Indica se o projeto deve ser executado fora do horario comercial (hora-extra)';