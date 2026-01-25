import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMinutes } from "date-fns";

export interface ClosureRankingMetrics {
  analyst_id: string;
  analyst_name: string;
  total_resolved: number;
  avg_resolution_minutes: number;
  min_resolution_minutes: number;
  max_resolution_minutes: number;
  volume_rank: number;
  speed_rank: number;
  combined_score: number;
}

export interface ClosureRankingData {
  rankings: ClosureRankingMetrics[];
  top_volume: ClosureRankingMetrics | null;
  top_speed: ClosureRankingMetrics | null;
  overall: {
    total_resolved: number;
    avg_resolution_minutes: number;
    total_analysts: number;
  };
}

interface UseClosureRankingDataProps {
  startDate: string;
  endDate: string;
  segment?: string;
  clientId?: string;
}

export function useClosureRankingData({ startDate, endDate, segment, clientId }: UseClosureRankingDataProps) {
  return useQuery({
    queryKey: ["closure-ranking-data", startDate, endDate, segment, clientId],
    queryFn: async (): Promise<ClosureRankingData> => {
      let query = supabase
        .from("tickets")
        .select(`
          id,
          created_at,
          resolved_at,
          analyst_id,
          profiles!tickets_analyst_id_fkey(full_name)
        `)
        .not("resolved_at", "is", null)
        .not("analyst_id", "is", null)
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

      // Group by analyst
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

      // Calculate metrics per analyst
      const analystMetrics: ClosureRankingMetrics[] = Array.from(analystMap.entries())
        .map(([analyst_id, data]) => ({
          analyst_id,
          analyst_name: data.name,
          total_resolved: data.times.length,
          avg_resolution_minutes: Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length),
          min_resolution_minutes: Math.min(...data.times),
          max_resolution_minutes: Math.max(...data.times),
          volume_rank: 0,
          speed_rank: 0,
          combined_score: 0,
        }));

      // Sort by volume (descending) and assign volume rank
      const sortedByVolume = [...analystMetrics].sort((a, b) => b.total_resolved - a.total_resolved);
      sortedByVolume.forEach((analyst, index) => {
        const original = analystMetrics.find(a => a.analyst_id === analyst.analyst_id);
        if (original) original.volume_rank = index + 1;
      });

      // Sort by speed (ascending - lower is better) and assign speed rank
      const sortedBySpeed = [...analystMetrics].sort((a, b) => a.avg_resolution_minutes - b.avg_resolution_minutes);
      sortedBySpeed.forEach((analyst, index) => {
        const original = analystMetrics.find(a => a.analyst_id === analyst.analyst_id);
        if (original) original.speed_rank = index + 1;
      });

      // Calculate combined score (lower is better: avg of volume_rank and speed_rank)
      const totalAnalysts = analystMetrics.length;
      analystMetrics.forEach(analyst => {
        // Normalize ranks to 0-100 scale, then combine (higher score = better)
        const volumeScore = totalAnalysts > 1 ? ((totalAnalysts - analyst.volume_rank) / (totalAnalysts - 1)) * 50 : 50;
        const speedScore = totalAnalysts > 1 ? ((totalAnalysts - analyst.speed_rank) / (totalAnalysts - 1)) * 50 : 50;
        analyst.combined_score = Math.round(volumeScore + speedScore);
      });

      // Sort by combined score (descending)
      analystMetrics.sort((a, b) => b.combined_score - a.combined_score);

      // Overall metrics
      const allTimes = ticketsWithTime.map((t) => t.resolution_minutes);
      const overall = {
        total_resolved: allTimes.length,
        avg_resolution_minutes: allTimes.length > 0 
          ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length) 
          : 0,
        total_analysts: totalAnalysts,
      };

      // Top performers
      const top_volume = sortedByVolume[0] || null;
      const top_speed = sortedBySpeed[0] || null;

      return {
        rankings: analystMetrics,
        top_volume,
        top_speed,
        overall,
      };
    },
  });
}
