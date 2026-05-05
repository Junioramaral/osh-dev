import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CSATTicketRow {
  id: string;
  ticket_number: string;
  csat_rating: number;
  csat_comment: string | null;
  csat_submitted_at: string;
  client_id: string;
  client_name: string;
  segment: "DB" | "APP" | string;
  priority: string;
  category: string | null;
  subcategory: string | null;
  analyst_id: string | null;
  analyst_name: string;
  contact_name: string;
  contact_email: string;
  created_at: string;
  resolved_at: string | null;
  resolution_minutes: number | null;
  sla_first_response_met: boolean | null;
  sla_resolution_met: boolean | null;
}

export interface CSATSatisfactionData {
  tickets: CSATTicketRow[];
  resolved_count: number;
  overview: {
    avg_rating: number;
    total_responses: number;
    response_rate: number;
    promoters_pct: number;
    neutrals_pct: number;
    detractors_pct: number;
    nps: number;
  };
  prev_overview: {
    avg_rating: number;
    total_responses: number;
  };
  by_segment: { segment: string; avg: number; count: number }[];
  by_priority: { priority: string; avg: number; count: number }[];
  by_client_top: { client_name: string; avg: number; count: number }[];
  by_client_bottom: { client_name: string; avg: number; count: number }[];
  by_analyst_top: { analyst_name: string; avg: number; count: number }[];
  by_analyst_bottom: { analyst_name: string; avg: number; count: number }[];
  by_category_worst: { category: string; avg: number; count: number }[];
  sla_correlation: { sla_met_avg: number; sla_breached_avg: number };
}

interface Props {
  startDate: Date;
  endDate: Date;
  segment?: string;
  clientId?: string;
  analystId?: string;
  ratingBucket?: "all" | "promoters" | "neutrals" | "detractors";
}

const SELECT = `id, ticket_number, csat_rating, csat_comment, csat_submitted_at, client_id, segment, priority, category, subcategory, analyst_id, contact_name, contact_email, created_at, resolved_at, sla_first_response_met, sla_resolution_met, profiles:analyst_id (full_name), clients:client_id (name)`;

