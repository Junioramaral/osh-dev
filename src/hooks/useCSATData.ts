import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

export interface CSATOverview {
  avg_rating: number;
  total_responses: number;
  total_resolved: number;
  response_rate: number;
}

export interface CSATDistribution {
  rating: number;
  count: number;
  percentage: number;
  color: string;
}

export interface CSATByAnalyst {
  analyst_id: string;
  analyst_name: string;
  avg_rating: number;
  total_ratings: number;
  total_resolved: number;
}

export interface CSATEvolution {
  date: string;
  avg_rating: number;
  count: number;
}

export interface CSATAlert {
  ticket_id: string;
  ticket_number: string;
  rating: number;
  comment: string | null;
  analyst_name: string;
  client_name: string;
  submitted_at: string;
}

export interface CSATDashboardData {
  overview: CSATOverview;
  distribution: CSATDistribution[];
  by_analyst: CSATByAnalyst[];
  evolution: CSATEvolution[];
  alerts: CSATAlert[];
  recent_feedback: CSATAlert[];
}

const RATING_COLORS: Record<number, string> = {
  5: "hsl(142, 71%, 45%)",
  4: "hsl(215, 65%, 55%)",
  3: "hsl(45, 93%, 47%)",
  2: "hsl(24, 95%, 53%)",
  1: "hsl(0, 72%, 51%)",
};

interface UseCSATDataProps {
  startDate: Date;
  endDate: Date;
  segment?: string;
  clientId?: string;
  analystId?: string;
}

