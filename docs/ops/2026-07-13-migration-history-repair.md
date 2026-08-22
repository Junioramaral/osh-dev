# Migration History Repair — 2026-07-13

## Contexto

O ledger de migrations do Supabase (OSH-DEV) divergia dos arquivos
locais em `supabase/migrations/`: 88 versões existiam no remoto sem
correspondência de estado no CLI, e as migrations locais nunca haviam
sido registradas como aplicadas via `supabase migration list`.

**Causa raiz:** o schema do projeto foi criado originalmente pela
era Lovable/Dashboard (mudanças aplicadas direto no Postgres via UI/
dashboard, sem passar pelo Supabase CLI). Isso deixou o schema real do
banco correto e funcional, mas sem o rastreamento formal de migrations
que o CLI espera — daí a divergência de 88 versões entre o que o
remoto "lembrava" e o que os arquivos locais descreviam.

## Ações executadas

1. `supabase migration repair --status reverted` nas 88 versões
   remotas sem arquivo local correspondente — limpa o ledger remoto
   dessas entradas órfãs.
2. `supabase migration repair --status applied` nas 89 versões locais
   (as 88 pré-existentes + `20251107134218`, confirmada à parte) —
   marca essas migrations locais como já aplicadas no remoto, refletindo
   a realidade do schema.

## Resultado verificado

`supabase migration list` confirma **LOCAL = REMOTE** em todas as
entradas, **93 migrations no total**, zero pendências
(nenhuma migration listada só do lado local ou só do lado remoto).

> Nota: o número final verificado é 93, não 92 como estimado
> inicialmente — a contagem foi conferida via `supabase migration
> list` e via contagem direta dos arquivos em `supabase/migrations/`.

## Próximos passos já cobertos nesta sessão

Após o repair, os `db push` pendentes (incluindo as migrations 015
e 017 do plano de refatoração multi-tenant — `tenants`/
`platform_admins` e a ponte `tenants` ↔ `clients`) foram aplicados
normalmente, sem conflito com o histórico corrigido.
