import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

interface ReportMetrics {
  total: number;
  resolved: number;
  pending: number;
  slaMetRate: number;
  avgResolutionHours: number;
  byPriority: { name: string; value: number; color: string }[];
  bySegment: { name: string; value: number; color: string }[];
  byStatus: { name: string; value: number; color: string }[];
  slaCompliance: { name: string; value: number; color: string }[];
  dailyVolume: { date: string; tickets: number }[];
  topCategories: { name: string; count: number }[];
}

interface ReportData {
  tickets: any[];
  metrics: ReportMetrics;
  client: { id: string; name: string } | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  P1: "hsl(0, 84%, 60%)",
  P2: "hsl(25, 95%, 53%)",
  P3: "hsl(48, 96%, 53%)",
  P4: "hsl(142, 76%, 36%)",
};

const STATUS_COLORS: Record<string, string> = {
  novo: "hsl(221, 83%, 53%)",
  em_atendimento: "hsl(48, 96%, 53%)",
  aguardando_cliente: "hsl(25, 95%, 53%)",
  resolvido: "hsl(142, 76%, 36%)",
  fechado: "hsl(215, 16%, 47%)",
};

const SEGMENT_COLORS: Record<string, string> = {
  DB: "hsl(221, 83%, 53%)",
  APP: "hsl(142, 76%, 36%)",
};

export const useReportData = (clientId: string | null, month: number, year: number) => {
  return useQuery<ReportData>({
    queryKey: ["report-data", clientId, month, year],
    queryFn: async () => {
      if (!clientId) {
        return { tickets: [], metrics: getEmptyMetrics(month, year), client: null };
      }

      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // Fetch client info
      const { data: client } = await supabase
        .from("clients")
        .select("id, name")
        .eq("id", clientId)
        .maybeSingle();

      // Fetch tickets for the period
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select(`
          *,
          queues(name),
          profiles!tickets_analyst_id_fkey(full_name)
        `)
        .eq("client_id", clientId)
        .neq("record_type", "rfc")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ticketList = tickets || [];
      const metrics = calculateMetrics(ticketList, startDate, endDate);

      return { tickets: ticketList, metrics, client };
    },
    enabled: !!clientId,
  });
};

function getEmptyMetrics(month: number, year: number): ReportMetrics {
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return {
    total: 0,
    resolved: 0,
    pending: 0,
    slaMetRate: 0,
    avgResolutionHours: 0,
    byPriority: [],
    bySegment: [],
    byStatus: [],
    slaCompliance: [],
    dailyVolume: days.map((day) => ({ date: format(day, "dd/MM"), tickets: 0 })),
    topCategories: [],
  };
}

function calculateMetrics(tickets: any[], startDate: Date, endDate: Date): ReportMetrics {
  const total = tickets.length;
  const resolved = tickets.filter((t) => t.status === "resolvido" || t.status === "fechado").length;
  const pending = total - resolved;

  // SLA compliance
  const ticketsWithSla = tickets.filter((t) => t.sla_resolution_met !== null);
  const slaMet = ticketsWithSla.filter((t) => t.sla_resolution_met === true).length;
  const slaMetRate = ticketsWithSla.length > 0 ? Math.round((slaMet / ticketsWithSla.length) * 100) : 0;

  // Average resolution time
  const resolvedTickets = tickets.filter((t) => t.resolved_at && t.created_at);
  const totalResolutionHours = resolvedTickets.reduce((acc, t) => {
    const created = new Date(t.created_at).getTime();
    const resolved = new Date(t.resolved_at).getTime();
    return acc + (resolved - created) / (1000 * 60 * 60);
  }, 0);
  const avgResolutionHours = resolvedTickets.length > 0 ? Math.round(totalResolutionHours / resolvedTickets.length) : 0;

  // By priority
  const priorityCounts = tickets.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const byPriority = Object.entries(priorityCounts).map(([name, value]) => ({
    name,
    value: value as number,
    color: PRIORITY_COLORS[name] || "hsl(215, 16%, 47%)",
  })).sort((a, b) => a.name.localeCompare(b.name));

  // By segment
  const segmentCounts = tickets.reduce((acc, t) => {
    acc[t.segment] = (acc[t.segment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const bySegment = Object.entries(segmentCounts).map(([name, value]) => ({
    name: name === "DB" ? "Banco de Dados" : "Aplicação",
    value: value as number,
    color: SEGMENT_COLORS[name] || "hsl(215, 16%, 47%)",
  }));

  // By status
  const statusLabels: Record<string, string> = {
    novo: "Novo",
    em_atendimento: "Em Atendimento",
    aguardando_cliente: "Aguardando Cliente",
    resolvido: "Resolvido",
    fechado: "Fechado",
  };
  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const byStatus = Object.entries(statusCounts).map(([status, value]) => ({
    name: statusLabels[status] || status,
    value: value as number,
    color: STATUS_COLORS[status] || "hsl(215, 16%, 47%)",
  }));

  // SLA compliance chart
  const slaNotMet = ticketsWithSla.length - slaMet;
  const slaPending = tickets.filter((t) => t.sla_resolution_met === null).length;
  const slaCompliance = [
    { name: "Cumprido", value: slaMet, color: "hsl(142, 76%, 36%)" },
    { name: "Não Cumprido", value: slaNotMet, color: "hsl(0, 84%, 60%)" },
    { name: "Em Andamento", value: slaPending, color: "hsl(48, 96%, 53%)" },
  ].filter((item) => item.value > 0);

  // Daily volume
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyVolume = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const count = tickets.filter((t) => t.created_at?.startsWith(dayStr)).length;
    return { date: format(day, "dd/MM"), tickets: count };
  });

  // Top categories
  const categoryCounts = tickets.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topCategories = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    resolved,
    pending,
    slaMetRate,
    avgResolutionHours,
    byPriority,
    bySegment,
    byStatus,
    slaCompliance,
    dailyVolume,
    topCategories,
  };
}