function diffMinutes(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

function aggregate(rows: CSATTicketRow[], key: keyof CSATTicketRow | ((r: CSATTicketRow) => string)) {
  const map = new Map<string, { sum: number; count: number }>();
  rows.forEach((r) => {
    const k = (typeof key === "function" ? key(r) : (r[key] as string)) || "—";
    const e = map.get(k) || { sum: 0, count: 0 };
    e.sum += r.csat_rating;
    e.count++;
    map.set(k, e);
  });
  return Array.from(map.entries()).map(([k, v]) => ({
    key: k,
    avg: v.count > 0 ? v.sum / v.count : 0,
    count: v.count,
  }));
}

export const useCSATSatisfactionReport = ({
  startDate,
  endDate,
  segment,
  clientId,
  analystId,
  ratingBucket = "all",
}: Props) => {
  return useQuery({
    queryKey: [
      "csat-satisfaction-report",
      startDate.toISOString(),
      endDate.toISOString(),
      segment,
      clientId,
      analystId,
      ratingBucket,
    ],
    queryFn: async (): Promise<CSATSatisfactionData> => {
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Rated tickets in window
      let q = supabase
        .from("tickets")
        .select(SELECT)
        .neq("record_type", "rfc")
        .not("csat_rating", "is", null)
        .gte("csat_submitted_at", startISO)
        .lte("csat_submitted_at", endISO);

      if (segment && segment !== "all") q = q.eq("segment", segment as "DB" | "APP");
      if (clientId) q = q.eq("client_id", clientId);
      if (analystId) q = q.eq("analyst_id", analystId);

      const { data: ratedRaw, error } = await q;
      if (error) throw error;

      // Resolved count for response-rate denominator
      let rq = supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .neq("record_type", "rfc")
        .in("status", ["resolvido", "fechado"])
        .gte("resolved_at", startISO)
        .lte("resolved_at", endISO);
      if (segment && segment !== "all") rq = rq.eq("segment", segment as "DB" | "APP");
      if (clientId) rq = rq.eq("client_id", clientId);
      if (analystId) rq = rq.eq("analyst_id", analystId);
      const { count: resolvedCount } = await rq;

      // Previous period (same length, immediately before)
      const span = endDate.getTime() - startDate.getTime();
      const prevStart = new Date(startDate.getTime() - span);
      const prevEnd = new Date(startDate.getTime() - 1);
      let pq = supabase
        .from("tickets")
        .select("csat_rating")
        .neq("record_type", "rfc")
        .not("csat_rating", "is", null)
        .gte("csat_submitted_at", prevStart.toISOString())
        .lte("csat_submitted_at", prevEnd.toISOString());
      if (segment && segment !== "all") pq = pq.eq("segment", segment as "DB" | "APP");
      if (clientId) pq = pq.eq("client_id", clientId);
      if (analystId) pq = pq.eq("analyst_id", analystId);
      const { data: prevRaw } = await pq;

      let tickets: CSATTicketRow[] = (ratedRaw || []).map((t: any) => ({
        id: t.id,
        ticket_number: t.ticket_number,
        csat_rating: t.csat_rating,
        csat_comment: t.csat_comment,
        csat_submitted_at: t.csat_submitted_at,
        client_id: t.client_id,
        client_name: t.clients?.name || "—",
        segment: t.segment,
        priority: t.priority,
        category: t.category,
        subcategory: t.subcategory,
        analyst_id: t.analyst_id,
        analyst_name: t.profiles?.full_name || "—",
        contact_name: t.contact_name,
        contact_email: t.contact_email,
        created_at: t.created_at,
        resolved_at: t.resolved_at,
        resolution_minutes: diffMinutes(t.created_at, t.resolved_at),
        sla_first_response_met: t.sla_first_response_met,
        sla_resolution_met: t.sla_resolution_met,
      }));

      if (ratingBucket === "promoters") tickets = tickets.filter((t) => t.csat_rating >= 4);
      else if (ratingBucket === "neutrals") tickets = tickets.filter((t) => t.csat_rating === 3);
      else if (ratingBucket === "detractors") tickets = tickets.filter((t) => t.csat_rating <= 2);

      // Sort: detractors first, then by date desc
      tickets.sort((a, b) => {
        if (a.csat_rating !== b.csat_rating) return a.csat_rating - b.csat_rating;
        return (b.csat_submitted_at || "").localeCompare(a.csat_submitted_at || "");
      });

      const total = tickets.length;
      const sum = tickets.reduce((s, t) => s + t.csat_rating, 0);
      const avg = total > 0 ? sum / total : 0;
      const promoters = tickets.filter((t) => t.csat_rating >= 4).length;
      const neutrals = tickets.filter((t) => t.csat_rating === 3).length;
      const detractors = tickets.filter((t) => t.csat_rating <= 2).length;
      const promPct = total > 0 ? (promoters / total) * 100 : 0;
      const neutPct = total > 0 ? (neutrals / total) * 100 : 0;
      const detPct = total > 0 ? (detractors / total) * 100 : 0;

      const prevTotal = (prevRaw || []).length;
      const prevAvg =
        prevTotal > 0
          ? (prevRaw || []).reduce((s: number, t: any) => s + (t.csat_rating || 0), 0) / prevTotal
          : 0;

      // SLA correlation
      const slaMet = tickets.filter((t) => t.sla_resolution_met === true);
      const slaBreached = tickets.filter((t) => t.sla_resolution_met === false);
      const slaMetAvg =
        slaMet.length > 0 ? slaMet.reduce((s, t) => s + t.csat_rating, 0) / slaMet.length : 0;
      const slaBreachedAvg =
        slaBreached.length > 0
          ? slaBreached.reduce((s, t) => s + t.csat_rating, 0) / slaBreached.length
          : 0;

      const bySeg = aggregate(tickets, "segment").map((x) => ({
        segment: x.key,
        avg: x.avg,
        count: x.count,
      }));
      const byPri = aggregate(tickets, "priority")
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((x) => ({ priority: x.key, avg: x.avg, count: x.count }));
      const byClient = aggregate(tickets, "client_name").filter((x) => x.count >= 2);
      const byAnalyst = aggregate(tickets, "analyst_name").filter((x) => x.count >= 3);
      const byCat = aggregate(tickets, (r) => r.category || "Sem categoria");

      return {
        tickets,
        resolved_count: resolvedCount || 0,
        overview: {
          avg_rating: avg,
          total_responses: total,
          response_rate: resolvedCount ? (total / resolvedCount) * 100 : 0,
          promoters_pct: promPct,
          neutrals_pct: neutPct,
          detractors_pct: detPct,
          nps: promPct - detPct,
        },
        prev_overview: { avg_rating: prevAvg, total_responses: prevTotal },
        by_segment: bySeg,
        by_priority: byPri,
        by_client_top: [...byClient].sort((a, b) => b.avg - a.avg).slice(0, 5).map((x) => ({ client_name: x.key, avg: x.avg, count: x.count })),
        by_client_bottom: [...byClient].sort((a, b) => a.avg - b.avg).slice(0, 5).map((x) => ({ client_name: x.key, avg: x.avg, count: x.count })),
        by_analyst_top: [...byAnalyst].sort((a, b) => b.avg - a.avg).slice(0, 5).map((x) => ({ analyst_name: x.key, avg: x.avg, count: x.count })),
        by_analyst_bottom: [...byAnalyst].sort((a, b) => a.avg - b.avg).slice(0, 5).map((x) => ({ analyst_name: x.key, avg: x.avg, count: x.count })),
        by_category_worst: [...byCat].sort((a, b) => a.avg - b.avg).slice(0, 5).map((x) => ({ category: x.key, avg: x.avg, count: x.count })),
        sla_correlation: { sla_met_avg: slaMetAvg, sla_breached_avg: slaBreachedAvg },
      };
    },
  });
};
