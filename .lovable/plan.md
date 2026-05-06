## Objetivo
1. No card **Pessoas** do ticket/RFC, após escolher o analista, exibir um **dropdown de Times** mostrando os times aos quais aquele analista pertence (em vez de definir o time automaticamente).
2. Quando o analista for atribuído pelo card Pessoas, **enviar notificação por e-mail** ao analista informando a atribuição.

## Como descobrir os times do analista
Hoje a relação analista ↔ time é feita por:
- `profiles.team_id` — time principal do analista (single).
- Indireto: `user_queues` (filas do analista) ↔ `teams_queues` (filas dos times) → times com sobreposição de filas.

Combinar as duas fontes para listar os times disponíveis (deduplicado, ordenado por nome). Se houver apenas 1 time, pré-seleciona; se vazio, exibe "Sem times associados" e mantém o time atual do ticket.

## Mudanças

### `src/components/tickets/TicketSidebar.tsx`
- Remover a lógica que escreve `team_id` automaticamente ao selecionar o analista.
- Após selecionar analista (e quando `editingAnalyst`), **mostrar um segundo Select "Time"** carregando os times do analista escolhido:
  - Query nova `useQuery(["analyst-teams", analystId])`:
    - Buscar `profiles.team_id` do analista (1 time).
    - Buscar `user_queues` do analista → `teams_queues` com mesmas `queue_id` → `teams`.
    - Unir os resultados (deduplicar por id).
  - Pré-seleciona se houver apenas 1; caso contrário, requer escolha manual.
- Botão **"Confirmar"** que efetiva o update do ticket com `analyst_id`, `team_id` (escolhido), lock fields, e dispara a notificação.
- Após sucesso: invalida queries e fecha edição.

### Notificação ao analista
Reutilizar/estender a Edge Function `send-analyst-notification` existente:
- Atualmente ela é usada para notificações de comentário. Adicionar suporte a um novo tipo `assignment` (ou criar nova função `send-analyst-assignment-notification`).
- **Decisão recomendada:** criar função nova `send-analyst-assignment-notification` (separação clara de templates) — recebe `{ ticketId }`, busca analista (e-mail via `auth.users`), ticket, cliente, e envia e-mail "Você foi atribuído ao ticket #XXXXX – Título" com link para `${APP_URL}/tickets/{id}`.
- Frontend chama `supabase.functions.invoke("send-analyst-assignment-notification", { body: { ticketId } })` após o update bem-sucedido (best-effort, erros não bloqueiam a UI).

## Fora do escopo
- Não altera o fluxo do `RequiredFieldsBeforeResolveDialog`.
- Não altera RLS.
- Não altera o `BulkAssignAnalystDialog` (escopo apenas do sidebar).

## Pontos a confirmar
- Se o analista tiver apenas 1 time associado, devo pré-selecionar automaticamente ou ainda exigir confirmação?
- A notificação por e-mail deve ser enviada também quando o analista é trocado (reatribuição), ou apenas na primeira atribuição?
