## Corrigir cálculo de pausas SLA (P3/P4) e melhorar visibilidade

Aplicar as três opções discutidas para tornar o cálculo de tempo descontado por pausa correto e auditável.

### Opção A — Corrigir pausa em horário útil (P3/P4)

**Problema:** `handle_sla_pause` calcula `pause_minutes` como tempo corrido (`now() - sla_paused_at`) e empurra os deadlines pela mesma quantidade. Para P3/P4, cujos deadlines foram montados em minutos úteis (`add_business_minutes`), isso gera deslocamento excessivo (ex.: pausa no fim de sexta retomada na segunda → empurra ~64h de calendário, mas só ~1h útil foi perdida).

**Mudança:**
1. Criar função SQL `business_minutes_between(_start, _end)` espelhando a lógica de `add_business_minutes` (mesmas configs `business_hours_start/end`, `business_days`, mesma exclusão de `sla_holidays`, mesmo TZ `America/Sao_Paulo`).
2. Atualizar `handle_sla_pause`: ao retomar, identificar se o ticket é P3/P4. Se sim, calcular `pause_minutes` via `business_minutes_between(OLD.sla_paused_at, now())` e empurrar os deadlines com `add_business_minutes(deadline, pause_minutes)` em vez de adicionar intervalo bruto. P1/P2 mantêm o comportamento atual (tempo corrido).
3. `sla_paused_total_minutes` passa a refletir minutos úteis em P3/P4 e minutos corridos em P1/P2 (consistente com a unidade de cada SLA).
4. Persistir o `pause_minutes` calculado em `ticket_sla_pauses` (já é feito hoje, apenas a fonte muda).

> Observação: pausas históricas existentes não são recalculadas — só novas retomadas usam a nova lógica.

### Opção B — Métrica "Tempo em Pausa" baseada em dados reais

Em `SLAMetricsCards`:
1. Aceitar prop opcional `pauses` (vinda de `useTicketSLAPauses`) e somar `pause_minutes` finalizados + (para pausas abertas) o intervalo até agora.
2. Em P3/P4, somar usando a mesma lógica de horário útil que estará na coluna nova (Opção C) para coerência visual com o histórico.
3. Quando `pauses` existir, usar esse total no card "Tempo em Pausa" e recalcular Eficiência como `usefulMinutes / (usefulMinutes + pauseMinutes)`. Fallback para a heurística atual quando não houver dados.
4. `TicketSLATab` passa a buscar via `useTicketSLAPauses(ticket.id)` e injeta em `SLAMetricsCards` e `SLAHistoryTable`.

### Opção C — Coluna "Descontado do SLA" em `SLAHistoryTable`

Em `src/components/tickets/SLAHistoryTable.tsx`:
1. Adicionar coluna "Descontado do SLA" exibindo:
   - P1/P2: igual a `pause_minutes` (tempo corrido).
   - P3/P4: minutos úteis entre `paused_at` e `resumed_at` (`calculateBusinessMinutes` do `businessHours.ts`, com feriados do projeto se disponíveis).
   - Pausa aberta: calcular até `now()` e marcar como "em curso".
2. Linha de total no rodapé com o somatório descontado.
3. Tooltip explicando: "Para P3/P4 contamos apenas horário útil (09–18, dias úteis). Para P1/P2 o tempo é corrido (24x7)."

### Arquivos impactados

- Migration nova: função `business_minutes_between` + replace de `handle_sla_pause`.
- `src/components/tickets/SLAMetricsCards.tsx` — nova prop `pauses`, recálculo.
- `src/components/tickets/SLAHistoryTable.tsx` — nova coluna + total.
- `src/components/tickets/TicketSLATab.tsx` — buscar pausas e propagar.
- (Sem alterações em `calculate_sla_deadlines`, `useTicketSLAPauses` ou tipos.)

### Fora do escopo

- Retroagir pausas já fechadas no banco.
- Mudar exclusão de RFCs (continua igual).
- Ajustes em `SLATimelineChart` ou notificações.
