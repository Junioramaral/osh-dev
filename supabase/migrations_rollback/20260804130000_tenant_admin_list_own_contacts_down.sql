DROP FUNCTION IF EXISTS public.list_tenant_contacts(uuid);

CREATE OR REPLACE FUNCTION public.platform_admin_list_tenant_contacts(p_tenant_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  role text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    tu.user_id,
    p.full_name,
    u.email,
    p.phone,
    tu.role
  FROM public.tenant_users tu
  JOIN auth.users u ON u.id = tu.user_id
  LEFT JOIN public.profiles p ON p.id = tu.user_id
  WHERE tu.tenant_id = p_tenant_id
    AND is_platform_admin();
$$;
