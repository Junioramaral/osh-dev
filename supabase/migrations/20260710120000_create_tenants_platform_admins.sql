-- Migration 015 do plano de refatoração multi-tenant.
-- Cria as tabelas base `tenants` e `platform_admins`. Não altera nenhuma
-- tabela existente.
--
-- RLS habilitado em ambas, sem nenhuma policy ainda: tabela com RLS
-- habilitado e zero policies fica bloqueada por padrão para anon/authenticated
-- (só service_role acessa). As policies e as funções helper
-- get_current_tenant_id()/is_platform_admin() entram na migration 018.
--
-- Rollback: supabase/migrations_rollback/20260710120000_create_tenants_platform_admins_down.sql

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_platform_owner boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
