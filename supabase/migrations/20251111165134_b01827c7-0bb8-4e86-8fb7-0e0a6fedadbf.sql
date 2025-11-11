-- Assign super_admin role to suporte@otimizzo.com (if not exists)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'suporte@otimizzo.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Insert role only if doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = v_user_id AND role = 'super_admin'::app_role
    ) THEN
      INSERT INTO public.user_roles (user_id, role, tenant_id)
      VALUES (v_user_id, 'super_admin'::app_role, '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;
    
    -- Update profile to link to Otimizzo tenant
    UPDATE public.profiles
    SET client_id = '00000000-0000-0000-0000-000000000001'
    WHERE id = v_user_id;
  END IF;
END $$;