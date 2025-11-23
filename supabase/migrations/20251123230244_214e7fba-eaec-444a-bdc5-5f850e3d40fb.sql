-- Remover todos os triggers relacionados
DROP TRIGGER IF EXISTS set_ticket_number ON tickets;
DROP TRIGGER IF EXISTS generate_ticket_number_trigger ON tickets;

-- Remover função antiga com CASCADE
DROP FUNCTION IF EXISTS public.generate_ticket_number() CASCADE;

-- Criar nova função para gerar número sequencial de 8 dígitos
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  counter INTEGER;
BEGIN
  -- Pegar contador global (todos os segmentos)
  SELECT COUNT(*) + 1 INTO counter FROM public.tickets;
  
  -- Gerar número com 8 dígitos
  NEW.ticket_number := LPAD(counter::TEXT, 8, '0');
  
  RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();