---
name: SLA Pause and Manual Adjustment
description: SLA pause via status, manual deadline adjustment with mandatory reason, and recalculation on priority change
type: feature
---
**Pause:** statuses in `system_configs.sla_pause_statuses` (default `aguardando_cliente`, `aguardando_aprovacao`) pause the SLA clock. Trigger `trg_handle_sla_pause` on tickets pushes both deadlines forward by paused duration on resume. Auditing in `ticket_sla_pauses`.

**Manual adjustment:** `SLAAdjustDialog` (sidebar button "Ajustar SLA", visible to otimizzo/super admins). Stores `sla_adjustment_reason` (min 10 chars), `sla_adjusted_by`, `sla_adjusted_at`. Original deadlines kept in `sla_first_response_deadline_original` / `sla_resolution_deadline_original`.

**Priority recalc:** changing priority opens `SLARecalculatePromptDialog` with opt-in checkbox to recalculate SLA from now() with reason.

**UI badges:** "SLA Pausado" (slate) and "SLA Ajustado" (amber) in `TicketHeader`. `calculateSLAStatus` returns `paused` type when `sla_paused_at` is set.

RFCs continue excluded from all SLA logic (record_type='rfc' check in trigger + util).
