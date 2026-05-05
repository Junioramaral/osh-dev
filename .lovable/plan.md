# Ajustar numeração de tickets para começar em 00101011

## Situação atual

- Existem **10 tickets** no banco, com `ticket_number` indo de `00000001` a `00000010`.
- A função `generate_ticket_number()` calcula o próximo número via `SELECT COUNT(*) + 1 FROM tickets`, gerando sempre números pequenos e sequenciais a partir de 1.
- O usuário quer que o próximo ticket seja **00101011**, dando aparência de uma base com muitos chamados.

## Estratégia

Adicionar um **offset configurável** para que a numeração exibida seja `(COUNT + offset)` mantendo o padrão de 8 dígitos com `LPAD`. Os 10 tickets existentes ficam preservados (não vamos renumerar histórico) e o **próximo ticket** sai como `00101011`.

Para que `count(*) + 1 + offset = 101011` com `count = 10`, o offset é **101000**.

## Mudanças

### 1. Migration: alterar a função `generate_ticket_number()`

```sql
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  counter INTEGER;
  ticket_offset INTEGER := 101000;
BEGIN
  SELECT COUNT(*) + 1 + ticket_offset INTO counter FROM public.tickets;
  NEW.ticket_number := LPAD(counter::TEXT, 8, '0');
  RETURN NEW;
END;
$function$;
```

- Próximo ticket após os 10 atuais → `LPAD(10 + 1 + 101000, 8, '0')` = **00101011** ✓
- Os 10 tickets antigos (`00000001`–`00000010`) permanecem intactos.
- O padrão de 8 dígitos é mantido (suporta até ~99 milhões).

### 2. Sem alterações de frontend

A coluna `ticket_number` continua sendo `text` de 8 caracteres — todas as telas (`Tickets.tsx`, `MyTickets.tsx`, `TicketRow`, `TicketCreatedDialog`, e-mails, busca por número) continuam funcionando sem ajustes.

## Pontos de atenção

- **Ordenação**: alguns lugares (ex.: `MyTickets.tsx`) ordenam por `parseInt(ticket_number, 10)`. Como os novos números (101011+) são maiores que os antigos (1–10), a ordem decrescente continua correta — novos aparecem primeiro.
- **Sem renumeração** dos 10 tickets existentes (evita quebrar referências em e-mails, comentários por `Reply-To: ticket-{number}@...`, links já enviados).
- O salto de `00000010` para `00101011` é intencional e desejado pelo usuário.

## Arquivo alterado

- Nova migration SQL alterando `public.generate_ticket_number()`.
