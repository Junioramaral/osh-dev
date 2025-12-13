-- Restore super_admin role for suporte@otimizzo.com
-- First delete any existing roles to avoid duplicates
DELETE FROM public.user_roles 
WHERE user_id = '87829f25-f604-4dc6-986f-708d246c2071';

-- Insert the correct role
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES (
  '87829f25-f604-4dc6-986f-708d246c2071',
  'super_admin',
  '00000000-0000-0000-0000-000000000001'
);