-- Migration 018a do plano de refatoração multi-tenant.
-- Cria as 4 funções helper usadas por toda policy RLS futura. Não cria
-- nenhuma policy nessa migration (escopo da 018b em diante) — essas
-- funções, sozinhas, não mudam nenhum comportamento de acesso ainda.
--
-- SET search_path = public em toda função SECURITY DEFINER: obrigatório,
-- não opcional — evita que um usuário mal-intencionado manipule o
-- search_path da sessão pra fazer a função ler de uma tabela diferente
-- da pretendida.
--
-- Sem LIMIT em nenhuma query: o passo 0 abaixo garante no máximo 1 linha
-- por user_id em tenant_users/client_users via UNIQUE constraint. Um
-- LIMIT esconderia um erro real caso essa garantia falhe por algum
-- motivo futuro — sem LIMIT, uma segunda linha inesperada estoura erro
-- em vez de silenciosamente devolver um resultado arbitrário.
--
-- Rollback: supabase/migrations_rollback/20260715120000_create_helper_functions_down.sql

-- PASSO 0: pré-requisito de integridade para get_current_tenant_id() e
-- get_current_client_id() serem confiáveis — cada usuário pertence a no
-- máximo um tenant e a no máximo um client.
ALTER TABLE public.tenant_users ADD CONSTRAINT tenant_users_user_id_key UNIQUE (user_id);
ALTER TABLE public.client_users ADD CONSTRAINT client_users_user_id_key UNIQUE (user_id);

-- PASSO 1: as 4 funções helper.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_client_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT client_id FROM public.client_users WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid() AND role = 'tenant_admin'
  );
$$;
