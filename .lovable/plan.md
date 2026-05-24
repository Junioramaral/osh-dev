## Problema

No `TicketHeader.tsx`, o badge "SLA Pausado" aparece duas vezes porque duas lógicas independentes renderizam o mesmo estado:

1. `calculateSLAStatus(ticket)` em `src/lib/ticketUtils.tsx` já retorna `type: 'paused'` com label "SLA Pausado" quando `ticket.sla_paused_at` está preenchido (adicionado na última iteração).
2. Um bloco extra `{ticket.sla_paused_at && <Badge>...SLA Pausado...</Badge>}` foi adicionado em paralelo no header.

## Correção

Remover o bloco duplicado em `src/components/tickets/TicketHeader.tsx`:

```tsx
{ticket.sla_paused_at && (
  <Badge variant="outline" className="bg-slate-200 ...">
    <Pause className="h-3 w-3 mr-1" />
    SLA Pausado
  </Badge>
)}
```

O badge continuará aparecendo via `slaStatus` (rota oficial), mantendo consistência com a lista de tickets e demais telas que já usam `calculateSLAStatus`.

Manter o badge "SLA Ajustado" (esse não é duplicado — não há equivalente em `calculateSLAStatus`).

Limpar o import `Pause` de `lucide-react` se não for mais usado no arquivo (manter `Sliders` pois "SLA Ajustado" continua).

## Escopo

- Apenas `src/components/tickets/TicketHeader.tsx`.
- Sem mudanças de banco, hooks ou outros componentes.
