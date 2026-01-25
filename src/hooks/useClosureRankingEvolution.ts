import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMinutes, format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface MonthlyAnalystMetrics {
  month: string;
  monthLabel: string;
  total_resolved: number;
  avg_resolution_minutes: number;
  csat_avg_rating: number;
  rank: number;
}

export interface AnalystEvolution {
  analyst_id: string;
  analyst_name: string;
  monthly_data: MonthlyAnalystMetrics[];
  trends: {
    volume: "improving" | "declining" | "stable";
    speed: "improving" | "declining" | "stable";
    csat: "improving" | "declining" | "stable";
  };
  growth: {
    volume_change: number;
    speed_change: number;
    csat_change: number;
  };
}

export interface EvolutionData {
  months: string[];
  monthLabels: string[];
  analysts: AnalystEvolution[];
  highlights: {
    top_volume_growth: AnalystEvolution | null;
    top_speed_improvement: AnalystEvolution | null;
    top_csat_improvement: AnalystEvolution | null;
  };
}

interface UseClosureRankingEvolutionProps {
  startDate: string;
  endDate: string;
  segment?: string;
  clientId?: string;
  enabled?: boolean;
}

const determineTrend = (change: number, isLowerBetter: boolean = false): "improving" | "declining" | "stable" => {
  const threshold = 0.1; // 10% change threshold
  if (Math.abs(change) < threshold) return "stable";
  if (isLowerBetter) {
    return change < 0 ? "improving" : "declining";
  }
  return change > 0 ? "improving" : "declining";
};

