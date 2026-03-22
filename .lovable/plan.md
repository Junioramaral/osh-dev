

# Auto-alocacao de Analista em Qualquer Interacao com o Ticket

## Problema Identificado

Atualmente, o sistema so aloca o analista ao ticket quando ele explicitamente "Assume" o ticket (lock). Porem, quando um analista:
- **Resolve um ticket** (via `resolveTicketWithReason`)
- **Altera o status** (via `updateTicketStatus`)
- **Conclui uma RFC** (via `handleMarkConcluida` em RFCExecution)
- **Adiciona um comentario** (via `addCommentMutation` em TicketComments)

...o `analyst_id` nao e preenchido automaticamente se estava vazio. O campo `resolved_by` tambem fica vazio em alguns fluxos bulk.

## Solucao

Adicionar auto-alocacao (`analyst_id`, `lock_status`, `lock_owner_id`) em todos os pontos de interacao do analista Otimizzo/SuperAdmin, caso o ticket ainda nao tenha analista atribuido.

### Arquivos a modificar

**1. `src/hooks/useTicketActions.ts`**

- `resolveTicketWithReason`: Antes do update, verificar se o ticket tem `analyst_id`. Se nao, incluir `analyst_id: userId`, `lock_status: 'locked'`, `lock_owner_id: userId` no update.
- `updateTicketStatus`: Buscar o ticket atual para checar `analyst_id`. Se vazio, incluir auto-alocacao no update junto com o status.

**2. `src/pages/RFCExecution.tsx`**

- `handleMarkConcluida`: Buscar `analyst_id` do ticket. Se nao tiver, incluir `analyst_id: user.id`, `lock_status: 'locked'`, `lock_owner_id: user.id` no update de resolucao.

**3. `src/components/tickets/TicketComments.tsx`**

- `addCommentMutation`: Apos inserir o comentario, verificar se `ticketData.analyst_id` e null e se o usuario e Otimizzo/SuperAdmin. Se sim, fazer update do ticket com `analyst_id: user.id`, `lock_status: 'locked'`, `lock_owner_id: user.id`.

**4. `src/hooks/useBulkTicketActions.ts`**

- `bulkChangeStatusWithReason`: Adicionar `analyst_id: userId`, `lock_status: 'locked'`, `lock_owner_id: userId` ao update quando o ticket nao tem analista (buscar tickets sem analyst_id e aplicar separadamente).

### Logica comum

Em cada ponto de interacao:
```text
SE ticket.analyst_id == null E usuario e Otimizzo/SuperAdmin:
  incluir no update:
    analyst_id = userId
    lock_status = 'locked'
    lock_owner_id = userId
    lock_at = now()
```

Isso garante que qualquer interacao de um analista com o ticket o aloca automaticamente, sem necessidade de clicar "Assumir Ticket" separadamente.

