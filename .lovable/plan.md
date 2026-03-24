
# Documentação RBAC do Sistema Otimizzo

## O que será gerado

Um diagrama Mermaid interativo com o fluxo RBAC completo + documento de referência detalhado, ambos baseados na análise do código atual.

## Conteúdo da documentação

### Roles existentes (da enum `app_role` + `viewer`)
| Role | Label | Descrição | Status no sistema |
|------|-------|-----------|-------------------|
| `super_admin` | Super Admin | Acesso total | Implementado (RLS ALL + UI completa) |
| `tenant_admin` | Tenant Admin | Admin do próprio tenant | Implementado (DELETE tickets, gerencia usuários do tenant) |
| `viewer` | Auditor | Leitura total do próprio tenant | Implementado (SELECT com filtro tenant) |
| `analyst_db` | Analista DB | Atende tickets DB | Implementado (filtro por filas) |
| `analyst_app` | Analista APP | Atende tickets APP | Implementado (filtro por filas) |
| `user` | Usuário | Acesso básico | Implementado (cria/vê próprios tickets) |

### Diagrama incluirá:
1. Hierarquia de roles
2. Menus visíveis por role (operacionais + admin)
3. Permissões CRUD por tabela
4. Isolamento de dados (tenant boundary)
5. Flags especiais (`isOtimizzoUser` via tenant_id específico)

## Artefatos a criar

1. **`/mnt/documents/RBAC_Otimizzo.mmd`** — Diagrama Mermaid com fluxo visual de permissões
2. **`/mnt/documents/RBAC_Documentacao.md`** — Documento markdown completo com todas as permissões mapeadas

## Implementação

- Analisar `AppLayout.tsx` (menus), `AuthContext.tsx` (flags), RLS policies (banco), e `RoleCheckboxGroup.tsx` (roles disponíveis)
- Mapear cada role → menus visíveis, ações permitidas (CRUD), e escopo de dados
- Gerar ambos artefatos com dados reais do código
