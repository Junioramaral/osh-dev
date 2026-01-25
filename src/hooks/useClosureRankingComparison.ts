import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInMinutes, format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PeriodAnalystMetrics {
  analyst_id: string;
  analyst_name: string;
  total_resolved: number;
  avg_resolution_minutes: number;
  csat_avg_rating: number;
  csat_total_ratings: number;
  volume_rank: number;
  speed_rank: number;
  combined_score: number;
}

export interface PeriodOverall {
  total_resolved: number;
  avg_resolution_minutes: number;
  avg_csat: number;
  total_analysts: number;
}

export interface AnalystComparison {
  analyst_id: string;
  analyst_name: string;
  periodA: PeriodAnalystMetrics | null;
  periodB: PeriodAnalystMetrics | null;
  variations: {
    volume: number;
    speed: number;
    csat: number;
    rank: number;
  };
  trend: "improved" | "declined" | "stable" | "new" | "inactive";
}

export interface ComparisonData {
  periodA: {
    label: string;
    startDate: string;
    endDate: string;
    metrics: PeriodAnalystMetrics[];
    overall: PeriodOverall;
  };
  periodB: {
    label: string;
    startDate: string;
    endDate: string;
    metrics: PeriodAnalystMetrics[];
    overall: PeriodOverall;
  };
  analysts: AnalystComparison[];
  overallVariation: {
    volume: number;
    speed: number;
    csat: number;
    analysts: number;
  };
  highlights: {
    most_improved: { name: string; change: number } | null;
    fastest_improvement: { name: string; change: number } | null;
    biggest_decline: { name: string; change: number } | null;
    new_analysts: string[];
    inactive_analysts: string[];
  };
}

interface UseClosureRankingComparisonProps {
  periodAMonth: number;
  periodAYear: number;
  periodBMonth: number;
  periodBYear: number;
  segment?: string;
  clientId?: string;
  enabled?: boolean;
}

