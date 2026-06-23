## Objetivo

Adicionar uma aba "Registros" no diálogo **Registrar Horas Trabalhadas** mostrando todos os lançamentos já feitos para aquele ticket, agrupados por projeto, com subtotais por projeto e total geral.

## Mudanças

### 1. `src/components/tickets/TimeLogDialog.tsx`
Envolver o conteúdo atual em `<Tabs>` (shadcn) com duas abas:

- **Novo Registro** (padrão) — formulário atual, sem alteração de comportamento.
- **Registros** — lista os lançamentos existentes do ticket, agrupados por projeto.

Layout da aba "Registros":
- Cabeçalho com **Total geral** do ticket (soma de `hours`) e quantidade de lançamentos.
- Lista de grupos por projeto:
  - Nome do projeto (ou "Sem projeto" quando `project_id` nulo) + badge "HE" quando `is_overtime`.
  - Subtotal de horas do grupo.
  - Linhas dos lançamentos: data (`dd/MM/yyyy`), `start_time–end_time`, horas, analista (`full_name`), descrição truncada (tooltip com texto completo).
- Estado vazio: "Nenhum registro de horas para este ticket ainda."
- Loading: skeleton compacto.
- Ordenação: projetos ordenados por nome ("Sem projeto" por último); dentro do grupo, ordenar por `work_date desc, start_time desc`.

### 2. Novo hook: `src/hooks/useTicketTimeLogs.ts`
Query React Query (`['ticket-time-logs', ticketId]`, enabled quando dialog aberto na aba Registros):

```ts
supabase
  .from('ticket_time_logs')
  .select('id, work_date, start_time, end_time, hours, description, project_id, analyst_id, client_projects(name, is_overtime), profiles:analyst_id(full_name)')
  .eq('ticket_id', ticketId)
  .order('work_date', { ascending: false })
  .order('start_time', { ascending: false })
```

Retorna os logs já mapeados; agrupamento e somatório feitos em `useMemo` no componente.

### 3. Refresh
Ao salvar um novo registro (sucesso de `addTimeLog`), invalidar também `['ticket-time-logs', ticketId]` para a aba "Registros" refletir o novo lançamento sem fechar o diálogo. Hoje o diálogo fecha após o submit; vou manter esse comportamento, então basta invalidar a query (já reabre atualizado).

## Fora de escopo

- Não vou permitir editar/excluir registros pela aba (já existe fluxo dedicado em `useTimeLogMutations` / Meus Lançamentos).
- Sem mudanças em schema, RLS, edge functions ou no fluxo do formulário existente.
- Sem alterações em outras telas (Meus Lançamentos, relatórios).

## Perguntas

1. A aba de Registros deve mostrar lançamentos de **todos os analistas** desse ticket, ou apenas os do **usuário logado**? (Padrão sugerido: todos do ticket.)
2. Posso permitir clicar em um registro para abrir o fluxo de edição existente (`Meus Lançamentos`)? Se sim, faria sentido só quando o registro for do próprio usuário e dentro da janela de 48h. Caso contrário, deixo somente leitura.
