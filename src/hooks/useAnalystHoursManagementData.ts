import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export type PeriodFilter = "current" | "previous" | "last3" | "last6";

export interface TicketHoursDetail {
  ticket_id: string;
  ticket_number: string;
  title: string;
  client_id: string;
  client_name: string;
  analyst_id: string | null;
  analyst_name: string | null;
  status: string;
  segment: string;
  created_at: string;
  resolved_at: string | null;
  lifetime_hours: number;
  logged_hours: number;
  difference_hours: number;
  coverage_rate: number;
}

export interface ClientHoursSummary {
  client_id: string;
  client_name: string;
  ticket_count: number;
  total_lifetime_hours: number;
  total_logged_hours: number;
  total_difference: number;
  coverage_rate: number;
  top_analyst: string | null;
}

export interface AnalystSummary {
  analyst_id: string | null;
  analyst_name: string;
  ticket_count: number;
  total_lifetime_hours: number;
  total_logged_hours: number;
  coverage_rate: number;
}

export interface AnalystHoursManagementData {
  tickets: TicketHoursDetail[];
  byClient: ClientHoursSummary[];
  byAnalyst: AnalystSummary[];
  overall: {
    total_tickets: number;
    total_lifetime_hours: number;
    total_logged_hours: number;
    total_difference: number;
    coverage_rate: number;
    unique_clients: number;
    unique_analysts: number;
    tickets_without_logs: number;
  };
}

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

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_atendimento: "Em Atendimento",
  aguardando_cliente: "Aguardando Cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export function useAnalystHoursManagementData(
  period: PeriodFilter,
  clientId?: string,
  analystId?: string,
  segment?: "DB" | "APP" | null,
  onlyWithoutLogs?: boolean,
  customRange?: { startDate: string; endDate: string }
) {
  return useQuery({
    queryKey: ["analyst-hours-management", period, clientId, analystId, segment, onlyWithoutLogs, customRange?.startDate, customRange?.endDate],
    queryFn: async (): Promise<AnalystHoursManagementData> => {
      const { startDate, endDate } = customRange ?? getPeriodDates(period);

      // Fetch tickets with related data
      let ticketsQuery = supabase
        .from("tickets")
        .select(`
          id,
          ticket_number,
          title,
          client_id,
          analyst_id,
          status,
          segment,
          created_at,
          resolved_at,
          clients(name),
          profiles!tickets_analyst_id_fkey(full_name)
        `)
        .gte("created_at", startDate)
        .lte("created_at", `${endDate}T23:59:59`);

      if (clientId) {
        ticketsQuery = ticketsQuery.eq("client_id", clientId);
      }

      if (analystId) {
        ticketsQuery = ticketsQuery.eq("analyst_id", analystId);
      }

      if (segment) {
        ticketsQuery = ticketsQuery.eq("segment", segment);
      }

      const { data: ticketsData, error: ticketsError } = await ticketsQuery;

      if (ticketsError) throw ticketsError;

      // Fetch all time logs for tickets in period
      const ticketIds = (ticketsData || []).map((t: any) => t.id);
      
      let timeLogs: any[] = [];
      if (ticketIds.length > 0) {
        const { data: logsData, error: logsError } = await supabase
          .from("ticket_time_logs")
          .select("ticket_id, hours")
          .in("ticket_id", ticketIds);

        if (logsError) throw logsError;
        timeLogs = logsData || [];
      }

      // Aggregate logged hours by ticket
      const logsByTicket = new Map<string, number>();
      timeLogs.forEach((log: any) => {
        const current = logsByTicket.get(log.ticket_id) || 0;
        logsByTicket.set(log.ticket_id, current + Number(log.hours));
      });

      // Process tickets
      const now = new Date();
      const tickets: TicketHoursDetail[] = (ticketsData || []).map((ticket: any) => {
        const createdAt = new Date(ticket.created_at);
        const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : now;
        const lifetimeMs = resolvedAt.getTime() - createdAt.getTime();
        const lifetimeHours = Math.round((lifetimeMs / (1000 * 60 * 60)) * 10) / 10;
        
        const loggedHours = Math.round((logsByTicket.get(ticket.id) || 0) * 10) / 10;
        const differenceHours = Math.round((lifetimeHours - loggedHours) * 10) / 10;
        const coverageRate = lifetimeHours > 0 
          ? Math.round((loggedHours / lifetimeHours) * 100 * 10) / 10 
          : 0;

        return {
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          client_id: ticket.client_id,
          client_name: ticket.clients?.name || "Desconhecido",
          analyst_id: ticket.analyst_id,
          analyst_name: ticket.profiles?.full_name?.split(" ")[0] || null,
          status: STATUS_LABELS[ticket.status] || ticket.status,
          segment: ticket.segment,
          created_at: ticket.created_at,
          resolved_at: ticket.resolved_at,
          lifetime_hours: lifetimeHours,
          logged_hours: loggedHours,
          difference_hours: differenceHours,
          coverage_rate: coverageRate,
        };
      });

      // Filter only tickets without logs if requested
      const filteredTickets = onlyWithoutLogs 
        ? tickets.filter(t => t.logged_hours === 0)
        : tickets;

      // Aggregate by client
      const clientMap = new Map<string, {
        name: string;
        tickets: TicketHoursDetail[];
        analysts: Map<string | null, { name: string; hours: number }>;
      }>();

      filteredTickets.forEach((ticket) => {
        if (!clientMap.has(ticket.client_id)) {
          clientMap.set(ticket.client_id, {
            name: ticket.client_name,
            tickets: [],
            analysts: new Map(),
          });
        }
        const client = clientMap.get(ticket.client_id)!;
        client.tickets.push(ticket);

        // Track analyst hours for top analyst
        const analystKey = ticket.analyst_id;
        const current = client.analysts.get(analystKey) || { name: ticket.analyst_name || "Não Atribuído", hours: 0 };
        current.hours += ticket.logged_hours;
        client.analysts.set(analystKey, current);
      });

      const byClient: ClientHoursSummary[] = Array.from(clientMap.entries())
        .map(([client_id, data]) => {
          const totalLifetime = data.tickets.reduce((sum, t) => sum + t.lifetime_hours, 0);
          const totalLogged = data.tickets.reduce((sum, t) => sum + t.logged_hours, 0);
          
          // Find top analyst
          let topAnalyst: string | null = null;
          let maxHours = 0;
          data.analysts.forEach((info, _) => {
            if (info.hours > maxHours) {
              maxHours = info.hours;
              topAnalyst = info.name;
            }
          });

          return {
            client_id,
            client_name: data.name,
            ticket_count: data.tickets.length,
            total_lifetime_hours: Math.round(totalLifetime * 10) / 10,
            total_logged_hours: Math.round(totalLogged * 10) / 10,
            total_difference: Math.round((totalLifetime - totalLogged) * 10) / 10,
            coverage_rate: totalLifetime > 0 
              ? Math.round((totalLogged / totalLifetime) * 100 * 10) / 10 
              : 0,
            top_analyst: topAnalyst,
          };
        })
        .sort((a, b) => b.total_difference - a.total_difference);

      // Aggregate by analyst
      const analystMap = new Map<string | null, {
        name: string;
        tickets: TicketHoursDetail[];
      }>();

      filteredTickets.forEach((ticket) => {
        const key = ticket.analyst_id;
        if (!analystMap.has(key)) {
          analystMap.set(key, {
            name: ticket.analyst_name || "Não Atribuído",
            tickets: [],
          });
        }
        analystMap.get(key)!.tickets.push(ticket);
      });

      const byAnalyst: AnalystSummary[] = Array.from(analystMap.entries())
        .map(([analyst_id, data]) => {
          const totalLifetime = data.tickets.reduce((sum, t) => sum + t.lifetime_hours, 0);
          const totalLogged = data.tickets.reduce((sum, t) => sum + t.logged_hours, 0);

          return {
            analyst_id,
            analyst_name: data.name,
            ticket_count: data.tickets.length,
            total_lifetime_hours: Math.round(totalLifetime * 10) / 10,
            total_logged_hours: Math.round(totalLogged * 10) / 10,
            coverage_rate: totalLifetime > 0 
              ? Math.round((totalLogged / totalLifetime) * 100 * 10) / 10 
              : 0,
          };
        })
        .sort((a, b) => b.coverage_rate - a.coverage_rate);

      // Overall stats
      const totalLifetime = filteredTickets.reduce((sum, t) => sum + t.lifetime_hours, 0);
      const totalLogged = filteredTickets.reduce((sum, t) => sum + t.logged_hours, 0);
      const uniqueClients = new Set(filteredTickets.map(t => t.client_id)).size;
      const uniqueAnalysts = new Set(filteredTickets.map(t => t.analyst_id).filter(Boolean)).size;
      const ticketsWithoutLogs = filteredTickets.filter(t => t.logged_hours === 0).length;

      return {
        tickets: filteredTickets.sort((a, b) => b.difference_hours - a.difference_hours),
        byClient,
        byAnalyst,
        overall: {
          total_tickets: filteredTickets.length,
          total_lifetime_hours: Math.round(totalLifetime * 10) / 10,
          total_logged_hours: Math.round(totalLogged * 10) / 10,
          total_difference: Math.round((totalLifetime - totalLogged) * 10) / 10,
          coverage_rate: totalLifetime > 0 
            ? Math.round((totalLogged / totalLifetime) * 100 * 10) / 10 
            : 0,
          unique_clients: uniqueClients,
          unique_analysts: uniqueAnalysts,
          tickets_without_logs: ticketsWithoutLogs,
        },
      };
    },
  });
}
