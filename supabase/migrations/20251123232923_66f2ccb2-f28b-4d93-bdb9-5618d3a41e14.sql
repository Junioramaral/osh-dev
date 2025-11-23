-- Criar bucket para tickets com isolamento por tenant
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tickets',
  'tickets',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
);

-- Criar função helper no public schema para validar tenant do upload
CREATE OR REPLACE FUNCTION public.validate_ticket_upload_path(
  _path text,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (split_part(_path, '/', 1))::uuid = get_user_tenant_id(_user_id)
    OR is_super_admin(_user_id)
    OR is_otimizzo_user(_user_id);
$$;

COMMENT ON FUNCTION public.validate_ticket_upload_path IS 'Valida se o usuário pode fazer upload no path especificado (tenant_id/ticket_number/)';
