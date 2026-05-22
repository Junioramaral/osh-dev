-- Atualizar handle_new_user para também gravar o phone vindo do user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _default_role app_role;
  _phone TEXT;
BEGIN
  _tenant_id := public.get_tenant_by_domain(NEW.email);

  _default_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'user'::app_role
  );

  _phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');

  INSERT INTO public.profiles (id, full_name, client_id, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _tenant_id,
    _phone
  );

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, _default_role, _tenant_id);

  RETURN NEW;
END;
$$;