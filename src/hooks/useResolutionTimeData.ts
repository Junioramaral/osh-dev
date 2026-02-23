import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMinutes } from "date-fns";

export interface AnalystResolutionMetrics {
  analyst_id: string;
  analyst_name: string;
  total_resolved: number;
  avg_resolution_minutes: number;
  min_resolution_minutes: number;
  max_resolution_minutes: number;
}

export interface CategoryResolutionMetrics {
  category: string;
  total_resolved: number;
  avg_resolution_minutes: number;
}

export interface PriorityResolutionMetrics {
  priority: string;
  total_resolved: number;
  avg_resolution_minutes: number;
}

export interface ResolutionTimeData {
  by_analyst: AnalystResolutionMetrics[];
  by_category: CategoryResolutionMetrics[];
  by_priority: PriorityResolutionMetrics[];
  overall: {
    total_resolved: number;
    avg_resolution_minutes: number;
    median_resolution_minutes: number;
    min_resolution_minutes: number;
    max_resolution_minutes: number;
  };
}

interface UseResolutionTimeDataProps {
  startDate: string;
  endDate: string;
  segment?: string;
  clientId?: string;
}

export function useResolutionTimeData({ startDate, endDate, segment, clientId }: UseResolutionTimeDataProps) {
  return useQuery({
    queryKey: ["resolution-time-data", startDate, endDate, segment, clientId],
    queryFn: async (): Promise<ResolutionTimeData> => {
      let query = supabase
        .from("tickets")
        .select(`
          id,
          created_at,
          resolved_at,
          category,
          priority,
          analyst_id,
          profiles!tickets_analyst_id_fkey(full_name)
        `)
        .not("resolved_at", "is", null)
        .neq("record_type", "rfc")
        .gte("resolved_at", startDate)
        .lte("resolved_at", endDate);

      if (segment && segment !== "all") {
        query = query.eq("segment", segment as "DB" | "APP");
      }

      if (clientId && clientId !== "all") {
        query = query.eq("client_id", clientId);
      }

      const { data: tickets, error } = await query;

      if (error) throw error;

      // Calculate resolution times for each ticket
      const ticketsWithTime = (tickets || []).map((ticket: any) => {
        const resolutionMinutes = differenceInMinutes(
          new Date(ticket.resolved_at),
          new Date(ticket.created_at)
        );
        return {
          ...ticket,
          resolution_minutes: Math.max(0, resolutionMinutes),
        };
      });

      // Overall metrics
      const allTimes = ticketsWithTime.map((t) => t.resolution_minutes).sort((a, b) => a - b);
      const overall = {
        total_resolved: allTimes.length,
        avg_resolution_minutes: allTimes.length > 0 
          ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length) 
          : 0,
        median_resolution_minutes: allTimes.length > 0 
          ? allTimes[Math.floor(allTimes.length / 2)] 
          : 0,
        min_resolution_minutes: allTimes.length > 0 ? Math.min(...allTimes) : 0,
        max_resolution_minutes: allTimes.length > 0 ? Math.max(...allTimes) : 0,
      };

      // By analyst
      const analystMap = new Map<string, { name: string; times: number[] }>();
      ticketsWithTime.forEach((ticket) => {
        if (ticket.analyst_id) {
          const existing = analystMap.get(ticket.analyst_id);
          const analystName = ticket.profiles?.full_name || "Não atribuído";
          if (existing) {
            existing.times.push(ticket.resolution_minutes);
          } else {
            analystMap.set(ticket.analyst_id, { name: analystName, times: [ticket.resolution_minutes] });
          }
        }
      });

      const by_analyst: AnalystResolutionMetrics[] = Array.from(analystMap.entries())
        .map(([analyst_id, data]) => ({
          analyst_id,
          analyst_name: data.name,
          total_resolved: data.times.length,
          avg_resolution_minutes: Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length),
          min_resolution_minutes: Math.min(...data.times),
          max_resolution_minutes: Math.max(...data.times),
        }))
        .sort((a, b) => a.avg_resolution_minutes - b.avg_resolution_minutes);

      // By category
      const categoryMap = new Map<string, number[]>();
      ticketsWithTime.forEach((ticket) => {
        const cat = ticket.category || "Sem categoria";
        const existing = categoryMap.get(cat);
        if (existing) {
          existing.push(ticket.resolution_minutes);
        } else {
          categoryMap.set(cat, [ticket.resolution_minutes]);
        }
      });

      const by_category: CategoryResolutionMetrics[] = Array.from(categoryMap.entries())
        .map(([category, times]) => ({
          category,
          total_resolved: times.length,
          avg_resolution_minutes: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        }))
        .sort((a, b) => b.total_resolved - a.total_resolved);

      // By priority
      const priorityMap = new Map<string, number[]>();
      ticketsWithTime.forEach((ticket) => {
        const pri = ticket.priority || "N/A";
        const existing = priorityMap.get(pri);
        if (existing) {
          existing.push(ticket.resolution_minutes);
        } else {
          priorityMap.set(pri, [ticket.resolution_minutes]);
        }
      });

      const by_priority: PriorityResolutionMetrics[] = Array.from(priorityMap.entries())
        .map(([priority, times]) => ({
          priority,
          total_resolved: times.length,
          avg_resolution_minutes: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        }))
        .sort((a, b) => {
          const order = ["P1", "P2", "P3", "P4"];
          return order.indexOf(a.priority) - order.indexOf(b.priority);
        });

      return {
        by_analyst,
        by_category,
        by_priority,
        overall,
      };
    },
  });
}
