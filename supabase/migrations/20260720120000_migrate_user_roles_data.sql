-- Migration 019 do plano de refatoração multi-tenant.
-- Migra os dados de public.user_roles para platform_admins, tenant_users
-- e client_users. Não toca em user_roles — ela fica intocada, é a fonte
-- de leitura atual do app. O cutover (app passar a ler das tabelas
-- novas) é um passo futuro, fora do escopo desta migration.
--
-- Sem ON CONFLICT DO NOTHING em nenhum INSERT: a auditoria read-only
-- prévia confirmou dados limpos (zero user_id em mais de um tenant/client
-- por role, zero super_admin acumulando outra role, zero tenant_id
-- órfão com referência quebrada). Qualquer violação de UNIQUE aqui seria
-- um erro real — dado mudou entre a auditoria e esta aplicação — e deve
-- estourar erro, não ser silenciosamente ignorado.
--
-- EXCLUSÃO DOCUMENTADA: user_id 24a0a460-6405-47df-92d6-cfc88c13d3ae
-- (role='user', tenant_id NULL) fica de fora do INSERT de client_users
-- de propósito. Investigado e confirmado como conta de teste da fase
-- Lovable: criada em 2025-11-10, login único no dia do cadastro, zero
-- atividade em tickets/comentários/logs desde então. Permanece em
-- user_roles, intocada, sem entrar em client_users.
--
-- Rollback: supabase/migrations_rollback/20260720120000_migrate_user_roles_data_down.sql

-- 1. super_admin → platform_admins
INSERT INTO public.platform_admins (user_id)
SELECT user_id FROM public.user_roles WHERE role = 'super_admin';

-- 2. tenant_admin/analyst_db/analyst_app → tenant_users
-- Todos amarrados ao tenant Otimizzo (é o único tenant que existe hoje,
-- e essas roles são equipe interna, não vinculada a um client específico)
INSERT INTO public.tenant_users (tenant_id, user_id, role)
SELECT
  (SELECT id FROM public.tenants WHERE is_platform_owner = true),
  user_id,
  role
FROM public.user_roles
WHERE role IN ('tenant_admin', 'analyst_db', 'analyst_app');

-- 3. user → client_users
-- Aqui user_roles.tenant_id já é literalmente o id do client (é assim
-- que a tabela sempre funcionou) — mapeamento direto, sem tenant
-- intermediário. tenant_id IS NOT NULL exclui de propósito o user_id
-- 24a0a460-6405-47df-92d6-cfc88c13d3ae (ver nota no topo do arquivo).
INSERT INTO public.client_users (client_id, user_id)
SELECT tenant_id, user_id
FROM public.user_roles
WHERE role = 'user' AND tenant_id IS NOT NULL;

-- Verificação: compara contagens inseridas com a baseline da auditoria
-- (super_admin=1, tenant_admin/analyst_db/analyst_app=1, user=10 — 11
-- originais menos o user_id 24a0a460-... excluído de propósito). Só
-- deixa a discrepância visível no output — não trava a transação.
DO $$
DECLARE
  v_platform_admins_count integer;
  v_tenant_users_count integer;
  v_client_users_count integer;
BEGIN
  SELECT COUNT(*) INTO v_platform_admins_count FROM public.platform_admins;
  SELECT COUNT(*) INTO v_tenant_users_count FROM public.tenant_users;
  SELECT COUNT(*) INTO v_client_users_count FROM public.client_users;

  RAISE NOTICE 'platform_admins: % linhas (esperado da auditoria: 1)', v_platform_admins_count;
  RAISE NOTICE 'tenant_users: % linhas (esperado da auditoria: 1)', v_tenant_users_count;
  RAISE NOTICE 'client_users: % linhas (esperado da auditoria: 10, apos exclusao documentada)', v_client_users_count;

  IF v_platform_admins_count <> 1 THEN
    RAISE NOTICE 'DISCREPÂNCIA em platform_admins: esperado 1, obtido %', v_platform_admins_count;
  END IF;

  IF v_tenant_users_count <> 1 THEN
    RAISE NOTICE 'DISCREPÂNCIA em tenant_users: esperado 1, obtido %', v_tenant_users_count;
  END IF;

  IF v_client_users_count <> 10 THEN
    RAISE NOTICE 'DISCREPÂNCIA em client_users: esperado 10, obtido %', v_client_users_count;
  END IF;
END;
$$;
