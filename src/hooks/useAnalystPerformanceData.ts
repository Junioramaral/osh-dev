import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalystMetrics {
  analyst_id: string;
  analyst_name: string;
  total_tickets: number;
  resolved_tickets: number;
  sla_met_count: number;
  sla_met_rate: number;
  avg_resolution_hours: number;
  tickets_by_priority: { P1: number; P2: number; P3: number; P4: number };
  tickets_by_segment: { DB: number; APP: number };
  // CSAT metrics
  avg_csat_rating: number | null;
  csat_count: number;
  csat_distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

interface UseAnalystPerformanceDataProps {
  startDate: Date;
  endDate: Date;
  segment?: string;
  clientId?: string;
}

export const useAnalystPerformanceData = ({
  startDate,
  endDate,
  segment,
  clientId,
}: UseAnalystPerformanceDataProps) => {
  return useQuery({
    queryKey: ["analyst-performance", startDate.toISOString(), endDate.toISOString(), segment, clientId],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(`
          id,
          analyst_id,
          priority,
          segment,
          status,
          created_at,
          resolved_at,
          sla_resolution_met,
          csat_rating,
          profiles:analyst_id (full_name)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .not("analyst_id", "is", null);

      if (segment && segment !== "all") {
        query = query.eq("segment", segment as "DB" | "APP");
      }

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data: tickets, error } = await query;

      if (error) throw error;

      // Group by analyst
      const analystMap = new Map<string, AnalystMetrics>();

      tickets?.forEach((ticket) => {
        const analystId = ticket.analyst_id!;
        const analystName = (ticket.profiles as any)?.full_name || "Analista";

        if (!analystMap.has(analystId)) {
          analystMap.set(analystId, {
            analyst_id: analystId,
            analyst_name: analystName,
            total_tickets: 0,
            resolved_tickets: 0,
            sla_met_count: 0,
            sla_met_rate: 0,
            avg_resolution_hours: 0,
            tickets_by_priority: { P1: 0, P2: 0, P3: 0, P4: 0 },
            tickets_by_segment: { DB: 0, APP: 0 },
            avg_csat_rating: null,
            csat_count: 0,
            csat_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          });
        }

        const metrics = analystMap.get(analystId)!;
        metrics.total_tickets++;

        if (ticket.status === "resolvido" || ticket.status === "fechado") {
          metrics.resolved_tickets++;
        }

        if (ticket.sla_resolution_met === true) {
          metrics.sla_met_count++;
        }

        const priority = ticket.priority as "P1" | "P2" | "P3" | "P4";
        if (priority in metrics.tickets_by_priority) {
          metrics.tickets_by_priority[priority]++;
        }

        if (ticket.segment === "DB" || ticket.segment === "APP") {
          metrics.tickets_by_segment[ticket.segment]++;
        }

        // CSAT tracking
        if (ticket.csat_rating !== null && ticket.csat_rating >= 1 && ticket.csat_rating <= 5) {
          metrics.csat_count++;
          metrics.csat_distribution[ticket.csat_rating as 1 | 2 | 3 | 4 | 5]++;
        }
      });

      // Calculate rates and averages
      const analysts = Array.from(analystMap.values()).map((analyst) => {
        // Calculate average CSAT
        let avgCsat: number | null = null;
        if (analyst.csat_count > 0) {
          const totalCsatSum = 
            analyst.csat_distribution[1] * 1 +
            analyst.csat_distribution[2] * 2 +
            analyst.csat_distribution[3] * 3 +
            analyst.csat_distribution[4] * 4 +
            analyst.csat_distribution[5] * 5;
          avgCsat = totalCsatSum / analyst.csat_count;
        }

        return {
          ...analyst,
          sla_met_rate: analyst.total_tickets > 0 
            ? Math.round((analyst.sla_met_count / analyst.total_tickets) * 100) 
            : 0,
          avg_csat_rating: avgCsat,
        };
      });

      // Sort by total tickets descending
      analysts.sort((a, b) => b.total_tickets - a.total_tickets);

      return analysts;
    },
  });
};
