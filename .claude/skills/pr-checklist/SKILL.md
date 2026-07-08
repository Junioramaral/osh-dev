# Skill: pr-checklist

## Objetivo
Checklist padrão antes de abrir ou aprovar um Pull Request no repositório
`osh-dev`, garantindo consistência com o fluxo GitFlow-lite e com as
regras de multi-tenant do projeto.

## Quando usar esta skill
- Antes de abrir um PR de `feature/xxx` → `dev`
- Antes de promover `dev` → `main`
- Ao revisar um PR de outra pessoa/agente

## Checklist geral
- [ ] Branch segue o padrão `feature/nome-curto` (ou `fix/nome-curto`)
- [ ] Commits com mensagens claras (não "fix", "wip", "ajustes")
- [ ] `npm run build` roda sem erro
- [ ] Nenhum `console.log` de debug esquecido
- [ ] Nenhuma chave/segredo commitado (`.env*` nunca deve aparecer no diff)
- [ ] `package-lock.json` sincronizado com `package.json`

## Checklist específico — mudanças de banco (Supabase)
- [ ] Toda migration nova passou pela skill `migration-review`
- [ ] Toda policy RLS nova passou pela skill `rls-policy`
- [ ] Migration testada em OSH-DEV antes do PR
- [ ] Se envolve `tenant_id`/multi-tenant, passou pela skill `tenant-audit`

## Checklist específico — mudanças de frontend
- [ ] Nenhuma query Supabase nova filtra só por `client_id` sem também
      filtrar por `tenant_id` (ver tenant-audit)
- [ ] Rotas novas em `/app/admin/*` ou `/platform/*` têm proteção de
      role/isSuperAdmin implementada, não só escondidas na UI
- [ ] Componentes seguem convenção: PascalCase para componentes,
      camelCase para hooks/utils
- [ ] TypeScript sem `any` não justificado

## Checklist de descrição do PR
- [ ] O que mudou (resumo de 2-3 linhas)
- [ ] Por que mudou (contexto/motivação)
- [ ] Como testar localmente
- [ ] Screenshots se envolver UI
- [ ] Marcado se precisa de migration manual em produção após merge

## Antes de promover dev → main
- [ ] Testado em OSH-DEV por pelo menos um ciclo completo
- [ ] Nenhuma migration pendente sem aplicar
- [ ] Rollback plan definido se a mudança for de alto risco (ex: RLS,
      schema de tenant)
