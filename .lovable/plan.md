## Objetivo

1. Bloquear lançamento de horas com sobreposição (mesmo analista, mesmo dia, mesma hora/minuto inicial ou intervalo que se sobreponha).
2. Criar relatório de "Meus Lançamentos de Horas" para analistas verem suas próprias horas; Super Admin pode ver de todos os colaboradores.

---

## Parte 1 — Validação de sobreposição

### Frontend (`TimeLogDialog.tsx` e `TimeLogEditDialog.tsx`)
- Antes de salvar, consultar `ticket_time_logs` do `analyst_id` atual no `work_date` selecionado.
- Bloquear se houver outro registro do mesmo analista cujo intervalo `[start_time, end_time)` se sobreponha ao novo (na edição, ignorar o próprio `id`).
- Mostrar mensagem clara: "Você já possui um lançamento neste dia entre HH:MM e HH:MM (Ticket #NNN)."

### Backend (camada de garantia)
Migration para criar trigger `BEFORE INSERT OR UPDATE` em `ticket_time_logs` que:
- Verifica se existe outro registro do mesmo `analyst_id` + `work_date` com `tstzrange`/`timerange` sobreposto.
- Levanta exceção `RAISE EXCEPTION 'Lançamento sobreposto: já existe registro neste horário'` se houver conflito.

Isso garante consistência mesmo em chamadas simultâneas ou via outro caminho.

---

## Parte 2 — Relatório "Meus Lançamentos"

### Novo card em Relatórios (`src/pages/Reports.tsx`)
- Adicionar tipo `"my-time-logs"` com título "Meus Lançamentos de Horas", ícone `Clock`, visível para qualquer usuário autenticado (analistas, admins).
- Para Super Admin, o relatório terá um seletor extra "Analista" (com opção "Todos") + seletor de Cliente.
- Para demais usuários (analistas comuns), o relatório é forçado ao próprio `user_id` (não há seletor de analista).

### Novo componente `MyTimeLogsReport.tsx`
Filtros:
- Período (reutilizar `ReportPeriodFilter`)
- Cliente (dropdown, opção "Todos")
- Projeto (dropdown dependente do cliente, opção "Todos")
- Analista (somente Super Admin)

Tabela com colunas:
- Data, Cliente, Ticket #, Projeto, Hora Início, Hora Fim, Horas, Descrição

Totalizadores no rodapé: total de horas no período, total por cliente, total por projeto.

Exportação: botão CSV/PDF (seguindo padrão dos outros relatórios).

### Novo hook `useMyTimeLogsData.ts`
- Query em `ticket_time_logs` com joins para `tickets`, `clients`, `client_projects`, `profiles`.
- Filtros: `work_date` no range, `client_id`, `project_id`, `analyst_id`.
- Para usuários não Super Admin, força `analyst_id = profile.id` na query (defesa em profundidade além da RLS).

### Política RLS (verificar — se ainda não restringe)
Garantir que `ticket_time_logs` SELECT só permite ao próprio analista ver seus registros, exceto Super Admin que vê tudo. Se a policy atual já permitir visibilidade mais ampla (ex.: por queue/tenant), adicionar uma política mais restritiva específica para esse relatório não é necessário — basta o filtro no hook respeitar a regra. Confirmo as policies atuais antes de aplicar mudanças.

---

## Arquivos afetados

**Criar:**
- `src/components/reports/MyTimeLogsReport.tsx`
- `src/hooks/useMyTimeLogsData.ts`
- Migration: trigger de validação de sobreposição em `ticket_time_logs`

**Editar:**
- `src/components/tickets/TimeLogDialog.tsx` — validação pré-save
- `src/components/tickets/TimeLogEditDialog.tsx` — validação pré-save (ignora própria linha)
- `src/hooks/useTimeLogMutations.ts` — tratar erro de sobreposição com toast amigável
- `src/pages/Reports.tsx` — registrar novo card "Meus Lançamentos"
- `mem/features/manual-time-tracking.md` — documentar regra de sobreposição e novo relatório

---

## Pontos a confirmar

1. **Sobreposição parcial vs. exata:** o pedido diz "mesmo dia, horário e min". Vou implementar **qualquer sobreposição de intervalo** (ex.: 09:00–10:00 conflita com 09:30–10:30), pois é o comportamento correto para evitar dupla contagem. Se preferir apenas conflito exato do horário inicial, ajusto.
2. **Permissão do relatório:** além de analistas e Super Admin, devo liberar para Tenant Admin ver os lançamentos do próprio tenant?
