## Habilitar edição de registros na aba "Registros"

Adicionar ações de editar/excluir em cada item da aba "Registros" do `TimeLogDialog`, reusando o `TimeLogEditDialog` e `TimeLogDeleteDialog` já existentes, com permissões via `getTimeLogPermissions` (mesma regra de 48h úteis usada em "Meus Lançamentos").

### Mudanças

**`src/hooks/useTicketTimeLogs.ts`**
- Incluir `logged_at` no select (necessário para a regra de 48h úteis).
- Expor `logged_at` no tipo `TicketTimeLogRow`.

**`src/components/tickets/TimeLogDialog.tsx`** (apenas o sub-componente `TicketTimeLogsHistory`)
- Importar `TimeLogEditDialog`, `TimeLogDeleteDialog`, `getTimeLogPermissions`, `useAuth` e o role do usuário.
- Para cada registro, calcular permissões com o usuário logado, role e `analyst_id`/`logged_at` do registro.
- Renderizar dois botões discretos (ícones `Pencil` e `Trash2`, variant `ghost` `size="icon"`) à direita de cada linha, exibidos somente quando a permissão correspondente for verdadeira. Tooltip com o `reason` quando bloqueado é opcional — por simplicidade, apenas ocultar quando não permitido.
- Estados locais `editingLog` e `deletingLog`; ao clicar, montar o payload esperado pelos dialogs existentes (id, hours, description, logged_at, ticketId, clientId, project_id, work_date, start_time, end_time).
- Os dialogs já invalidam as queries de time logs via `useTimeLogMutations`; adicionar invalidação extra de `['ticket-time-logs', ticketId]` se necessário (verificar `useTimeLogMutations` — se não invalidar essa key, adicionar `queryClient.invalidateQueries` no `onSuccess` local após fechar o sub-dialog, ou invalidar manualmente no `TicketTimeLogsHistory` via efeito quando o dialog fechar).

### Fora de escopo
- Sem alterações de schema, RLS ou edge functions.
- Sem mudar regras de permissão (reusa `getTimeLogPermissions`, janela de 48h úteis, Super Admin/Tenant Admin sem restrição, Viewer sem edição).
- Sem alterar a aba "Novo Registro".

### Perguntas
1. Para registros bloqueados (fora de 48h ou de outro analista, sem ser admin), prefere **ocultar** os botões ou **mostrá-los desabilitados com tooltip explicando o motivo**?
