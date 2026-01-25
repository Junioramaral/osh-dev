import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface MonthlyVolumeData {
  month: string;       // "2026-01"
  monthLabel: string;  // "Jan/26"
  abertos: number;     // Tickets created in the month
  fechados: number;    // Tickets resolved in the month
}

export const useMonthlyTicketVolume = (
  clientId: string | null,
  monthsToFetch: number = 12
) => {
  return useQuery({
    queryKey: ["monthly-ticket-volume", clientId, monthsToFetch],
    queryFn: async (): Promise<MonthlyVolumeData[]> => {
      const now = new Date();
      const startDate = startOfMonth(subMonths(now, monthsToFetch - 1));
      const endDate = endOfMonth(now);

      // Build query for tickets created in the period
      let createdQuery = supabase
        .from("tickets")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Build query for tickets resolved in the period
      let resolvedQuery = supabase
        .from("tickets")
        .select("resolved_at")
        .not("resolved_at", "is", null)
        .gte("resolved_at", startDate.toISOString())
        .lte("resolved_at", endDate.toISOString());

      // Filter by client if provided
      if (clientId) {
        createdQuery = createdQuery.eq("client_id", clientId);
        resolvedQuery = resolvedQuery.eq("client_id", clientId);
      }

      const [createdResult, resolvedResult] = await Promise.all([
        createdQuery,
        resolvedQuery,
      ]);

      if (createdResult.error) throw createdResult.error;
      if (resolvedResult.error) throw resolvedResult.error;

      // Generate all months in the range
      const months: MonthlyVolumeData[] = [];
      for (let i = monthsToFetch - 1; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthKey = format(monthDate, "yyyy-MM");
        const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });
        
        months.push({
          month: monthKey,
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          abertos: 0,
          fechados: 0,
        });
      }

      // Count tickets created per month
      (createdResult.data || []).forEach((ticket) => {
        if (ticket.created_at) {
          const monthKey = format(parseISO(ticket.created_at), "yyyy-MM");
          const monthData = months.find((m) => m.month === monthKey);
          if (monthData) {
            monthData.abertos++;
          }
        }
      });

      // Count tickets resolved per month
      (resolvedResult.data || []).forEach((ticket) => {
        if (ticket.resolved_at) {
          const monthKey = format(parseISO(ticket.resolved_at), "yyyy-MM");
          const monthData = months.find((m) => m.month === monthKey);
          if (monthData) {
            monthData.fechados++;
          }
        }
      });

      return months;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for report data - fetches 6 months relative to a specific month/year
export const useMonthlyTicketVolumeForReport = (
  clientId: string | null,
  referenceMonth: number,
  referenceYear: number
) => {
  return useQuery({
    queryKey: ["monthly-ticket-volume-report", clientId, referenceMonth, referenceYear],
    queryFn: async (): Promise<MonthlyVolumeData[]> => {
      // Reference date is the end of the reference month
      const referenceDate = endOfMonth(new Date(referenceYear, referenceMonth - 1));
      const startDate = startOfMonth(subMonths(referenceDate, 5)); // 6 months back

      // Build query for tickets created in the period
      let createdQuery = supabase
        .from("tickets")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", referenceDate.toISOString());

      // Build query for tickets resolved in the period
      let resolvedQuery = supabase
        .from("tickets")
        .select("resolved_at")
        .not("resolved_at", "is", null)
        .gte("resolved_at", startDate.toISOString())
        .lte("resolved_at", referenceDate.toISOString());

      // Filter by client if provided
      if (clientId) {
        createdQuery = createdQuery.eq("client_id", clientId);
        resolvedQuery = resolvedQuery.eq("client_id", clientId);
      }

      const [createdResult, resolvedResult] = await Promise.all([
        createdQuery,
        resolvedQuery,
      ]);

      if (createdResult.error) throw createdResult.error;
      if (resolvedResult.error) throw resolvedResult.error;

      // Generate the 6 months
      const months: MonthlyVolumeData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(referenceDate, i);
        const monthKey = format(monthDate, "yyyy-MM");
        const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });
        
        months.push({
          month: monthKey,
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          abertos: 0,
          fechados: 0,
        });
      }

      // Count tickets created per month
      (createdResult.data || []).forEach((ticket) => {
        if (ticket.created_at) {
          const monthKey = format(parseISO(ticket.created_at), "yyyy-MM");
          const monthData = months.find((m) => m.month === monthKey);
          if (monthData) {
            monthData.abertos++;
          }
        }
      });

      // Count tickets resolved per month
      (resolvedResult.data || []).forEach((ticket) => {
        if (ticket.resolved_at) {
          const monthKey = format(parseISO(ticket.resolved_at), "yyyy-MM");
          const monthData = months.find((m) => m.month === monthKey);
          if (monthData) {
            monthData.fechados++;
          }
        }
      });

      return months;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
};
