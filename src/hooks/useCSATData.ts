import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format, parseISO } from "date-fns";

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
  5: "hsl(142, 71%, 45%)",  // green
  4: "hsl(215, 65%, 55%)",  // blue
  3: "hsl(45, 93%, 47%)",   // yellow
  2: "hsl(24, 95%, 53%)",   // orange
  1: "hsl(0, 72%, 51%)",    // red
};

interface UseCSATDataProps {
  days?: number;
  segment?: string;
  clientId?: string;
  analystId?: string;
}

export const useCSATData = ({
  days = 30,
  segment,
  clientId,
  analystId,
}: UseCSATDataProps = {}) => {
  return useQuery({
    queryKey: ["csat-dashboard", days, segment, clientId, analystId],
    queryFn: async (): Promise<CSATDashboardData> => {
      const startDate = startOfDay(subDays(new Date(), days));

      let query = supabase
        .from("tickets")
        .select(`
          id,
          ticket_number,
          analyst_id,
          client_id,
          segment,
          status,
          resolved_at,
          csat_rating,
          csat_comment,
          csat_submitted_at,
          profiles:analyst_id (full_name),
          clients:client_id (name)
        `)
        .gte("created_at", startDate.toISOString())
        .in("status", ["resolvido", "fechado"]);

      if (segment && segment !== "all") {
        query = query.eq("segment", segment as "DB" | "APP");
      }

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      if (analystId) {
        query = query.eq("analyst_id", analystId);
      }

      const { data: tickets, error } = await query;

      if (error) throw error;

      // Calculate overview
      const resolvedTickets = tickets || [];
      const ratedTickets = resolvedTickets.filter(t => t.csat_rating !== null);
      
      const totalRating = ratedTickets.reduce((sum, t) => sum + (t.csat_rating || 0), 0);
      const avgRating = ratedTickets.length > 0 ? totalRating / ratedTickets.length : 0;

      const overview: CSATOverview = {
        avg_rating: avgRating,
        total_responses: ratedTickets.length,
        total_resolved: resolvedTickets.length,
        response_rate: resolvedTickets.length > 0 
          ? (ratedTickets.length / resolvedTickets.length) * 100 
          : 0,
      };

      // Calculate distribution
      const distributionMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratedTickets.forEach(t => {
        if (t.csat_rating && t.csat_rating >= 1 && t.csat_rating <= 5) {
          distributionMap[t.csat_rating]++;
        }
      });

      const distribution: CSATDistribution[] = [5, 4, 3, 2, 1].map(rating => ({
        rating,
        count: distributionMap[rating],
        percentage: ratedTickets.length > 0 
          ? (distributionMap[rating] / ratedTickets.length) * 100 
          : 0,
        color: RATING_COLORS[rating],
      }));

      // Calculate by analyst
      const analystMap = new Map<string, { 
        name: string; 
        ratings: number[]; 
        resolved: number; 
      }>();

      resolvedTickets.forEach(t => {
        if (!t.analyst_id) return;
        
        const existing = analystMap.get(t.analyst_id) || {
          name: (t.profiles as any)?.full_name || "Analista",
          ratings: [],
          resolved: 0,
        };
        
        existing.resolved++;
        if (t.csat_rating !== null) {
          existing.ratings.push(t.csat_rating);
        }
        
        analystMap.set(t.analyst_id, existing);
      });

      const by_analyst: CSATByAnalyst[] = Array.from(analystMap.entries())
        .map(([id, data]) => ({
          analyst_id: id,
          analyst_name: data.name,
          avg_rating: data.ratings.length > 0 
            ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length 
            : 0,
          total_ratings: data.ratings.length,
          total_resolved: data.resolved,
        }))
        .filter(a => a.total_ratings > 0)
        .sort((a, b) => b.avg_rating - a.avg_rating);

      // Calculate evolution (daily averages)
      const evolutionMap = new Map<string, { sum: number; count: number }>();
      
      ratedTickets.forEach(t => {
        if (!t.csat_submitted_at) return;
        const dateKey = format(parseISO(t.csat_submitted_at), "yyyy-MM-dd");
        const existing = evolutionMap.get(dateKey) || { sum: 0, count: 0 };
        existing.sum += t.csat_rating || 0;
        existing.count++;
        evolutionMap.set(dateKey, existing);
      });

      const evolution: CSATEvolution[] = Array.from(evolutionMap.entries())
        .map(([date, data]) => ({
          date,
          avg_rating: data.count > 0 ? data.sum / data.count : 0,
          count: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Get alerts (ratings 1-2)
      const alerts: CSATAlert[] = ratedTickets
        .filter(t => t.csat_rating !== null && t.csat_rating <= 2)
        .sort((a, b) => {
          const dateA = a.csat_submitted_at || "";
          const dateB = b.csat_submitted_at || "";
          return dateB.localeCompare(dateA);
        })
        .slice(0, 10)
        .map(t => ({
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          rating: t.csat_rating!,
          comment: t.csat_comment,
          analyst_name: (t.profiles as any)?.full_name || "Analista",
          client_name: (t.clients as any)?.name || "Cliente",
          submitted_at: t.csat_submitted_at || "",
        }));

      // Get recent feedback (all with comments)
      const recent_feedback: CSATAlert[] = ratedTickets
        .filter(t => t.csat_comment)
        .sort((a, b) => {
          const dateA = a.csat_submitted_at || "";
          const dateB = b.csat_submitted_at || "";
          return dateB.localeCompare(dateA);
        })
        .slice(0, 10)
        .map(t => ({
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          rating: t.csat_rating!,
          comment: t.csat_comment,
          analyst_name: (t.profiles as any)?.full_name || "Analista",
          client_name: (t.clients as any)?.name || "Cliente",
          submitted_at: t.csat_submitted_at || "",
        }));

      return {
        overview,
        distribution,
        by_analyst,
        evolution,
        alerts,
        recent_feedback,
      };
    },
  });
};