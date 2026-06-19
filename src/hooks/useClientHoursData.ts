import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export interface AnalystHours {
  analyst_id: string | null;
  analyst_name: string;
  hours: number;
}

export interface QueueHours {
  queue_id: string | null;
  queue_name: string;
  hours: number;
}

export interface TeamHours {
  team_id: string | null;
  team_name: string;
  hours: number;
}

export interface TypeHours {
  ticket_type: string;
  type_label: string;
  hours: number;
}

export interface ClientHoursSummary {
  client_id: string;
  client_name: string;
  total_hours: number;
  total_entries: number;
  avg_hours_per_entry: number;
  top_analyst: string | null;
}

export interface TicketStatusBreakdownEntry {
  status: string;
  hours: number;
}

export interface ClientTicketStatusBreakdown {
  client_id: string;
  client_name: string;
  ticket_id: string;
  ticket_number: string;
  ticket_title: string;
  total_hours: number;
  status_breakdown: TicketStatusBreakdownEntry[];
}

export interface ClientHoursData {
  byAnalyst: AnalystHours[];
  byQueue: QueueHours[];
  byTeam: TeamHours[];
  byType: TypeHours[];
  byClient: ClientHoursSummary[];
  byClientTickets: ClientTicketStatusBreakdown[];
  overall: {
    total_hours: number;
    total_entries: number;
    avg_hours_per_entry: number;
    unique_analysts: number;
  };
}

export type PeriodFilter = "current" | "previous" | "last3" | "last6";

function getPeriodDates(period: PeriodFilter): { startDate: string; endDate: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case "current":
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case "previous":
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
      break;
    case "last3":
      start = startOfMonth(subMonths(now, 2));
      end = endOfMonth(now);
      break;
    case "last6":
      start = startOfMonth(subMonths(now, 5));
      end = endOfMonth(now);
      break;
    default:
      start = startOfMonth(now);
      end = endOfMonth(now);
  }

  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  incidente: "Incidente",
  problema: "Problema",
  duvida: "Dúvida",
  solicitacao: "Service Request",
  service_request: "Service Request",
};

