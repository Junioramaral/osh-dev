
# Excluir RFCs do SLA

## Objetivo

Tickets do tipo RFC (`record_type = 'rfc'`) nao devem ter SLA calculado, exibido, nem ser contabilizados em relatórios e dashboards de SLA.

---

## Mudanças Necessárias

### 1. Banco de Dados — Trigger `calculate_sla_deadlines`

Alterar a function `calculate_sla_deadlines()` para **pular o cálculo** quando o ticket for RFC. No início da function, adicionar:

```sql
IF NEW.record_type = 'rfc' THEN
  NEW.sla_first_response_deadline := NULL;
  NEW.sla_resolution_deadline := NULL;
  RETURN NEW;
END IF;
```

Isso garante que RFCs nunca terão deadlines de SLA no banco.

---

### 2. `src/lib/ticketUtils.tsx` — `calculateSLAStatus()`

No início da função, retornar `not-applicable` imediatamente se `ticket.record_type === 'rfc'`:

```typescript
if (ticket.record_type === 'rfc') {
  return { type: 'not-applicable', label: 'SLA N/A', ... };
}
```

Isso afeta automaticamente todos os componentes que usam esta função: TicketHeader, TicketRow, TicketSidebar.

---

### 3. `src/pages/TicketDetail.tsx` — Ocultar aba SLA para RFCs

Remover a aba "SLA" do `TabsList` quando `ticket.record_type === 'rfc'`. O grid de colunas passa de 5 para 4.

---

### 4. `src/components/tickets/TicketSidebar.tsx` — Ocultar card SLA para RFCs

Envolver o card "Status do SLA" com a condição `ticket.record_type !== 'rfc'` para não exibir o card lateral de SLA.

---

### 5. `src/pages/SLADashboard.tsx` — Filtrar RFCs da query

Adicionar `.neq('record_type', 'rfc')` na query de tickets do dashboard para excluir RFCs de todas as métricas.

---

### 6. Edge Function `sla-monitor` — Excluir RFCs do monitoramento

Adicionar `.neq('record_type', 'rfc')` na query que busca tickets ativos para verificação de SLA, evitando alertas para RFCs.

---

### 7. Edge Function `send-monthly-report` — Excluir RFCs do relatório mensal

Adicionar `.neq('record_type', 'rfc')` na query que busca tickets do período, para que RFCs não distorçam métricas de SLA no relatório enviado ao cliente.

---

### 8. Hooks de relatórios — Excluir RFCs das queries

Adicionar `.neq('record_type', 'rfc')` nos seguintes hooks:
- `useReportData.ts`
- `useAnalystPerformanceData.ts`
- `usePeriodComparisonData.ts`
- `useQueueWorkloadData.ts`
- `useResolutionTimeData.ts`
- `useClosureRankingData.ts`

---

## Detalhes Técnicos

### Sequência de implementação

```text
1. Migration SQL (trigger calculate_sla_deadlines)
2. ticketUtils.tsx (calculateSLAStatus)
3. TicketDetail.tsx (ocultar aba SLA)
4. TicketSidebar.tsx (ocultar card SLA)
5. SLADashboard.tsx (filtrar query)
6. sla-monitor/index.ts (filtrar query)
7. send-monthly-report/index.ts (filtrar query)
8. Hooks de relatórios (filtrar queries)
```

### O que NAO muda

- Fluxo de criação, aprovação e execução de RFC
- Componentes RFCStepBuilder, RFCFormSection, RFCExecution, RFCApproval, ClientRFCPortal
- RLS policies
- Outros tipos de ticket (suporte) continuam com SLA normalmente
