## Causa raiz

A função `public.generate_ticket_number()` (trigger BEFORE INSERT em `tickets`) gera o número assim:

```sql
SELECT COUNT(*) + 1 + 101000 INTO counter FROM public.tickets;
NEW.ticket_number := LPAD(counter::TEXT, 8, '0');
```

Diagnóstico no banco:
- `COUNT(*) = 11`, `MAX(ticket_number::bigint) = 101012`, `MIN = 1`.
- Existem 2 tickets antigos com numeração baixa (sem offset) e 9 com offset `101000+`.
- Próximo número calculado = `11 + 1 + 101000 = 101012` → **já existe** → viola `tickets_ticket_number_key`.

Além disso, `COUNT(*)+1` é inerentemente frágil: qualquer ticket deletado no futuro vai recriar a colisão, e dois INSERTs concorrentes geram o mesmo número.

## Correção proposta

Substituir a função por uma versão baseada no **maior número já existente** (com piso no offset), e adicionar retry em caso de colisão concorrente:

```sql
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num BIGINT;
  ticket_offset BIGINT := 101000;
  attempts INT := 0;
BEGIN
  LOOP
    SELECT GREATEST(
             COALESCE(MAX(ticket_number::BIGINT), ticket_offset),
             ticket_offset
           ) + 1
      INTO next_num
      FROM public.tickets
     WHERE ticket_number ~ '^[0-9]+$';

    NEW.ticket_number := LPAD(next_num::TEXT, 8, '0');

    -- valida unicidade antes de devolver
    IF NOT EXISTS (
      SELECT 1 FROM public.tickets WHERE ticket_number = NEW.ticket_number
    ) THEN
      RETURN NEW;
    END IF;

    attempts := attempts + 1;
    EXIT WHEN attempts >= 5;
  END LOOP;

  RAISE EXCEPTION 'Não foi possível gerar ticket_number único após % tentativas', attempts;
END;
$$;
```

Por que essa abordagem:
- Usa `MAX(...)+1` → imune a deleções e ao estado atual (11 tickets vs. max 101012).
- `GREATEST(..., offset)` preserva o piso de `101000`.
- Filtro `~ '^[0-9]+$'` ignora qualquer número não-numérico legado.
- Loop com até 5 tentativas evita falha em INSERTs concorrentes (a constraint `UNIQUE` continua sendo a fonte de verdade).

## Escopo

- 1 migração SQL apenas (substituição da função). Trigger e tabela não mudam.
- Sem alterações em código frontend.
- Sem backfill dos tickets existentes (numeração legada preservada).

## Validação após aplicar

1. Criar um ticket novo para ATPPOA → deve sair com `00101013`.
2. Criar um segundo ticket → `00101014`.