

# Atribuição de Filas Diretamente ao Usuário

## Implementado

### Tabela `user_queues`
- Tabela de junção `user_queues` (user_id, queue_id) para vincular filas diretamente ao analista
- RLS: super_admins gerenciam, analistas veem suas próprias filas, Otimizzo pode visualizar

### Função `get_analyst_queue_ids`
- Atualizada para consultar `user_queues` em vez de `teams_queues`

### Componente `QueueCheckboxGroup`
- Similar ao `RoleCheckboxGroup` — checkboxes para seleção múltipla de filas
- Exibido no dialog de edição quando o usuário tem role de analista

### Arquivos editados
- `src/pages/TenantDetail.tsx` — coluna "Filas" na tabela, QueueCheckboxGroup no dialog de edição
- `src/hooks/useTenantUsers.ts` — busca filas do usuário via `user_queues`, salva ao atualizar
- `src/hooks/useAnalystQueues.ts` — consulta `user_queues` em vez de `teams_queues`
- `src/components/tickets/NewTicketDialog.tsx` — segmento derivado das roles, filas do `user_queues`
- `src/pages/Tickets.tsx` e `src/pages/MyTickets.tsx` — mensagens de aviso atualizadas
