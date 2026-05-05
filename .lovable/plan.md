## Objetivo

Bloquear o encerramento (status "Resolvido") de qualquer ticket que não tenha **Analista**, **Time** e **Fila** atribuídos. Quando faltar uma dessas informações, o sistema deve solicitar ao usuário que as preencha antes de prosseguir com a resolução.

## Onde a regra será aplicada

Existem 3 caminhos no app que mudam um ticket para "Resolvido". Todos receberão a mesma validação:

1. **Resolução individual via sidebar do ticket** — `src/components/tickets/TicketSidebar.tsx` (chama `TicketResolveDialog` → `resolveTicketWithReason`).
2. **Resolução em lote na lista de tickets** — `src/pages/Tickets.tsx` (`BulkStatusReasonDialog` → `bulkChangeStatusWithReason`).
3. **Resolução em lote em "Meus Tickets"** — `src/pages/MyTickets.tsx` (mesmo padrão da lista).

## Comportamento proposto

### A. Resolução individual (TicketSidebar)

Antes de abrir o `TicketResolveDialog`, verificar `ticket.analyst_id`, `ticket.team_id`, `ticket.queue_id`.

- Se **todos** preenchidos → abre o diálogo de resolução normalmente.
- Se **algum faltando** → abrir um novo diálogo `TicketRequiredFieldsDialog` que mostra apenas os campos faltantes:
  - Analista (Select com analistas Otimizzo) — reaproveitar query já usada em `BulkAssignAnalystDialog`.
  - Time (Select de `teams`) — reaproveitar query de `BulkAssignTeamDialog`.
  - Fila (Select de `queues`) — reaproveitar query de `BulkAssignQueueDialog`.
- Botão "Continuar" salva os campos faltantes no ticket e em seguida abre o `TicketResolveDialog` para o motivo da resolução.
- Botão "Cancelar" fecha sem alterar o ticket.

### B. Resolução em lote (Tickets.tsx e MyTickets.tsx)

Em `handleBulkChangeStatus`, quando `status === "resolvido"`:

1. Buscar os tickets selecionados em memória (já disponíveis na lista) e identificar os que estão sem analista/time/fila.
2. Se **algum** ticket selecionado estiver com algum desses campos vazios:
   - Abrir um novo diálogo `BulkRequiredFieldsDialog` listando quantos tickets faltam cada campo, com Selects de Analista, Time e Fila.
   - O usuário escolhe os valores que serão aplicados **somente nos tickets que estão faltando** aquele campo (não sobrescreve os já preenchidos).
   - Ao confirmar: aplicar atualizações em lote (analyst_id/team_id/queue_id) nos tickets pendentes e, em seguida, prosseguir com `BulkStatusReasonDialog` para o motivo.
3. Se todos já estiverem completos: fluxo atual sem mudanças.

### C. Defesa em profundidade no hook

Em `src/hooks/useTicketActions.ts` (`resolveTicketWithReason`) e `src/hooks/useBulkTicketActions.ts` (`bulkChangeStatus` / `bulkChangeStatusWithReason`):

- Antes do `update`, recarregar os tickets envolvidos e validar que `analyst_id`, `team_id` e `queue_id` estão preenchidos.
- Caso contrário, abortar com `toast.error("Para resolver é obrigatório ter Analista, Time e Fila atribuídos.")` e não tocar no status.

Isso garante que, mesmo que a UI seja contornada, a regra é mantida.

## Componentes novos

- `src/components/tickets/TicketRequiredFieldsDialog.tsx` — diálogo de coleta para 1 ticket.
- `src/components/tickets/BulkRequiredFieldsDialog.tsx` — diálogo de coleta para N tickets.

Ambos seguem o estilo dos diálogos `BulkAssign*` existentes (mesmos componentes Select/Combobox, mesmas queries).

## Arquivos a editar

- `src/components/tickets/TicketSidebar.tsx` — encadear novo diálogo antes do `TicketResolveDialog`.
- `src/pages/Tickets.tsx` — interceptar `handleBulkChangeStatus` quando status = resolvido.
- `src/pages/MyTickets.tsx` — mesma alteração da lista geral.
- `src/hooks/useTicketActions.ts` — validação server-side defensiva em `resolveTicketWithReason`.
- `src/hooks/useBulkTicketActions.ts` — validação defensiva em `bulkChangeStatus` e `bulkChangeStatusWithReason`.

## Mensagens (PT-BR)

- Título do diálogo: "Informações obrigatórias para resolver"
- Subtítulo: "Antes de resolver, é necessário atribuir Analista, Time e Fila."
- Toast de bloqueio (defesa): "Atribua Analista, Time e Fila antes de resolver o ticket."
- Validação: campos faltantes são obrigatórios (não permite confirmar enquanto algum estiver vazio).

## Fora do escopo

- Não alterar a obrigatoriedade desses campos na criação do ticket (a regra continua valendo apenas no encerramento).
- Não mudar regras de RFC (já excluídas do fluxo de resolução padrão).