export const useCSATData = ({
  startDate,
  endDate,
  segment,
  clientId,
  analystId,
}: UseCSATDataProps) => {
  return useQuery({
    queryKey: [
      "csat-dashboard",
      startDate.toISOString(),
      endDate.toISOString(),
      segment,
      clientId,
      analystId,
    ],
    queryFn: async (): Promise<CSATDashboardData> => {
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Resolved tickets in the window (used for response rate denominator)
      let resolvedQuery = supabase
        .from("tickets")
        .select(
          `id, ticket_number, analyst_id, client_id, segment, status, resolved_at, csat_rating, csat_comment, csat_submitted_at, profiles:analyst_id (full_name), clients:client_id (name)`
        )
        .neq("record_type", "rfc")
        .in("status", ["resolvido", "fechado"])
        .gte("resolved_at", startISO)
        .lte("resolved_at", endISO);

      if (segment && segment !== "all") {
        resolvedQuery = resolvedQuery.eq("segment", segment as "DB" | "APP");
      }
      if (clientId) resolvedQuery = resolvedQuery.eq("client_id", clientId);
      if (analystId) resolvedQuery = resolvedQuery.eq("analyst_id", analystId);

      const { data: resolved, error: resolvedErr } = await resolvedQuery;
      if (resolvedErr) throw resolvedErr;

      // Tickets evaluated (csat_submitted_at) in the window — may include tickets resolved before
      let ratedQuery = supabase
        .from("tickets")
        .select(
          `id, ticket_number, analyst_id, client_id, segment, status, resolved_at, csat_rating, csat_comment, csat_submitted_at, profiles:analyst_id (full_name), clients:client_id (name)`
        )
        .neq("record_type", "rfc")
        .not("csat_rating", "is", null)
        .gte("csat_submitted_at", startISO)
        .lte("csat_submitted_at", endISO);

      if (segment && segment !== "all") {
        ratedQuery = ratedQuery.eq("segment", segment as "DB" | "APP");
      }
      if (clientId) ratedQuery = ratedQuery.eq("client_id", clientId);
      if (analystId) ratedQuery = ratedQuery.eq("analyst_id", analystId);

      const { data: rated, error: ratedErr } = await ratedQuery;
      if (ratedErr) throw ratedErr;

      const resolvedTickets = resolved || [];
      const ratedTickets = (rated || []).filter((t) => t.csat_rating !== null);

      const totalRating = ratedTickets.reduce((sum, t) => sum + (t.csat_rating || 0), 0);
      const avgRating = ratedTickets.length > 0 ? totalRating / ratedTickets.length : 0;

      const overview: CSATOverview = {
        avg_rating: avgRating,
        total_responses: ratedTickets.length,
        total_resolved: resolvedTickets.length,
        response_rate:
          resolvedTickets.length > 0
            ? (ratedTickets.length / resolvedTickets.length) * 100
            : 0,
      };

      const distributionMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratedTickets.forEach((t) => {
        if (t.csat_rating && t.csat_rating >= 1 && t.csat_rating <= 5) {
          distributionMap[t.csat_rating]++;
        }
      });

      const distribution: CSATDistribution[] = [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: distributionMap[rating],
        percentage:
          ratedTickets.length > 0 ? (distributionMap[rating] / ratedTickets.length) * 100 : 0,
        color: RATING_COLORS[rating],
      }));

      const analystMap = new Map<string, { name: string; ratings: number[]; resolved: number }>();
      resolvedTickets.forEach((t) => {
        if (!t.analyst_id) return;
        const existing =
          analystMap.get(t.analyst_id) || {
            name: (t.profiles as any)?.full_name || "Analista",
            ratings: [],
            resolved: 0,
          };
        existing.resolved++;
        analystMap.set(t.analyst_id, existing);
      });
      ratedTickets.forEach((t) => {
        if (!t.analyst_id) return;
        const existing =
          analystMap.get(t.analyst_id) || {
            name: (t.profiles as any)?.full_name || "Analista",
            ratings: [],
            resolved: 0,
          };
        if (t.csat_rating !== null) existing.ratings.push(t.csat_rating);
        analystMap.set(t.analyst_id, existing);
      });

      const by_analyst: CSATByAnalyst[] = Array.from(analystMap.entries())
        .map(([id, d]) => ({
          analyst_id: id,
          analyst_name: d.name,
          avg_rating:
            d.ratings.length > 0 ? d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length : 0,
          total_ratings: d.ratings.length,
          total_resolved: d.resolved,
        }))
        .filter((a) => a.total_ratings > 0)
        .sort((a, b) => b.avg_rating - a.avg_rating);

      // Evolution
      const evolutionMap = new Map<string, { sum: number; count: number }>();
      const spanDays =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const useMonthly = spanDays > 62;

      ratedTickets.forEach((t) => {
        if (!t.csat_submitted_at) return;
        const d = parseISO(t.csat_submitted_at);
        const key = useMonthly ? format(d, "yyyy-MM-01") : format(d, "yyyy-MM-dd");
        const existing = evolutionMap.get(key) || { sum: 0, count: 0 };
        existing.sum += t.csat_rating || 0;
        existing.count++;
        evolutionMap.set(key, existing);
      });

      const evolution: CSATEvolution[] = Array.from(evolutionMap.entries())
        .map(([date, d]) => ({
          date,
          avg_rating: d.count > 0 ? d.sum / d.count : 0,
          count: d.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const alerts: CSATAlert[] = ratedTickets
        .filter((t) => t.csat_rating !== null && t.csat_rating <= 2)
        .sort((a, b) =>
          (b.csat_submitted_at || "").localeCompare(a.csat_submitted_at || "")
        )
        .slice(0, 10)
        .map((t) => ({
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          rating: t.csat_rating!,
          comment: t.csat_comment,
          analyst_name: (t.profiles as any)?.full_name || "Analista",
          client_name: (t.clients as any)?.name || "Cliente",
          submitted_at: t.csat_submitted_at || "",
        }));

      const recent_feedback: CSATAlert[] = ratedTickets
        .filter((t) => t.csat_comment)
        .sort((a, b) =>
          (b.csat_submitted_at || "").localeCompare(a.csat_submitted_at || "")
        )
        .slice(0, 10)
        .map((t) => ({
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          rating: t.csat_rating!,
          comment: t.csat_comment,
          analyst_name: (t.profiles as any)?.full_name || "Analista",
          client_name: (t.clients as any)?.name || "Cliente",
          submitted_at: t.csat_submitted_at || "",
        }));

      return { overview, distribution, by_analyst, evolution, alerts, recent_feedback };
    },
  });
};
