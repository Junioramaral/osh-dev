import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMinutes } from "date-fns";

export interface QueueWorkloadMetrics {
  queue_id: string | null;
  queue_name: string;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  pending_tickets: number;
  sla_met_count: number;
  sla_met_rate: number;
  avg_resolution_minutes: number;
  percentage: number;
}

interface UseQueueWorkloadDataProps {
  startDate: Date;
  endDate: Date;
  segment?: string;
}

export const useQueueWorkloadData = ({
  startDate,
  endDate,
  segment,
}: UseQueueWorkloadDataProps) => {
  return useQuery({
    queryKey: ["queue-workload", startDate.toISOString(), endDate.toISOString(), segment],
    queryFn: async () => {
      // 1. Fetch all active queues
      const { data: queues, error: queuesError } = await supabase
        .from("queues")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");

      if (queuesError) throw queuesError;

      // 2. Fetch tickets in the period
      let query = supabase
        .from("tickets")
        .select("id, queue_id, status, created_at, resolved_at, sla_resolution_met")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (segment && segment !== "all") {
        query = query.eq("segment", segment as "DB" | "APP");
      }

      const { data: tickets, error: ticketsError } = await query;

      if (ticketsError) throw ticketsError;

      // Create queue name lookup
      const queueNameMap = new Map<string, string>();
      queues?.forEach(q => queueNameMap.set(q.id, q.name));

      // 3. Group by queue_id and calculate metrics
      const queueMap = new Map<string, {
        queue_id: string | null;
        queue_name: string;
        total_tickets: number;
        open_tickets: number;
        resolved_tickets: number;
        pending_tickets: number;
        sla_met_count: number;
        resolution_times: number[];
      }>();

      // Initialize with all queues (even those with 0 tickets)
      queues?.forEach(q => {
        queueMap.set(q.id, {
          queue_id: q.id,
          queue_name: q.name,
          total_tickets: 0,
          open_tickets: 0,
          resolved_tickets: 0,
          pending_tickets: 0,
          sla_met_count: 0,
          resolution_times: [],
        });
      });

      // Add unassigned bucket
      const UNASSIGNED_KEY = "__unassigned__";
      queueMap.set(UNASSIGNED_KEY, {
        queue_id: null,
        queue_name: "Sem Fila Atribuída",
        total_tickets: 0,
        open_tickets: 0,
        resolved_tickets: 0,
        pending_tickets: 0,
        sla_met_count: 0,
        resolution_times: [],
      });

      // Process tickets
      tickets?.forEach(ticket => {
        const key = ticket.queue_id || UNASSIGNED_KEY;
        
        // Get or create bucket (for unknown queue_ids)
        if (!queueMap.has(key)) {
          queueMap.set(key, {
            queue_id: ticket.queue_id,
            queue_name: queueNameMap.get(ticket.queue_id!) || "Fila Desconhecida",
            total_tickets: 0,
            open_tickets: 0,
            resolved_tickets: 0,
            pending_tickets: 0,
            sla_met_count: 0,
            resolution_times: [],
          });
        }

        const metrics = queueMap.get(key)!;
        metrics.total_tickets++;

        // Status classification
        if (ticket.status === "novo" || ticket.status === "em_atendimento") {
          metrics.open_tickets++;
        } else if (ticket.status === "resolvido" || ticket.status === "fechado") {
          metrics.resolved_tickets++;
          
          // Calculate resolution time
          if (ticket.resolved_at && ticket.created_at) {
            const resolutionTime = differenceInMinutes(
              new Date(ticket.resolved_at),
              new Date(ticket.created_at)
            );
            if (resolutionTime > 0) {
              metrics.resolution_times.push(resolutionTime);
            }
          }
        } else if (ticket.status === "aguardando_cliente") {
          metrics.pending_tickets++;
        }

        // SLA tracking
        if (ticket.sla_resolution_met === true) {
          metrics.sla_met_count++;
        }
      });

      // Calculate total for percentage
      const totalTickets = tickets?.length || 0;

      // Build final metrics array
      const queueMetrics: QueueWorkloadMetrics[] = [];
      let unassignedMetrics: QueueWorkloadMetrics | null = null;

      queueMap.forEach((metrics, key) => {
        const avgResolution = metrics.resolution_times.length > 0
          ? Math.round(metrics.resolution_times.reduce((a, b) => a + b, 0) / metrics.resolution_times.length)
          : 0;

        const slaRate = metrics.total_tickets > 0
          ? Math.round((metrics.sla_met_count / metrics.total_tickets) * 100)
          : 0;

        const percentage = totalTickets > 0
          ? Math.round((metrics.total_tickets / totalTickets) * 100)
          : 0;

        const result: QueueWorkloadMetrics = {
          queue_id: metrics.queue_id,
          queue_name: metrics.queue_name,
          total_tickets: metrics.total_tickets,
          open_tickets: metrics.open_tickets,
          resolved_tickets: metrics.resolved_tickets,
          pending_tickets: metrics.pending_tickets,
          sla_met_count: metrics.sla_met_count,
          sla_met_rate: slaRate,
          avg_resolution_minutes: avgResolution,
          percentage,
        };

        if (key === UNASSIGNED_KEY) {
          unassignedMetrics = result;
        } else {
          queueMetrics.push(result);
        }
      });

      // Sort by total tickets descending
      queueMetrics.sort((a, b) => b.total_tickets - a.total_tickets);

      // Calculate overall metrics
      const overallResolutionTimes: number[] = [];
      let overallSlaMetCount = 0;
      
      queueMap.forEach(m => {
        overallResolutionTimes.push(...m.resolution_times);
        overallSlaMetCount += m.sla_met_count;
      });

      const avgOverallResolution = overallResolutionTimes.length > 0
        ? Math.round(overallResolutionTimes.reduce((a, b) => a + b, 0) / overallResolutionTimes.length)
        : 0;

      const overallSlaRate = totalTickets > 0
        ? Math.round((overallSlaMetCount / totalTickets) * 100)
        : 0;

      return {
        queues: queueMetrics,
        unassigned: unassignedMetrics,
        overall: {
          total_tickets: totalTickets,
          total_queues: queueMetrics.filter(q => q.total_tickets > 0).length,
          unassigned_tickets: unassignedMetrics?.total_tickets || 0,
          avg_resolution_minutes: avgOverallResolution,
          sla_rate: overallSlaRate,
        },
      };
    },
  });
};
