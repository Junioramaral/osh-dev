-- Migration 019b do plano de refatoração multi-tenant.
-- Roda antes da 020a. Dá ao usuário com role = 'super_admin' em
-- user_roles também uma linha em tenant_users, papel tenant_admin,
-- vinculada ao tenant Otimizzo — para que ele continue operando os
-- clients da Otimizzo no dia a dia depois que a 020a remover o bypass
-- de is_platform_admin() em clients.
--
-- Essa pessoa passa a ter DUAS entradas de identidade no sistema: uma
-- em platform_admins (papel de Super Admin, já existe desde a 019) e
-- agora uma em tenant_users como tenant_admin do tenant Otimizzo (papel
-- operacional). São coisas distintas e ambas corretas — não é
-- duplicidade indevida, é a mesma pessoa com dois chapéus. Ver CLAUDE.md
-- Regra crítica #2 (otimizzo.com tem dupla identidade).
--
-- Pré-checagem read-only feita antes desta migration: o user_id de
-- platform_admins não tinha nenhuma linha em tenant_users ainda —
-- INSERT não colide com tenant_users_user_id_key nem com o UNIQUE
-- (tenant_id, user_id) da 016.
--
-- Rollback: supabase/migrations_rollback/20260720180000_grant_super_admin_tenant_admin_down.sql

INSERT INTO public.tenant_users (tenant_id, user_id, role)
SELECT
  (SELECT id FROM public.tenants WHERE is_platform_owner = true),
  ur.user_id,
  'tenant_admin'
FROM public.user_roles ur
WHERE ur.role = 'super_admin';
