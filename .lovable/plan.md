

# SLA em Horas Úteis (Business Hours) para P3 e P4

## Contexto

Atualmente, **todos os SLAs** (P1 a P4) são calculados em horas corridas (24x7). O mercado tipicamente usa:
- **P1/P2**: horas corridas (24x7) — urgência alta, atendimento contínuo
- **P3/P4**: horas úteis (business hours) — atendimento em horário comercial

O pedido é implementar SLA em horas úteis para P3 e P4, onde o relógio pausa fora do horário comercial e em fins de semana.

## Impacto da Mudança

Esta é uma mudança **significativa** que afeta múltiplas camadas:

### 1. Configuração de Business Hours (novo)
- Adicionar na tabela `system_configs` as configurações de horário comercial:
  - `business_hours_start`: hora de início (ex: "09:00")
  - `business_hours_end`: hora de fim (ex: "18:00")
  - `business_days`: dias úteis (ex: [1,2,3,4,5] = seg-sex)
- Criar UI em SystemSettings para configurar esses valores

### 2. Trigger `calculate_sla_deadlines()` (backend — migração SQL)
- Para P1/P2: manter cálculo atual (horas corridas)
- Para P3/P4: calcular deadline somando apenas horas úteis
  - Criar função SQL `add_business_minutes(start_time, minutes)` que avança o relógio pulando horários fora do expediente e fins de semana
  - A função consulta `system_configs` para obter os parâmetros de horário comercial
  - Exemplo: ticket P3 aberto sexta 17h com SLA de 960min (16h úteis) → deadline será terça ~15h

### 3. Frontend — `calculateSLAStatus()` em `ticketUtils.tsx`
- Para P3/P4: calcular tempo decorrido e restante usando apenas business hours
- Criar função `calculateBusinessMinutes(startDate, endDate, businessStart, businessEnd, businessDays)` que conta apenas minutos dentro do expediente
- Ajustar cálculo de percentage e timeRemaining

### 4. SLA Monitor Edge Function
- Para P3/P4: verificar se estamos dentro do horário comercial antes de considerar warning/overdue
- Ajustar o cálculo de `minutesRemaining` para considerar apenas horas úteis restantes

### 5. SLA History/Metrics (componentes existentes)
- `SLAMetricsCards.tsx`: ajustar "Tempo Útil" para P3/P4 usando business hours
- `SLAHistoryTable.tsx`: ajustar "Tempo Usado" e "% Usado" para P3/P4
- Indicar visualmente quais tickets usam SLA em horas úteis vs. corridas

### 6. Reports
- Hooks de relatórios (`useResolutionTimeData`, `useAnalystPerformanceData`, etc.) que calculam médias de resolução precisariam considerar business hours para P3/P4

## Arquivos Afetados

| Camada | Arquivo | Mudança |
|--------|---------|---------|
| DB | Nova migração SQL | Função `add_business_minutes()` e atualizar `calculate_sla_deadlines()` |
| DB | Nova migração SQL | Inserir configs padrão em `system_configs` |
| Frontend | `src/lib/ticketUtils.tsx` | Função `calculateBusinessMinutes()` e ajustar `calculateSLAStatus()` |
| Frontend | `src/pages/SystemSettings.tsx` | UI para configurar horário comercial |
| Edge Function | `supabase/functions/sla-monitor/index.ts` | Ajustar cálculo de minutos restantes para P3/P4 |
| Frontend | `src/components/tickets/SLAMetricsCards.tsx` | Considerar business hours nas métricas |
| Frontend | `src/components/tickets/SLAHistoryTable.tsx` | Considerar business hours no histórico |

## Complexidade e Riscos

- **Alta complexidade**: lógica de business hours é notoriamente difícil de acertar (fusos horários, feriados)
- **Feriados**: não incluídos nesta versão inicial, mas pode ser adicionado depois (tabela de feriados por cliente)
- **Tickets existentes**: os deadlines já calculados em horas corridas não seriam recalculados retroativamente (apenas novos tickets)
- **Fuso horário**: usar America/Sao_Paulo como referência (já usado no sla-monitor)

## Sugestão de Faseamento

**Fase 1** (esta implementação):
- Configuração de business hours em `system_configs`
- Função SQL `add_business_minutes()` para calcular deadlines
- Atualizar trigger para P3/P4
- Frontend: `calculateBusinessMinutes()` para exibição correta de SLA status
- SLA Monitor: ajustar para P3/P4

**Fase 2** (futuro):
- Tabela de feriados por cliente
- Recalcular tickets existentes
- Horários comerciais por cliente (se necessário)

