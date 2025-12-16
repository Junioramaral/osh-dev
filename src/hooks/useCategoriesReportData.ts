import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CategoryMetrics {
  category: string;
  subcategory: string | null;
  total_tickets: number;
  resolved_tickets: number;
  sla_met_count: number;
  sla_met_rate: number;
  segment: string;
}

interface UseCategoriesReportDataProps {
  startDate: Date;
  endDate: Date;
  segment?: string;
  clientId?: string;
}

export const useCategoriesReportData = ({
  startDate,
  endDate,
  segment,
  clientId,
}: UseCategoriesReportDataProps) => {
  return useQuery({
    queryKey: ["categories-report", startDate.toISOString(), endDate.toISOString(), segment, clientId],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("id, category, subcategory, segment, status, sla_resolution_met")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (segment && segment !== "all") {
        query = query.eq("segment", segment as "DB" | "APP");
      }

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data: tickets, error } = await query;

      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, CategoryMetrics>();

      tickets?.forEach((ticket) => {
        const key = ticket.category;

        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            category: ticket.category,
            subcategory: null,
            total_tickets: 0,
            resolved_tickets: 0,
            sla_met_count: 0,
            sla_met_rate: 0,
          segment: ticket.segment as "DB" | "APP",
        });
      }

      const metrics = categoryMap.get(key)!;
        metrics.total_tickets++;

        if (ticket.status === "resolvido" || ticket.status === "fechado") {
          metrics.resolved_tickets++;
        }

        if (ticket.sla_resolution_met === true) {
          metrics.sla_met_count++;
        }
      });

      // Calculate rates
      const categories = Array.from(categoryMap.values()).map((cat) => ({
        ...cat,
        sla_met_rate: cat.total_tickets > 0 
          ? Math.round((cat.sla_met_count / cat.total_tickets) * 100) 
          : 0,
      }));

      // Sort by total tickets descending
      categories.sort((a, b) => b.total_tickets - a.total_tickets);

      // Group by subcategory as well
      const subcategoryMap = new Map<string, CategoryMetrics>();

      tickets?.forEach((ticket) => {
        if (!ticket.subcategory) return;
        
        const key = `${ticket.category}|${ticket.subcategory}`;

        if (!subcategoryMap.has(key)) {
          subcategoryMap.set(key, {
            category: ticket.category,
            subcategory: ticket.subcategory,
            total_tickets: 0,
            resolved_tickets: 0,
            sla_met_count: 0,
            sla_met_rate: 0,
            segment: ticket.segment,
          });
        }

        const metrics = subcategoryMap.get(key)!;
        metrics.total_tickets++;

        if (ticket.status === "resolvido" || ticket.status === "fechado") {
          metrics.resolved_tickets++;
        }

        if (ticket.sla_resolution_met === true) {
          metrics.sla_met_count++;
        }
      });

      const subcategories = Array.from(subcategoryMap.values()).map((cat) => ({
        ...cat,
        sla_met_rate: cat.total_tickets > 0 
          ? Math.round((cat.sla_met_count / cat.total_tickets) * 100) 
          : 0,
      }));

      subcategories.sort((a, b) => b.total_tickets - a.total_tickets);

      return { categories, subcategories };
    },
  });
};
