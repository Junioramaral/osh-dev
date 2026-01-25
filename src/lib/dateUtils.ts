import { formatDistanceToNow, differenceInHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata uma data de forma inteligente:
 * - Se menos de 24h: mostra tempo relativo ("há 2 horas")
 * - Se mais de 24h: mostra data/hora ("25/01/2026 às 19:30")
 */
export function formatSmartDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  const hoursDiff = differenceInHours(now, dateObj);
  
  if (hoursDiff < 24) {
    // Menos de 24h: tempo relativo
    return formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: ptBR 
    });
  } else {
    // Mais de 24h: data e hora exatas
    return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { 
      locale: ptBR 
    });
  }
}
