## Novo status "liberado" para tickets retornados à fila

### Objetivo
Criar um novo status `liberado` no enum `ticket_status` e aplicá-lo automaticamente quando um ticket for desbloqueado por inatividade (retornar à fila), substituindo a lógica visual atual baseada apenas em `unlocked_at`.

### Alterações

**1. Banco de dados (migration)**
- Adicionar valor `liberado` ao enum `public.ticket_status` (`ALTER TYPE ... ADD VALUE 'liberado'`).

**2. Edge Function `unlock-inactive-tickets`**
- Ao desbloquear tickets inativos, além de limpar `analyst_id`/`lock_*` e setar `unlocked_at`, atualizar `status = 'liberado'`.
- Manter o registro no `ticket_history` (action_type `unlocked_by_inactivity`).

**3. Frontend — `src/lib/ticketUtils.tsx`**
- `getStatusColor`: adicionar case `liberado` com cor amarela (mantendo a identidade visual atual de "retornou à fila").
- `getStatusLabel`: adicionar `liberado` → "Liberado".

**4. Listagens e filtros de status**
- Incluir `liberado` nas opções de filtro/seleção de status em:
  - `src/pages/Tickets.tsx`
  - `src/pages/MyTickets.tsx`
  - `src/pages/Dashboard.tsx` (se houver agrupamento por status)
- Tratar `liberado` como ticket **aberto** (não entra no grupo resolvido/fechado).

### Pontos de atenção
- O destaque amarelo na linha (`TicketRow.tsx`) hoje usa `unlocked_at`. Como o status `liberado` é mais explícito, mantemos o highlight atual (continua funcionando), mas a Badge de status passará a mostrar "Liberado".
- Quando um analista assumir o ticket novamente, o fluxo normal de mudança de status (ex.: `em_atendimento`) sobrescreverá `liberado` — nenhum tratamento extra necessário.
- RFCs continuam fora do fluxo de inatividade.

### Não incluso
- Nenhuma alteração em SLA, regras de negócio de fechamento, ou notificações por email além do que já existe.