// Calculate ticket lifetime hours from created_at to resolved_at (or now if not resolved)
const calculateTicketHours = (createdAt: string, resolvedAt: string | null): number => {
  const start = new Date(createdAt);
  const end = resolvedAt ? new Date(resolvedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  // Return hours with 1 decimal place
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
};

export function useClientHoursData(
  period: PeriodFilter,
  clientId?: string,
  segment?: "DB" | "APP" | null,
  customRange?: { startDate: string; endDate: string }
) {
  return useQuery({
    queryKey: ["client-hours", period, clientId, segment, customRange?.startDate, customRange?.endDate],
    queryFn: async (): Promise<ClientHoursData> => {
      const { startDate, endDate } = customRange ?? getPeriodDates(period);

      let query = supabase
        .from("tickets")
        .select(`
          id,
          created_at,
          resolved_at,
          client_id,
          ticket_number,
          title,
          analyst_id,
          queue_id,
          team_id,
          ticket_type,
          segment,
          status,
          clients(name),
          queues(name),
          teams(name),
          profiles!tickets_analyst_id_fkey(full_name)
        `)
        .gte("created_at", startDate)
        .lte("created_at", `${endDate}T23:59:59`);

      // Apply client filter directly in the query if provided
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      // Apply segment filter directly in the query if provided
      if (segment) {
        query = query.eq("segment", segment);
      }

      const { data, error } = await query;

      if (error) throw error;

      const tickets = data || [];

      // Calculate hours for each ticket and create enriched data
      const ticketsWithHours = tickets.map((ticket: any) => ({
        ...ticket,
        hours: calculateTicketHours(ticket.created_at, ticket.resolved_at),
      }));

      // Aggregate by analyst
      const analystMap = new Map<string | null, { name: string; hours: number }>();
      ticketsWithHours.forEach((ticket: any) => {
        const analystId = ticket.analyst_id || null;
        const analystName = ticket.profiles?.full_name || "Não Atribuído";
        const existing = analystMap.get(analystId) || { name: analystName, hours: 0 };
        existing.hours += ticket.hours;
        analystMap.set(analystId, existing);
      });

      const byAnalyst: AnalystHours[] = Array.from(analystMap.entries())
        .map(([analyst_id, data]) => ({
          analyst_id,
          analyst_name: data.name.split(" ")[0], // First name only
          hours: Math.round(data.hours * 10) / 10,
        }))
        .sort((a, b) => b.hours - a.hours);

      // Aggregate by queue
      const queueMap = new Map<string | null, { name: string; hours: number }>();
      ticketsWithHours.forEach((ticket: any) => {
        const queueId = ticket.queue_id || null;
        const queueName = ticket.queues?.name || "Sem Fila";
        const existing = queueMap.get(queueId) || { name: queueName, hours: 0 };
        existing.hours += ticket.hours;
        queueMap.set(queueId, existing);
      });

      const byQueue: QueueHours[] = Array.from(queueMap.entries())
        .map(([queue_id, data]) => ({
          queue_id,
          queue_name: data.name,
          hours: Math.round(data.hours * 10) / 10,
        }))
        .sort((a, b) => b.hours - a.hours);

      // Aggregate by team
      const teamMap = new Map<string | null, { name: string; hours: number }>();
      ticketsWithHours.forEach((ticket: any) => {
        const teamId = ticket.team_id || null;
        const teamName = ticket.teams?.name || "Sem Time";
        const existing = teamMap.get(teamId) || { name: teamName, hours: 0 };
        existing.hours += ticket.hours;
        teamMap.set(teamId, existing);
      });

      const byTeam: TeamHours[] = Array.from(teamMap.entries())
        .map(([team_id, data]) => ({
          team_id,
          team_name: data.name,
          hours: Math.round(data.hours * 10) / 10,
        }))
        .sort((a, b) => b.hours - a.hours);

      // Aggregate by ticket type
      const typeMap = new Map<string, number>();
      ticketsWithHours.forEach((ticket: any) => {
        const ticketType = ticket.ticket_type || "unknown";
        const existing = typeMap.get(ticketType) || 0;
        typeMap.set(ticketType, existing + ticket.hours);
      });

      const byType: TypeHours[] = Array.from(typeMap.entries())
        .map(([ticket_type, hours]) => ({
          ticket_type,
          type_label: TICKET_TYPE_LABELS[ticket_type] || ticket_type,
          hours: Math.round(hours * 10) / 10,
        }))
        .sort((a, b) => b.hours - a.hours);

      // Aggregate by client
      const clientMap = new Map<
        string,
        { name: string; hours: number; entries: number; analysts: Map<string | null, number> }
      >();
      ticketsWithHours.forEach((ticket: any) => {
        const cId = ticket.client_id;
        const cName = ticket.clients?.name || "Desconhecido";
        const analystId = ticket.analyst_id || null;

        if (!clientMap.has(cId)) {
          clientMap.set(cId, { name: cName, hours: 0, entries: 0, analysts: new Map() });
        }

        const client = clientMap.get(cId)!;
        client.hours += ticket.hours;
        client.entries += 1;

        const analystHours = client.analysts.get(analystId) || 0;
        client.analysts.set(analystId, analystHours + ticket.hours);
      });

      const byClient: ClientHoursSummary[] = Array.from(clientMap.entries())
        .map(([client_id, data]) => {
          // Find top analyst for this client
          let topAnalystId: string | null = null;
          let topHours = 0;
          data.analysts.forEach((hours, analystId) => {
            if (hours > topHours) {
              topHours = hours;
              topAnalystId = analystId;
            }
          });

          // Get analyst name
          const topAnalystTicket = ticketsWithHours.find(
            (ticket: any) => ticket.analyst_id === topAnalystId
          );
          const topAnalystName = topAnalystTicket?.profiles?.full_name?.split(" ")[0] || null;

          return {
            client_id,
            client_name: data.name,
            total_hours: Math.round(data.hours * 10) / 10,
            total_entries: data.entries,
            avg_hours_per_entry:
              data.entries > 0
                ? Math.round((data.hours / data.entries) * 10) / 10
                : 0,
            top_analyst: topAnalystName,
          };
        })
        .sort((a, b) => b.total_hours - a.total_hours);

      // Overall stats
      const totalHours = ticketsWithHours.reduce(
        (sum: number, ticket: any) => sum + ticket.hours,
        0
      );
      const totalEntries = ticketsWithHours.length;
      const uniqueAnalysts = new Set(
        ticketsWithHours
          .map((ticket: any) => ticket.analyst_id)
          .filter((id: any) => id !== null)
      ).size;

      // Per-ticket status breakdown using ticket_history
      const ticketIds = ticketsWithHours.map((t: any) => t.id);
      let history: any[] = [];
      if (ticketIds.length > 0) {
        const { data: histData, error: histError } = await supabase
          .from("ticket_history")
          .select("ticket_id, action_type, new_value, created_at")
          .in("ticket_id", ticketIds)
          .in("action_type", ["created", "status_changed"])
          .order("created_at", { ascending: true });
        if (histError) throw histError;
        history = histData || [];
      }

      const historyByTicket = new Map<string, any[]>();
      history.forEach((h) => {
        const arr = historyByTicket.get(h.ticket_id) || [];
        arr.push(h);
        historyByTicket.set(h.ticket_id, arr);
      });

      const nowMs = Date.now();
      const byClientTickets: ClientTicketStatusBreakdown[] = ticketsWithHours
        .map((ticket: any) => {
          const events = historyByTicket.get(ticket.id) || [];
          const endTs = ticket.resolved_at
            ? new Date(ticket.resolved_at).getTime()
            : nowMs;

          const statusMs = new Map<string, number>();

          if (events.length === 0) {
            // Legacy fallback
            const ms = endTs - new Date(ticket.created_at).getTime();
            statusMs.set(ticket.status || "novo", Math.max(0, ms));
          } else {
            for (let i = 0; i < events.length; i++) {
              const ev = events[i];
              const startTs = new Date(ev.created_at).getTime();
              const nextTs =
                i + 1 < events.length
                  ? new Date(events[i + 1].created_at).getTime()
                  : endTs;
              const status =
                ev.action_type === "created"
                  ? ev.new_value || "novo"
                  : ev.new_value || "novo";
              const ms = Math.max(0, nextTs - startTs);
              statusMs.set(status, (statusMs.get(status) || 0) + ms);
            }
          }

          const status_breakdown: TicketStatusBreakdownEntry[] = Array.from(
            statusMs.entries()
          )
            .map(([status, ms]) => ({
              status,
              hours: Math.round((ms / 3_600_000) * 10) / 10,
            }))
            .filter((e) => e.hours > 0)
            .sort((a, b) => b.hours - a.hours);

          const total_hours =
            Math.round(
              status_breakdown.reduce((s, e) => s + e.hours, 0) * 10
            ) / 10;

          return {
            client_id: ticket.client_id,
            client_name: ticket.clients?.name || "Desconhecido",
            ticket_id: ticket.id,
            ticket_number: ticket.ticket_number || "",
            ticket_title: ticket.title || "",
            total_hours,
            status_breakdown,
          };
        })
        .sort((a, b) => {
          const c = a.client_name.localeCompare(b.client_name);
          if (c !== 0) return c;
          return b.total_hours - a.total_hours;
        });

      return {
        byAnalyst,
        byQueue,
        byTeam,
        byType,
        byClient,
        byClientTickets,
        overall: {
          total_hours: Math.round(totalHours * 10) / 10,
          total_entries: totalEntries,
          avg_hours_per_entry:
            totalEntries > 0
              ? Math.round((totalHours / totalEntries) * 10) / 10
              : 0,
          unique_analysts: uniqueAnalysts,
        },
      };
    },
  });
}
