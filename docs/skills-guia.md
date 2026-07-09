# Skills do Claude Code — Projeto OSH

Este documento explica em detalhe cada uma das 4 skills instaladas em
`.claude/skills/` no repositório `osh-dev`: o que fazem, por que
existem, quando usar e como usar no dia a dia.

---

## 1. `tenant-audit`

### O que é
Um checklist de auditoria da arquitetura multi-tenant do OSH. Contém
o "mapa oficial" de como Super Admin, Tenant e Client se relacionam,
e valida se o código/banco realmente seguem esse design.

### Para que serve
Evitar que a estrutura multi-tenant seja implementada de forma
inconsistente — por exemplo, um desenvolvedor (ou o próprio Claude
Code, em outra sessão) assumir por engano que o Super Admin deveria
enxergar dados de todos os tenants, quando na verdade ele **não deve**.

Essa skill existe porque essa é a parte mais sensível do projeto:
um erro aqui não é um bug visual, é um **vazamento de dados entre
clientes diferentes da plataforma**.

### Quando usar
- Antes de começar qualquer uma das 6 partes do plano de migração
  multi-tenant (as que estão no `prompt-multitenat-partes.md`)
- Sempre que for criar ou alterar uma policy RLS que envolva `tenant_id`
- Ao mexer em `TenantContext`, `useTenant`, ou nas rotas
  `/platform/*` e `/app/admin/*`
- Quando aparecer um bug de "usuário vendo dado que não deveria"
- Periodicamente, como auditoria de sanidade, mesmo sem estar mexendo
  em nada — por exemplo, antes de promover `dev` → `main`

### Como usar
No chat do Claude Code, dentro do VSCode:

```
Use a skill tenant-audit para revisar a Parte 1 do plano de migração
antes de eu aprovar.
```

ou, para uma auditoria mais ampla:

```
Use a skill tenant-audit para auditar o estado atual do banco e do
frontend em relação ao design multi-tenant. Liste tudo que está
incorreto antes de sugerir qualquer correção.
```

O Claude Code vai ler o `SKILL.md` da pasta `tenant-audit`, passar
pelo checklist item por item (tabelas base, funções helper, RLS,
seed, frontend, rotas) e te devolver um relatório do que está OK e
do que precisa de ajuste — sem aplicar nada sozinho.

---

## 2. `migration-review`

### O que é
Um checklist técnico de revisão de migrations SQL do Supabase, focado
em segurança de dados, performance e reversibilidade.

### Para que serve
Migrations de banco são difíceis de desfazer depois de aplicadas em
produção. Essa skill existe para pegar problemas **antes** de rodar
`supabase db push` — coisas como coluna `NOT NULL` sem backfill,
FK sem `ON DELETE` definido, índice faltando, ou RLS esquecido numa
tabela nova.

### Quando usar
- Toda vez que uma nova migration for gerada (numerada, em
  `/supabase/migrations`)
- Antes de rodar `supabase db push`, seja em OSH-DEV ou produção
- Ao revisar as migrations do plano multi-tenant (001 a 014, e as que
  vierem depois)

### Como usar
```
Aplique a skill migration-review na migration 007_add_tenant_id_to_tickets.sql
antes de eu aprovar.
```

ou, para revisar um lote inteiro de uma vez (como as migrations da
Parte 2 do plano):

```
Use a skill migration-review em todas as migrations criadas nesta
etapa (005 a 011). Aponte qualquer item do checklist que não foi
atendido.
```

O Claude Code vai analisar o SQL gerado, comparar com o checklist
(backfill, FK, índices, RLS, reversibilidade) e sinalizar riscos
antes de você mandar aplicar de fato.

---

## 3. `rls-policy`

### O que é
O "manual de estilo" para políticas de Row Level Security (RLS) no
projeto — define exatamente qual padrão de policy usar em tabelas
operacionais vs. nas tabelas especiais (`tenants`, `platform_admins`).

### Para que serve
RLS é a camada que realmente garante isolamento entre tenants no
banco (o frontend é só UX, não segurança). Essa skill existe para
que toda policy nova siga o mesmo padrão, usando sempre as funções
helper (`get_current_tenant_id()`, `is_platform_admin()`) em vez de
lógica duplicada ou hardcoded.

Ela funciona em conjunto com a `tenant-audit` — a `tenant-audit` diz
*qual é a regra*, a `rls-policy` diz *como escrever o SQL* que
implementa essa regra corretamente.

### Quando usar
- Toda vez que uma tabela nova for criada e precisar de RLS
- Ao revisar RLS já existente por suspeita de problema
- Como parte do checklist ao revisar uma migration (junto com
  `migration-review`)

### Como usar
```
Use a skill rls-policy para criar as policies RLS da tabela
faq_articles que acabamos de criar.
```

ou, para revisão:

```
Aplique a skill rls-policy nas policies da migration 012 e confirme
que nenhuma tabela operacional tem bypass de Super Admin.
```

O Claude Code vai gerar ou validar o SQL das policies seguindo
exatamente os templates definidos na skill, e also pode te mostrar
o comando de teste manual (`SET request.jwt.claims...`) para simular
um usuário específico no SQL editor do Supabase.

---

## 4. `pr-checklist`

### O que é
Um checklist de Pull Request — cobre desde convenção de branch e
commits até itens específicos de banco (se passou pelas skills acima)
e de frontend (queries com `tenant_id`, proteção de rotas).

### Para que serve
Garantir que nada seja mesclado em `dev` ou `main` sem passar pelas
outras 3 skills quando aplicável, e sem os cuidados básicos de
qualidade (build passando, sem `console.log`, sem segredo commitado).

É a skill que "fecha o ciclo" — junta o que as outras 3 já validaram
e confirma que está tudo pronto para virar código de verdade no repo.

### Quando usar
- Antes de abrir um PR de `feature/xxx` → `dev`
- Antes de promover `dev` → `main`
- Ao revisar um PR (seu ou gerado pelo Claude Code)

### Como usar
```
Rode o checklist da skill pr-checklist nesta branch antes de eu
abrir o PR.
```

ou, ao final de uma etapa do plano multi-tenant:

```
Terminamos a Parte 5. Use a skill pr-checklist para validar se está
tudo pronto para abrir PR de feature/multi-tenant-frontend para dev.
```

O Claude Code vai passar pelo checklist geral, checar se as mudanças
de banco/RLS já foram revisadas pelas outras skills, e te dar uma
lista do que falta (ou confirmar que está pronto) antes de você
efetivamente abrir o PR no GitHub.

---

## Como as 4 skills se conectam

```
tenant-audit     → define a REGRA (arquitetura correta)
      ↓
rls-policy       → define o PADRÃO de SQL para implementar a regra
      ↓
migration-review → valida a MIGRATION antes de aplicar
      ↓
pr-checklist     → valida o PR inteiro antes de mesclar no repo
```

Na prática, numa etapa típica do plano multi-tenant, a ordem de uso
seria:

1. Colar o prompt da parte (ex: Parte 3 — RLS e triggers)
2. `"Use a skill rls-policy para gerar as policies"`
3. `"Use a skill migration-review nessa migration"`
4. `"Use a skill tenant-audit para confirmar que está alinhado com
   a arquitetura"`
5. Só depois de tudo validado: aplicar a migration
6. Ao fechar a etapa: `"Use a skill pr-checklist"` antes de abrir o PR

Nenhuma skill aplica mudanças sozinha — todas retornam um relatório
para você revisar e aprovar antes de qualquer ação real no banco ou
no Git (isso já está reforçado pelo `.claude/settings.json`, que
bloqueia push e migração automática sem confirmação).
