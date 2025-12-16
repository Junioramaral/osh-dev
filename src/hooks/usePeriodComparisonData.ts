import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

export interface PeriodMetrics {
  total_tickets: number;
  resolved_tickets: number;
  pending_tickets: number;
  sla_met_count: number;
  sla_met_rate: number;
  tickets_by_priority: { P1: number; P2: number; P3: number; P4: number };
  tickets_by_segment: { DB: number; APP: number };
}

interface UsePeriodComparisonDataProps {
  periodA: { month: number; year: number };
  periodB: { month: number; year: number };
  clientId?: string;
}

const fetchPeriodMetrics = async (month: number, year: number, clientId?: string): Promise<PeriodMetrics> => {
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));

  let query = supabase
    .from("tickets")
    .select("id, priority, segment, status, sla_resolution_met")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data: tickets, error } = await query;

  if (error) throw error;

  const metrics: PeriodMetrics = {
    total_tickets: tickets?.length || 0,
    resolved_tickets: 0,
    pending_tickets: 0,
    sla_met_count: 0,
    sla_met_rate: 0,
    tickets_by_priority: { P1: 0, P2: 0, P3: 0, P4: 0 },
    tickets_by_segment: { DB: 0, APP: 0 },
  };

  tickets?.forEach((ticket) => {
    if (ticket.status === "resolvido" || ticket.status === "fechado") {
      metrics.resolved_tickets++;
    } else {
      metrics.pending_tickets++;
    }

    if (ticket.sla_resolution_met === true) {
      metrics.sla_met_count++;
    }

    const priority = ticket.priority as "P1" | "P2" | "P3" | "P4";
    if (priority in metrics.tickets_by_priority) {
      metrics.tickets_by_priority[priority]++;
    }

    const segment = ticket.segment as "DB" | "APP";
    if (segment in metrics.tickets_by_segment) {
      metrics.tickets_by_segment[segment]++;
    }
  });

  metrics.sla_met_rate = metrics.total_tickets > 0
    ? Math.round((metrics.sla_met_count / metrics.total_tickets) * 100)
    : 0;

  return metrics;
};

export const usePeriodComparisonData = ({
  periodA,
  periodB,
  clientId,
}: UsePeriodComparisonDataProps) => {
  return useQuery({
    queryKey: ["period-comparison", periodA, periodB, clientId],
    queryFn: async () => {
      const [metricsA, metricsB] = await Promise.all([
        fetchPeriodMetrics(periodA.month, periodA.year, clientId),
        fetchPeriodMetrics(periodB.month, periodB.year, clientId),
      ]);

      const calculateVariation = (a: number, b: number) => {
        if (b === 0) return a > 0 ? 100 : 0;
        return Math.round(((a - b) / b) * 100);
      };

      return {
        periodA: metricsA,
        periodB: metricsB,
        variations: {
          total: calculateVariation(metricsA.total_tickets, metricsB.total_tickets),
          resolved: calculateVariation(metricsA.resolved_tickets, metricsB.resolved_tickets),
          sla: metricsA.sla_met_rate - metricsB.sla_met_rate,
        },
      };
    },
  });
};
