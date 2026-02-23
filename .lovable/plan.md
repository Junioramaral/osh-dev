

# Observacao RFC Apenas no Passo Concluido

## Mudanca

Remover o campo `observacao` do evento `rfc_step_started`, mantendo apenas no `rfc_step_completed`.

## Detalhe Tecnico

### Arquivo: `src/components/tickets/TicketTimeline.tsx`

- **Linha 187**: Remover `observacao: step.observacao` do bloco que cria o evento `rfc_step_started`
- O bloco `rfc_step_completed` (linha 207) permanece inalterado, mantendo a observacao

Apenas 1 linha removida. Nenhum outro arquivo ou funcionalidade afetado.

