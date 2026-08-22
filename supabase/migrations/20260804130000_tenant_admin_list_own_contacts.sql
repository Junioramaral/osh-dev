-- Hoje só o Super Admin consegue listar (e, via invite-tenant-user,
-- convidar) o time de um tenant, a partir de /platform/tenants/:id.
-- Isso significa que um tenant novo (ex: copawoke) não tem como montar
-- sua própria equipe de analistas sem depender da Otimizzo pra cada
-- convite — inviável assim que existir mais de um tenant real.
--
-- Esta migration permite que o próprio tenant_admin também liste o time
-- do seu tenant (renomeando a function pra refletir isso). A permissão
-- de convidar (invite-tenant-user) é ajustada separadamente na edge
-- function, fora de migrations.
--
-- Rollback: supabase/migrations_rollback/20260804130000_tenant_admin_list_own_contacts_down.sql

DROP FUNCTION IF EXISTS public.platform_admin_list_tenant_contacts(uuid);

CREATE OR REPLACE FUNCTION public.list_tenant_contacts(p_tenant_id uuid)
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
    AND (is_platform_admin() OR (is_tenant_admin() AND p_tenant_id = get_current_tenant_id()));
$$;
