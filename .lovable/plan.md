## Objetivo
Tickets com prioridade **P4** não devem gerar alertas de SLA (nem warning, nem overdue): sem email de SLA estourado, sem aparecer no sininho de "dar ciência".

## Mudanças

### 1. `supabase/functions/sla-monitor/index.ts`
No loop de tickets (após buscar a lista), adicionar um `continue` quando `ticket.priority === 'P4'`. Assim P4 é ignorado tanto no cálculo de First Response quanto no de Resolution — nenhuma linha nova em `sla_notifications` e nenhum email enviado.

Já está garantido que RFCs são ignorados (`record_type != 'rfc'`); a mesma lógica passa a valer para P4.

### 2. `src/hooks/useOverdueSLAAlertsCount.ts`
As duas queries (`useOverdueSLAAlertsCount` e `useOverdueSLAAlerts`) hoje contam qualquer registro com `alert_type='overdue'` e `acknowledged_at IS NULL`. Adicionar join com `tickets!inner(priority)` e filtro `.neq('tickets.priority', 'P4')` para que notificações antigas de P4 (geradas antes desta correção) não apareçam mais no sininho.

### 3. Limpeza de pendências P4 antigas (migration)
Marcar como reconhecidas as notificações já existentes de tickets P4 para zerar o sininho:

```sql
UPDATE public.sla_notifications sn
SET acknowledged_at = now(),
    acknowledged_by_email = 'system-auto-p4-exclusion'
FROM public.tickets t
WHERE sn.ticket_id = t.id
  AND t.priority = 'P4'
  AND sn.acknowledged_at IS NULL;
```

## Fora de escopo
- Cálculo/exibição do deadline de SLA P4 nos tickets continua igual (apenas alertas/emails são suprimidos).
- Demais prioridades (P1, P2, P3) seguem inalteradas.
- Memória do projeto será atualizada após implementação para registrar a regra "P4 não gera alertas/emails de SLA".
