# OSH — Fluxo Dev → Produção e Versionamento

> Documento de referência para promover mudanças de código + banco do ambiente
> **OSH-DEV** (repo `osh-dev` + Supabase OSH-DEV) para o ambiente
> **OSH produção** (repo `osh` + Supabase OSH).
> Sugestão: manter este arquivo em `docs/DEPLOY_WORKFLOW.md` no repo, ao lado do `CLAUDE.md`.

---

## 0. Regra de ouro

**Nenhuma alteração de schema é aplicada direto em produção.**
Toda mudança nasce em OSH-DEV, é testada lá, vira um artefato versionado (script SQL + diff de código), e só depois é replicada em OSH-PROD de forma controlada e revisável.

Antes de qualquer sessão de trabalho no Claude Code, confirmar:
- [ ] Project ref do Supabase conectado é o do **OSH-DEV** (nunca o de produção)
- [ ] Branch git ativa é uma branch de feature, não `main`/`prod`

---

## 1. Separação de ambientes

| | OSH-DEV | OSH (Produção) |
|---|---|---|
| Repo git | `Junioramaral/osh-dev` | `Junioramaral/osh` (ou branch `main` protegida) |
| Projeto Supabase | OSH-DEV | OSH |
| Quem acessa via MCP/CLI no dia a dia | Você, Claude Code | Ninguém em modo de escrita direta |
| Dados | Fictícios / anonimizados | Reais, sensíveis |

Se ainda não existir, vale criar uma proteção de branch no GitHub (`main` do repo de produção exige PR + review, sem push direto).

---

## 2. Fluxo de uma mudança (ex: refatoração multi-tenant)

### Fase A — Design e implementação em OSH-DEV
1. Criar branch de feature (`feature/multitenant-refactor-v2`) a partir da `main` do `osh-dev`.
2. Rodar a skill `tenant-audit` para mapear o estado atual antes de mexer (baseline).
3. Implementar as mudanças de código (frontend/hooks/contexto) e, em paralelo, escrever o(s) script(s) SQL de migration numerados sequencialmente, continuando a numeração já usada (ex: `015_...sql`, `016_...sql`).
4. Cada migration deve ser:
   - **Idempotente** quando possível (`IF NOT EXISTS`, `IF EXISTS`) — reexecutar sem quebrar.
   - **Reversível** — escrever também o script de rollback (`015_down.sql`) junto com o de aplicação (`015_up.sql`).
   - **Pequena e isolada** — uma responsabilidade por arquivo, mais fácil de revisar e reverter.

### Fase B — Validação em OSH-DEV
5. Aplicar a migration no banco OSH-DEV e testar a aplicação ponta a ponta.
6. Rodar a skill `rls-policy` para garantir que nenhuma policy ficou permissiva demais ou quebrou o isolamento entre tenants.
7. Rodar a skill `tenant-audit` de novo (pós-mudança) e comparar com a baseline da Fase A — nenhum tenant existente pode perder acesso a dados que já tinha, nem ganhar acesso indevido a dados de outro tenant.
8. Teste específico de regressão multi-tenant:
   - [ ] Super Admin (otimizzo.com) continua sem bypass de RLS em tabelas operacionais
   - [ ] Super Admin continua com bypass apenas em `tenants` e `platform_admins`
   - [ ] otimizzo.com continua funcionando corretamente como tenant normal (`is_platform_owner = true`)
   - [ ] Um tenant comum não enxerga dados de outro tenant em nenhuma tela

### Fase C — Revisão
9. Abrir PR no `osh-dev` com o diff de código + os scripts de migration anexados.
10. Rodar a skill `pr-checklist` sobre o PR.
11. Merge na `main` do `osh-dev` só depois do checklist limpo.

### Fase D — Pacote de release
12. Consolidar tudo que vai para produção nesta promoção:
    - Lista ordenada dos scripts `.sql` novos (up + down de cada um)
    - Diff de código relevante (ou o commit range)
    - Changelog em linguagem simples (o que mudou, por que, risco)
13. Criar uma tag de release no git (ex: `v1.5.0`) — ver seção de versionamento abaixo.

### Fase E — Aplicação em Produção (OSH)
14. **Backup do banco OSH** imediatamente antes (backup pontual, não confiar só no backup automático diário).
15. Confirmar mais uma vez que a conexão ativa (MCP/CLI) aponta para o projeto **OSH**, e não mais para OSH-DEV — inverter o mesmo cuidado da Fase A.
16. Aplicar os scripts de migration em ordem, um por vez, validando entre cada um se possível.
17. Rodar suíte de smoke tests em produção (login, listagem de tenants, RLS básico).
18. Se algo falhar: aplicar o script de rollback correspondente e restaurar do backup se necessário — não tentar "consertar ao vivo" em produção.
19. Deploy do código correspondente (frontend/edge functions).
20. Atualizar o número de versão exibido no app (ver seção 4).

---

## 3. Checklist rápido pré-produção

- [ ] Migration testada do zero em banco limpo/clone de OSH-DEV (não só incremental em cima de um banco já ajustado manualmente)
- [ ] Script de rollback escrito e testado
- [ ] Backup de produção feito e confirmado (não só "deve ter rodado")
- [ ] Nenhuma mudança de RLS aplicada sem passar pela skill `rls-policy`
- [ ] Changelog redigido em linguagem simples para consulta futura
- [ ] Janela de baixo tráfego definida, se a migration bloquear tabelas grandes
- [ ] Conexão confirmada apontando para o projeto Supabase correto antes de rodar qualquer DDL

---

## 4. Versionamento visível no app

### Esquema sugerido
Usar **Semantic Versioning** (`MAJOR.MINOR.PATCH`):
- **MAJOR**: mudança estrutural grande (ex: esta refatoração multi-tenant) ou breaking change de schema
- **MINOR**: nova funcionalidade sem quebrar o existente
- **PATCH**: correção de bug, ajuste pontual

### Onde guardar
Criar uma tabela simples no schema (fora do escopo de RLS por tenant, só o Super Admin lê):

```sql
create table if not exists platform.app_version (
  id int primary key default 1,
  version text not null,           -- ex: '1.5.0'
  released_at timestamptz not null default now(),
  migration_range text,            -- ex: '001-016'
  changelog text,
  constraint single_row check (id = 1)
);
```

Cada release em produção (Fase E, passo 20) atualiza essa linha.

### Onde exibir
- Rodapé do app (texto pequeno, ex: `v1.5.0`) — visível pra qualquer usuário, útil pra suporte ("em qual versão você está vendo isso?").
- Tela de configurações/sobre, com changelog resumido — mais visível para quem quiser conferir.
- Vincular a tag do git (`v1.5.0`) ao mesmo número — facilita rastrear de qual commit/migration range aquela versão em produção partiu.

---

## 5. Próximos passos imediatos (para a refatoração multi-tenant)

1. Confirmar conexão do Claude Code com o projeto Supabase **OSH-DEV** (seção 1 da resposta no chat).
2. Rodar `tenant-audit` para gerar a baseline atual do multi-tenant antes de qualquer alteração.
3. Definir junto quais pontos específicos do multi-tenant serão refatorados agora (schema de `tenants`/`platform_admins`, policies RLS, funções helper, contexto no frontend) — um item de cada vez, cada um virando sua própria migration numerada.
4. Criar a tabela `app_version` como parte da própria migration desta refatoração, já deixando o versionamento implementado junto.