const calculatePeriodMetrics = (
  tickets: any[],
  periodLabel: string,
  startDate: string,
  endDate: string
): { metrics: PeriodAnalystMetrics[]; overall: PeriodOverall } => {
  // Calculate resolution times
  const ticketsWithTime = tickets.map((ticket: any) => {
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
  const analystMap = new Map<string, {
    name: string;
    times: number[];
    ratings: number[];
  }>();

  ticketsWithTime.forEach((ticket) => {
    if (ticket.analyst_id) {
      const existing = analystMap.get(ticket.analyst_id);
      const analystName = ticket.profiles?.full_name || "Não atribuído";
      if (existing) {
        existing.times.push(ticket.resolution_minutes);
        if (ticket.csat_rating) existing.ratings.push(ticket.csat_rating);
      } else {
        analystMap.set(ticket.analyst_id, {
          name: analystName,
          times: [ticket.resolution_minutes],
          ratings: ticket.csat_rating ? [ticket.csat_rating] : [],
        });
      }
    }
  });

  // Calculate metrics per analyst
  const analystMetrics: PeriodAnalystMetrics[] = Array.from(analystMap.entries())
    .map(([analyst_id, data]) => ({
      analyst_id,
      analyst_name: data.name,
      total_resolved: data.times.length,
      avg_resolution_minutes: Math.round(
        data.times.reduce((a, b) => a + b, 0) / data.times.length
      ),
      csat_avg_rating:
        data.ratings.length > 0
          ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
          : 0,
      csat_total_ratings: data.ratings.length,
      volume_rank: 0,
      speed_rank: 0,
      combined_score: 0,
    }));

  // Assign volume rank
  const sortedByVolume = [...analystMetrics].sort(
    (a, b) => b.total_resolved - a.total_resolved
  );
  sortedByVolume.forEach((analyst, index) => {
    const original = analystMetrics.find((a) => a.analyst_id === analyst.analyst_id);
    if (original) original.volume_rank = index + 1;
  });

  // Assign speed rank
  const sortedBySpeed = [...analystMetrics].sort(
    (a, b) => a.avg_resolution_minutes - b.avg_resolution_minutes
  );
  sortedBySpeed.forEach((analyst, index) => {
    const original = analystMetrics.find((a) => a.analyst_id === analyst.analyst_id);
    if (original) original.speed_rank = index + 1;
  });

  // Calculate combined score
  const totalAnalysts = analystMetrics.length;
  analystMetrics.forEach((analyst) => {
    const volumeScore =
      totalAnalysts > 1
        ? ((totalAnalysts - analyst.volume_rank) / (totalAnalysts - 1)) * 50
        : 50;
    const speedScore =
      totalAnalysts > 1
        ? ((totalAnalysts - analyst.speed_rank) / (totalAnalysts - 1)) * 50
        : 50;
    analyst.combined_score = Math.round(volumeScore + speedScore);
  });

  // Sort by combined score
  analystMetrics.sort((a, b) => b.combined_score - a.combined_score);

  // Overall metrics
  const allTimes = ticketsWithTime.map((t) => t.resolution_minutes);
  const allRatings = ticketsWithTime
    .filter((t) => t.csat_rating !== null)
    .map((t) => t.csat_rating);

  const overall: PeriodOverall = {
    total_resolved: allTimes.length,
    avg_resolution_minutes:
      allTimes.length > 0
        ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        : 0,
    avg_csat:
      allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : 0,
    total_analysts: totalAnalysts,
  };

  return { metrics: analystMetrics, overall };
};

export function useClosureRankingComparison({
  periodAMonth,
  periodAYear,
  periodBMonth,
  periodBYear,
  segment,
  clientId,
  enabled = true,
}: UseClosureRankingComparisonProps) {
  // Calculate date ranges
  const periodAStart = startOfMonth(new Date(periodAYear, periodAMonth - 1));
  const periodAEnd = endOfMonth(new Date(periodAYear, periodAMonth - 1));
  const periodBStart = startOfMonth(new Date(periodBYear, periodBMonth - 1));
  const periodBEnd = endOfMonth(new Date(periodBYear, periodBMonth - 1));

  const periodALabel = format(periodAStart, "MMMM yyyy", { locale: ptBR });
  const periodBLabel = format(periodBStart, "MMMM yyyy", { locale: ptBR });

  return useQuery({
    queryKey: [
      "closure-ranking-comparison",
      periodAMonth,
      periodAYear,
      periodBMonth,
      periodBYear,
      segment,
      clientId,
    ],
    enabled,
    queryFn: async (): Promise<ComparisonData> => {
      // Fetch tickets for Period A
      let queryA = supabase
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
        .gte("resolved_at", periodAStart.toISOString())
        .lte("resolved_at", periodAEnd.toISOString());

      if (segment && segment !== "all") {
        queryA = queryA.eq("segment", segment as "DB" | "APP");
      }
      if (clientId && clientId !== "all") {
        queryA = queryA.eq("client_id", clientId);
      }

      // Fetch tickets for Period B
      let queryB = supabase
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
        .gte("resolved_at", periodBStart.toISOString())
        .lte("resolved_at", periodBEnd.toISOString());

      if (segment && segment !== "all") {
        queryB = queryB.eq("segment", segment as "DB" | "APP");
      }
      if (clientId && clientId !== "all") {
        queryB = queryB.eq("client_id", clientId);
      }

      const [resultA, resultB] = await Promise.all([queryA, queryB]);

      if (resultA.error) throw resultA.error;
      if (resultB.error) throw resultB.error;

      const ticketsA = resultA.data || [];
      const ticketsB = resultB.data || [];

      // Calculate metrics for each period
      const periodAData = calculatePeriodMetrics(
        ticketsA,
        periodALabel,
        periodAStart.toISOString(),
        periodAEnd.toISOString()
      );
      const periodBData = calculatePeriodMetrics(
        ticketsB,
        periodBLabel,
        periodBStart.toISOString(),
        periodBEnd.toISOString()
      );

      // Combine analysts from both periods
      const allAnalystIds = new Set<string>();
      const analystNames = new Map<string, string>();

      periodAData.metrics.forEach((m) => {
        allAnalystIds.add(m.analyst_id);
        analystNames.set(m.analyst_id, m.analyst_name);
      });
      periodBData.metrics.forEach((m) => {
        allAnalystIds.add(m.analyst_id);
        analystNames.set(m.analyst_id, m.analyst_name);
      });

      // Build comparison data
      const analysts: AnalystComparison[] = Array.from(allAnalystIds).map(
        (analyst_id) => {
          const periodA =
            periodAData.metrics.find((m) => m.analyst_id === analyst_id) || null;
          const periodB =
            periodBData.metrics.find((m) => m.analyst_id === analyst_id) || null;

          let volumeVariation = 0;
          let speedVariation = 0;
          let csatVariation = 0;
          let rankVariation = 0;
          let trend: AnalystComparison["trend"] = "stable";

          if (periodA && periodB) {
            // Both periods have data
            volumeVariation =
              periodB.total_resolved > 0
                ? ((periodA.total_resolved - periodB.total_resolved) /
                    periodB.total_resolved) *
                  100
                : 0;
            speedVariation =
              periodB.avg_resolution_minutes > 0
                ? ((periodA.avg_resolution_minutes - periodB.avg_resolution_minutes) /
                    periodB.avg_resolution_minutes) *
                  100
                : 0;
            csatVariation = periodA.csat_avg_rating - periodB.csat_avg_rating;
            rankVariation = periodB.volume_rank - periodA.volume_rank;

            // Determine trend based on volume change
            if (volumeVariation > 10) {
              trend = "improved";
            } else if (volumeVariation < -10) {
              trend = "declined";
            } else {
              trend = "stable";
            }
          } else if (periodA && !periodB) {
            trend = "new";
          } else if (!periodA && periodB) {
            trend = "inactive";
          }

          return {
            analyst_id,
            analyst_name: analystNames.get(analyst_id) || "Desconhecido",
            periodA,
            periodB,
            variations: {
              volume: volumeVariation,
              speed: speedVariation,
              csat: csatVariation,
              rank: rankVariation,
            },
            trend,
          };
        }
      );

      // Sort by period A volume (or period B if not in A)
      analysts.sort((a, b) => {
        const aVolume = a.periodA?.total_resolved || 0;
        const bVolume = b.periodA?.total_resolved || 0;
        return bVolume - aVolume;
      });

      // Calculate overall variations
      const overallVariation = {
        volume:
          periodBData.overall.total_resolved > 0
            ? ((periodAData.overall.total_resolved -
                periodBData.overall.total_resolved) /
                periodBData.overall.total_resolved) *
              100
            : 0,
        speed:
          periodBData.overall.avg_resolution_minutes > 0
            ? ((periodAData.overall.avg_resolution_minutes -
                periodBData.overall.avg_resolution_minutes) /
                periodBData.overall.avg_resolution_minutes) *
              100
            : 0,
        csat: periodAData.overall.avg_csat - periodBData.overall.avg_csat,
        analysts:
          periodAData.overall.total_analysts - periodBData.overall.total_analysts,
      };

      // Find highlights
      const comparableAnalysts = analysts.filter(
        (a) => a.periodA && a.periodB
      );

      const mostImproved = comparableAnalysts
        .filter((a) => a.variations.volume > 0)
        .sort((a, b) => b.variations.volume - a.variations.volume)[0];

      const fastestImprovement = comparableAnalysts
        .filter((a) => a.variations.speed < 0)
        .sort((a, b) => a.variations.speed - b.variations.speed)[0];

      const biggestDecline = comparableAnalysts
        .filter((a) => a.variations.volume < 0)
        .sort((a, b) => a.variations.volume - b.variations.volume)[0];

      const newAnalysts = analysts
        .filter((a) => a.trend === "new")
        .map((a) => a.analyst_name);

      const inactiveAnalysts = analysts
        .filter((a) => a.trend === "inactive")
        .map((a) => a.analyst_name);

      return {
        periodA: {
          label: periodALabel,
          startDate: periodAStart.toISOString(),
          endDate: periodAEnd.toISOString(),
          metrics: periodAData.metrics,
          overall: periodAData.overall,
        },
        periodB: {
          label: periodBLabel,
          startDate: periodBStart.toISOString(),
          endDate: periodBEnd.toISOString(),
          metrics: periodBData.metrics,
          overall: periodBData.overall,
        },
        analysts,
        overallVariation,
        highlights: {
          most_improved: mostImproved
            ? { name: mostImproved.analyst_name, change: mostImproved.variations.volume }
            : null,
          fastest_improvement: fastestImprovement
            ? {
                name: fastestImprovement.analyst_name,
                change: Math.abs(fastestImprovement.variations.speed),
              }
            : null,
          biggest_decline: biggestDecline
            ? { name: biggestDecline.analyst_name, change: biggestDecline.variations.volume }
            : null,
          new_analysts: newAnalysts,
          inactive_analysts: inactiveAnalysts,
        },
      };
    },
  });
}
