-- Migration 016 do plano de refatoração multi-tenant.
-- Cria as tabelas `tenant_users` e `client_users`, que vão receber os
-- dados hoje espalhados em `user_roles` na migration 019. Não toca em
-- `user_roles`, `tickets` nem nenhuma outra tabela existente.
--
-- RLS habilitado em ambas, sem nenhuma policy ainda: tabela com RLS
-- habilitado e zero policies fica bloqueada por padrão para anon/authenticated
-- (só service_role acessa). As policies entram na migration 018.
--
-- ON DELETE CASCADE em tenant_id/client_id/user_id: se o tenant, o client
-- ou o usuário do Auth for removido, só o vínculo desaparece — não deixa
-- linha órfã e não é uma cascata destrutiva de dado real (a entidade em si
-- não é afetada por essas FKs).
--
-- Rollback: supabase/migrations_rollback/20260714120000_create_tenant_client_users_down.sql

CREATE TABLE public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('tenant_admin', 'analyst_db', 'analyst_app')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON public.tenant_users(user_id);

CREATE TABLE public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);

ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_users_client_id ON public.client_users(client_id);
CREATE INDEX idx_client_users_user_id ON public.client_users(user_id);
