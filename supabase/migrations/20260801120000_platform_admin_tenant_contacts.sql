-- Migration 023 do plano de refatoração multi-tenant.
-- Função RPC pro Super Admin ver nome/email/telefone dos usuários
-- vinculados a um tenant (owner/tenant_admin/analistas) — pra poder
-- entrar em contato a partir da tela /platform/tenants/:id.
--
-- Por que via função em vez de RLS: `profiles` não tem bypass de
-- platform admin (só `auth.uid() = id`) e `auth.users` (onde mora o
-- email) nunca é exposta via API, com ou sem RLS. Abrir RLS geral em
-- `profiles` pra platform_admin seria dado demais (exporia telefone/nome
-- de QUALQUER usuário de QUALQUER tenant pra qualquer leitura futura da
-- tabela). Esta função é estreita de propósito: só devolve os 3 campos
-- de contato, só de quem está em tenant_users do tenant pedido, só se
-- is_platform_admin() for true.
--
-- Mesma justificativa da exceção de tenant_users na Regra crítica #1 do
-- CLAUDE.md: "quem tem acesso a qual tenant e com qual papel" é dado
-- estrutural/administrativo, não dado operacional do negócio do tenant.
--
-- Rollback: supabase/migrations_rollback/20260801120000_platform_admin_tenant_contacts_down.sql

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
