-- Migration 020h do plano de refatoração multi-tenant.
-- RLS de application_products.
--
-- Catálogo global de verdade (confirmado pela auditoria: zero
-- client_id/tenant_id, nenhuma FK para clients/tenants) — continua
-- visível para qualquer tenant, sem isolamento, mas agora exigindo
-- login. Não existe tela pública sem autenticação no OSH hoje que
-- dependa deste catálogo (confirmado com o usuário).
--
-- BYPASS DE is_platform_admin() NESTA TABELA — DISTINÇÃO EXPLÍCITA da
-- Regra crítica #1 do CLAUDE.md: a lista fechada de exceções lá (tenants,
-- platform_admins, tenant_users) é sobre tabelas de ESTRUTURA de
-- tenant/plataforma. application_products é diferente: é um catálogo de
-- PRODUTO da plataforma, sem noção de tenant nenhuma — não existe
-- "tenant_admin gerenciando isso" como alternativa, porque nenhum
-- tenant é dono do catálogo, só a plataforma. O bypass aqui é
-- apropriado por essa razão específica, não é uma extensão da lista
-- fechada — não usar esta migration como precedente para bypassar
-- is_platform_admin() em outra tabela sem a mesma justificativa
-- (ausência total de conceito de tenant no domínio da tabela).
--
-- Rollback: supabase/migrations_rollback/20260728120000_rls_application_products_down.sql

DROP POLICY IF EXISTS "Everyone can view application products" ON public.application_products;
DROP POLICY IF EXISTS "Super admins manage products" ON public.application_products;

CREATE POLICY "application_products_select_authenticated"
  ON public.application_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "application_products_manage_platform_admin"
  ON public.application_products
  FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
