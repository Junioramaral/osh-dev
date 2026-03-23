

# Adicionar funcionalidade de exclusão de tickets/RFCs

## Escopo

Permitir que **Super Admin** e **Tenant Admin** excluam tickets (incluindo RFCs). A exclusão será em cascata, removendo também comentários, histórico, time logs, RFC steps, SLA notifications e anexos relacionados.

## Mudanças

### 1. RLS: Política de DELETE para tenant_admin
Criar migração SQL para adicionar política de DELETE na tabela `tickets` para tenant_admin (super_admin já tem via policy ALL):

```sql
-- Tenant admins can delete their own tenant tickets
CREATE POLICY "Tenant admins can delete own tickets"
ON public.tickets FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin') 
  AND client_id = get_user_tenant_id(auth.uid())
);
```

Também adicionar políticas de DELETE nas tabelas dependentes (`ticket_comments`, `ticket_history`, `ticket_time_logs`, `rfc_steps`, `sla_notifications`) para super_admin e tenant_admin, para que o cascade funcione ou para permitir limpeza manual antes do delete.

### 2. Hook: `useDeleteTickets` (novo)
Criar `src/hooks/useDeleteTickets.ts`:
- Mutation que primeiro deleta registros dependentes (comments, history, time_logs, rfc_steps, sla_notifications) e depois o ticket
- Invalidar queries relevantes no onSuccess

### 3. Dialog de confirmação: `DeleteTicketDialog` (novo)
Criar `src/components/tickets/DeleteTicketDialog.tsx`:
- AlertDialog com aviso de que a ação é irreversível
- Mostrar quantidade de tickets a serem excluídos
- Ícone de alerta vermelho, botão destrutivo

### 4. BulkActionsBar: Botão "Excluir"
Adicionar botão vermelho "Excluir" no `BulkActionsBar.tsx`, visível apenas para `isSuperAdmin` ou `isTenantAdmin`

### 5. Tickets.tsx: Integração
- Adicionar estado para o dialog de exclusão
- Passar `onDeleteTickets` e props de permissão ao BulkActionsBar
- Chamar hook de exclusão na confirmação

### 6. TicketDetail: Botão de exclusão individual
Adicionar botão "Excluir" no `TicketHeader.tsx` (visível para super_admin/tenant_admin), com o mesmo dialog de confirmação

## Arquivos afetados
- `supabase/migrations/` — nova migração (RLS DELETE policies)
- `src/hooks/useDeleteTickets.ts` — novo
- `src/components/tickets/DeleteTicketDialog.tsx` — novo
- `src/components/tickets/BulkActionsBar.tsx` — botão excluir
- `src/pages/Tickets.tsx` — integração bulk delete
- `src/components/tickets/TicketHeader.tsx` — botão excluir individual

