## Problema

No relatório "Meus Lançamentos de Horas" (visão Super Admin), o seletor "Analista" lista **todos os perfis** — incluindo usuários de clientes. Deve listar apenas analistas internos da Otimizzo (dono do tenant).

## Critério para "analista interno"

Em `public.profiles`, usuários internos têm `client_id IS NULL` (usuários vinculados a um cliente têm `client_id` preenchido). Esse é o mesmo critério já usado em outros pontos do app para distinguir tenant-owner × cliente.

## Mudanças

### 1) `src/components/reports/MyTimeLogsReport.tsx`
- No `useQuery(["report-analysts-all"])`, adicionar `.is("client_id", null)` e `.eq("is_active", true)` no select de `profiles`, para o dropdown listar apenas analistas internos ativos.

### 2) `src/hooks/useMyTimeLogsData.ts`
- Quando Super Admin escolher "Todos os analistas" (`analystId === "all"`), restringir o resultado também a `analyst_id` de perfis internos. Implementação:
  - Buscar previamente os ids de `profiles` com `client_id IS NULL`.
  - Aplicar `.in("analyst_id", internalIds)` na query de `ticket_time_logs`.
- Quando um analista específico é selecionado, manter o filtro atual (`.eq("analyst_id", ...)`).

### 3) Sem alteração de RLS
Apenas filtro de apresentação/escopo. As policies de `ticket_time_logs` permanecem.

## Arquivos afetados
- `src/components/reports/MyTimeLogsReport.tsx` (filtro do dropdown)
- `src/hooks/useMyTimeLogsData.ts` (escopo do "Todos")

## Confirmação
Confirma que o critério "dono do tenant = `profiles.client_id IS NULL`" é o correto para o seu ambiente? Se houver outra marcação (ex.: role específica), me diga qual usar.