export function useClosureRankingEvolution({
  startDate,
  endDate,
  segment,
  clientId,
  enabled = true,
}: UseClosureRankingEvolutionProps) {
  return useQuery({
    queryKey: ["closure-ranking-evolution", startDate, endDate, segment, clientId],
    enabled,
    queryFn: async (): Promise<EvolutionData> => {
      let query = supabase
        .from("tickets")
        .select(`
          id,
          created_at,
          resolved_at,
          analyst_id,
          csat_rating,
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

      // Generate list of months in the period
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const monthsInPeriod = eachMonthOfInterval({ start, end });
      
      const months = monthsInPeriod.map(d => format(d, "yyyy-MM"));
      const monthLabels = monthsInPeriod.map(d => format(d, "MMM/yy", { locale: ptBR }));

      // Group tickets by month and analyst
      const monthlyAnalystData = new Map<string, Map<string, {
        name: string;
        times: number[];
        ratings: number[];
      }>>();

      (tickets || []).forEach((ticket: any) => {
        const month = format(new Date(ticket.resolved_at), "yyyy-MM");
        const analystId = ticket.analyst_id;
        const analystName = ticket.profiles?.full_name || "Não atribuído";
        const resolutionMinutes = Math.max(0, differenceInMinutes(
          new Date(ticket.resolved_at),
          new Date(ticket.created_at)
        ));

        if (!monthlyAnalystData.has(month)) {
          monthlyAnalystData.set(month, new Map());
        }

        const monthData = monthlyAnalystData.get(month)!;
        if (!monthData.has(analystId)) {
          monthData.set(analystId, { name: analystName, times: [], ratings: [] });
        }

        const analystData = monthData.get(analystId)!;
        analystData.times.push(resolutionMinutes);
        if (ticket.csat_rating) {
          analystData.ratings.push(ticket.csat_rating);
        }
      });

      // Build analyst evolution data
      const analystMap = new Map<string, { name: string; monthlyMetrics: MonthlyAnalystMetrics[] }>();

      months.forEach((month, monthIndex) => {
        const monthData = monthlyAnalystData.get(month);
        if (!monthData) return;

        // Calculate metrics and rankings for this month
        const monthMetrics: { analyst_id: string; volume: number; speed: number; csat: number }[] = [];
        
        monthData.forEach((data, analystId) => {
          const volume = data.times.length;
          const speed = volume > 0 ? Math.round(data.times.reduce((a, b) => a + b, 0) / volume) : 0;
          const csat = data.ratings.length > 0 
            ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length 
            : 0;

          monthMetrics.push({ analyst_id: analystId, volume, speed, csat });

          if (!analystMap.has(analystId)) {
            analystMap.set(analystId, { name: data.name, monthlyMetrics: [] });
          }
        });

        // Sort by volume to get rank
        monthMetrics.sort((a, b) => b.volume - a.volume);

        monthMetrics.forEach((metric, rankIndex) => {
          const monthData = monthlyAnalystData.get(month)!.get(metric.analyst_id)!;
          const analystEntry = analystMap.get(metric.analyst_id)!;
          
          analystEntry.monthlyMetrics.push({
            month,
            monthLabel: monthLabels[monthIndex],
            total_resolved: metric.volume,
            avg_resolution_minutes: metric.speed,
            csat_avg_rating: metric.csat,
            rank: rankIndex + 1,
          });
        });
      });

      // Calculate trends and growth for each analyst
      const analysts: AnalystEvolution[] = Array.from(analystMap.entries())
        .map(([analyst_id, data]) => {
          const sortedMetrics = data.monthlyMetrics.sort((a, b) => a.month.localeCompare(b.month));
          
          // Need at least 2 months to calculate trend
          if (sortedMetrics.length < 2) {
            return {
              analyst_id,
              analyst_name: data.name,
              monthly_data: sortedMetrics,
              trends: { volume: "stable" as const, speed: "stable" as const, csat: "stable" as const },
              growth: { volume_change: 0, speed_change: 0, csat_change: 0 },
            };
          }

          const firstHalf = sortedMetrics.slice(0, Math.ceil(sortedMetrics.length / 2));
          const secondHalf = sortedMetrics.slice(Math.floor(sortedMetrics.length / 2));

          const avgFirst = {
            volume: firstHalf.reduce((sum, m) => sum + m.total_resolved, 0) / firstHalf.length,
            speed: firstHalf.reduce((sum, m) => sum + m.avg_resolution_minutes, 0) / firstHalf.length,
            csat: firstHalf.filter(m => m.csat_avg_rating > 0).length > 0
              ? firstHalf.filter(m => m.csat_avg_rating > 0).reduce((sum, m) => sum + m.csat_avg_rating, 0) / firstHalf.filter(m => m.csat_avg_rating > 0).length
              : 0,
          };

          const avgSecond = {
            volume: secondHalf.reduce((sum, m) => sum + m.total_resolved, 0) / secondHalf.length,
            speed: secondHalf.reduce((sum, m) => sum + m.avg_resolution_minutes, 0) / secondHalf.length,
            csat: secondHalf.filter(m => m.csat_avg_rating > 0).length > 0
              ? secondHalf.filter(m => m.csat_avg_rating > 0).reduce((sum, m) => sum + m.csat_avg_rating, 0) / secondHalf.filter(m => m.csat_avg_rating > 0).length
              : 0,
          };

          const volumeChange = avgFirst.volume > 0 ? (avgSecond.volume - avgFirst.volume) / avgFirst.volume : 0;
          const speedChange = avgFirst.speed > 0 ? (avgSecond.speed - avgFirst.speed) / avgFirst.speed : 0;
          const csatChange = avgFirst.csat > 0 ? (avgSecond.csat - avgFirst.csat) / avgFirst.csat : 0;

          return {
            analyst_id,
            analyst_name: data.name,
            monthly_data: sortedMetrics,
            trends: {
              volume: determineTrend(volumeChange),
              speed: determineTrend(speedChange, true), // Lower is better for speed
              csat: determineTrend(csatChange),
            },
            growth: {
              volume_change: volumeChange,
              speed_change: speedChange,
              csat_change: csatChange,
            },
          };
        })
        .filter(a => a.monthly_data.length > 0)
        .sort((a, b) => {
          // Sort by total volume across all months
          const totalA = a.monthly_data.reduce((sum, m) => sum + m.total_resolved, 0);
          const totalB = b.monthly_data.reduce((sum, m) => sum + m.total_resolved, 0);
          return totalB - totalA;
        });

      // Find highlights
      const analystsWithMultipleMonths = analysts.filter(a => a.monthly_data.length >= 2);
      
      const top_volume_growth = analystsWithMultipleMonths
        .filter(a => a.growth.volume_change > 0)
        .sort((a, b) => b.growth.volume_change - a.growth.volume_change)[0] || null;

      const top_speed_improvement = analystsWithMultipleMonths
        .filter(a => a.growth.speed_change < 0) // Negative is better (faster)
        .sort((a, b) => a.growth.speed_change - b.growth.speed_change)[0] || null;

      const top_csat_improvement = analystsWithMultipleMonths
        .filter(a => a.growth.csat_change > 0 && a.monthly_data.some(m => m.csat_avg_rating > 0))
        .sort((a, b) => b.growth.csat_change - a.growth.csat_change)[0] || null;

      return {
        months,
        monthLabels,
        analysts,
        highlights: {
          top_volume_growth,
          top_speed_improvement,
          top_csat_improvement,
        },
      };
    },
  });
}
