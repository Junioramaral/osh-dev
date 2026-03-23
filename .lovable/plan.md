
# SLA em Horas Úteis — Implementado ✅

## O que foi feito

### Backend (SQL)
- Função `add_business_minutes()` que calcula deadlines somando apenas minutos em horário comercial
- Trigger `calculate_sla_deadlines()` atualizado: P3/P4 usam horas úteis, P1/P2 mantêm 24x7
- Configs padrão inseridas: `business_hours_start=09:00`, `business_hours_end=18:00`, `business_days=[1,2,3,4,5]`

### Frontend
- `src/lib/businessHours.ts`: funções `calculateBusinessMinutes()`, `parseBusinessHoursConfig()`, `isBusinessHoursPriority()`
- `src/lib/ticketUtils.tsx`: `calculateSLAStatus()` agora usa business hours para P3/P4 (labels com "(HU)")
- `src/components/tickets/SLAMetricsCards.tsx`: Tempo Útil e Pausa calculados corretamente para P3/P4
- `src/components/tickets/SLAHistoryTable.tsx`: % e tempo usados em horas úteis com badge indicativo
- `src/pages/SLADashboard.tsx`: refatorado para usar `calculateSLAStatus` compartilhado
- `src/pages/SystemSettings.tsx`: UI para configurar horário comercial e dias úteis

### Edge Function
- `sla-monitor`: busca config de business hours, calcula alertas em horas úteis para P3/P4

## Fase 2 (futuro)
- Tabela de feriados
- Horários por cliente
- Recálculo retroativo
