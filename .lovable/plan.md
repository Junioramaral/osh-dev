## Análise da situação atual

Hoje o sistema calcula o SLA **apenas no insert** do ticket (trigger `calculate_sla_deadlines`) com base em prioridade + segmento + cliente. Não há mecanismo para:

- Pausar o SLA enquanto aguarda o cliente (status `aguardando_cliente` existe, mas não pausa nada).
- Recalcular o prazo se a prioridade mudar depois.
- Estender o prazo manualmente com justificativa.
- Distinguir prazo original vs prazo ajustado.

Resultado: tickets estourados ficam "vermelhos" para sempre, mesmo quando o atraso não é responsabilidade do time.

---

## Proposta — 3 mecanismos complementares

### 1. Pausa automática de SLA por status

Adicionar suporte a "status que pausam o SLA". Quando o ticket entra em `aguardando_cliente` (ou `aguardando_aprovacao`), o relógio para. Quando volta para `em_atendimento`, retoma de onde parou — o deadline é empurrado pelo tempo total pausado.

Campos novos em `tickets`:
- `sla_paused_at` — quando entrou no status que pausa
- `sla_paused_total_minutes` — acumulado de minutos pausados
- `sla_first_response_deadline_original` / `sla_resolution_deadline_original` — snapshot do prazo original

Tabela nova `ticket_sla_pauses` (auditoria): `ticket_id, paused_at, resumed_at, status_during_pause, paused_by`.

Quais status pausam fica configurável em `system_configs` (chave `sla_pause_statuses`, default `["aguardando_cliente","aguardando_aprovacao"]`).

### 2. Recalcular SLA ao mudar prioridade

Quando a prioridade muda, oferecer no diálogo:
- **Manter prazo atual** (comportamento atual)
- **Recalcular SLA com a nova prioridade** (a partir de `now()`, não do `created_at`)

Registra no `ticket_history` com `action_type = 'sla_recalculated'` + motivo obrigatório.

### 3. Extensão manual de prazo (com justificativa)

Novo botão "Ajustar SLA" no `TicketSidebar`/`TicketSLATab`, visível para `analyst`, `tenant_admin`, `super_admin`. Abre diálogo com:
- Novo prazo de primeira resposta (opcional)
- Novo prazo de resolução (opcional)
- **Motivo obrigatório** (mín. 10 chars) — ex.: "Cliente solicitou extensão", "Análise complexa"

Campos novos em `tickets`:
- `sla_adjustment_reason` (text)
- `sla_adjusted_by` (uuid) / `sla_adjusted_at` (timestamptz)

O deadline atual é sobrescrito; o `_original` é preservado para relatórios. Registrado em `ticket_history`.

---

## Mudanças na UI

**`TicketSLATab` / `SLAHistoryTable`**
- Exibir duas colunas: "Prazo Original" e "Prazo Ajustado" (com badge "Estendido em Xh — motivo").
- Mostrar "⏸ SLA Pausado — Xh acumuladas" quando aplicável.
- Botão "Ajustar SLA" abrindo o novo diálogo.

**`TicketHeader`**
- Badge SLA passa a considerar pausas e prazo ajustado (não mais "vencido" se pausado).

**Indicador de pausa**
- Quando ticket está em status que pausa, mostrar ícone ⏸ ao lado do badge de status.

**Mudança de prioridade (componente já existente em `TicketDetails`)**
- Após selecionar nova prioridade, perguntar "Recalcular SLA?" com checkbox + campo de motivo.

**Relatórios (`AnalystPerformanceReport`, `MonthlyClientReport`, etc.)**
- Métrica de SLA passa a usar `sla_*_deadline` (ajustado) para "atingido", mas reportar separadamente quantos foram estendidos manualmente.
- RFC continua excluído de toda lógica de SLA (regra existente).

---

## Mudanças no banco (migrações)

1. `ALTER TABLE tickets` — colunas:
   - `sla_first_response_deadline_original timestamptz`
   - `sla_resolution_deadline_original timestamptz`
   - `sla_paused_at timestamptz`
   - `sla_paused_total_minutes integer DEFAULT 0`
   - `sla_adjustment_reason text`
   - `sla_adjusted_by uuid`
   - `sla_adjusted_at timestamptz`

2. Trigger `calculate_sla_deadlines` — popular também os campos `_original` no INSERT.

3. Nova trigger `handle_sla_pause` — em UPDATE de `status`:
   - Se entrou em status que pausa → setar `sla_paused_at = now()`.
   - Se saiu de status que pausa → calcular minutos da pausa, somar em `sla_paused_total_minutes`, empurrar ambos deadlines, inserir em `ticket_sla_pauses`, limpar `sla_paused_at`.

4. Nova tabela `ticket_sla_pauses` com RLS (mesmas regras de `ticket_history`: select via ticket, insert por sistema).

5. Config nova em `system_configs`: `sla_pause_statuses` (jsonb array).

---

## Escopo deixado de fora

- Recálculo automático ao mudar categoria/subcategoria (a estrutura atual de SLA não depende de categoria, só prioridade+segmento).
- Reabertura de tickets já fechados — fora desta entrega.
- Mudança nas regras de RFC (continua excluído do SLA).

---

## Entregáveis

1. Migração SQL (colunas, trigger de pausa, tabela de auditoria, config).
2. Atualizações de `useTicketActions` com `pauseSLA` implícito via mudança de status + `adjustSLA` + `recalculateSLA`.
3. Novo `SLAAdjustDialog` e `SLARecalculateDialog`.
4. Atualizações em `TicketSLATab`, `SLAHistoryTable`, `TicketSidebar`, `TicketHeader`, e cálculos do `ticketUtils.tsx`.
5. Atualização dos relatórios para diferenciar SLA original vs ajustado.
