import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export interface AnalystHours {
  analyst_id: string;
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

export interface ClientHoursData {
  byAnalyst: AnalystHours[];
  byQueue: QueueHours[];
  byTeam: TeamHours[];
  byType: TypeHours[];
  byClient: ClientHoursSummary[];
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

export function useClientHoursData(
  period: PeriodFilter,
  clientId?: string,
  segment?: "DB" | "APP" | null
) {
  return useQuery({
    queryKey: ["client-hours", period, clientId, segment],
    queryFn: async (): Promise<ClientHoursData> => {
      const { startDate, endDate } = getPeriodDates(period);

      let query = supabase
        .from("ticket_time_logs")
        .select(`
          id,
          hours,
          logged_at,
          analyst_id,
          profiles!ticket_time_logs_analyst_id_fkey(full_name),
          tickets!inner(
            client_id,
            queue_id,
            team_id,
            ticket_type,
            segment,
            clients(name),
            queues(name),
            teams(name)
          )
        `)
        .gte("logged_at", startDate)
        .lte("logged_at", `${endDate}T23:59:59`);

      const { data, error } = await query;

      if (error) throw error;

      // Filter by client and segment in memory (Supabase nested filters are limited)
      let filteredData = data || [];

      if (clientId) {
        filteredData = filteredData.filter(
          (log: any) => log.tickets?.client_id === clientId
        );
      }

      if (segment) {
        filteredData = filteredData.filter(
          (log: any) => log.tickets?.segment === segment
        );
      }

      // Aggregate by analyst
      const analystMap = new Map<string, { name: string; hours: number }>();
      filteredData.forEach((log: any) => {
        const analystId = log.analyst_id;
        const analystName = log.profiles?.full_name || "Desconhecido";
        const existing = analystMap.get(analystId) || { name: analystName, hours: 0 };
        existing.hours += Number(log.hours) || 0;
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
      filteredData.forEach((log: any) => {
        const queueId = log.tickets?.queue_id || null;
        const queueName = log.tickets?.queues?.name || "Sem Fila";
        const existing = queueMap.get(queueId) || { name: queueName, hours: 0 };
        existing.hours += Number(log.hours) || 0;
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
      filteredData.forEach((log: any) => {
        const teamId = log.tickets?.team_id || null;
        const teamName = log.tickets?.teams?.name || "Sem Time";
        const existing = teamMap.get(teamId) || { name: teamName, hours: 0 };
        existing.hours += Number(log.hours) || 0;
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
      filteredData.forEach((log: any) => {
        const ticketType = log.tickets?.ticket_type || "unknown";
        const existing = typeMap.get(ticketType) || 0;
        typeMap.set(ticketType, existing + (Number(log.hours) || 0));
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
        { name: string; hours: number; entries: number; analysts: Map<string, number> }
      >();
      filteredData.forEach((log: any) => {
        const cId = log.tickets?.client_id;
        const cName = log.tickets?.clients?.name || "Desconhecido";
        const analystId = log.analyst_id;
        const hours = Number(log.hours) || 0;

        if (!clientMap.has(cId)) {
          clientMap.set(cId, { name: cName, hours: 0, entries: 0, analysts: new Map() });
        }

        const client = clientMap.get(cId)!;
        client.hours += hours;
        client.entries += 1;

        const analystHours = client.analysts.get(analystId) || 0;
        client.analysts.set(analystId, analystHours + hours);
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
          const topAnalystLog = filteredData.find(
            (log: any) => log.analyst_id === topAnalystId
          );
          const topAnalystName = topAnalystLog?.profiles?.full_name?.split(" ")[0] || null;

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
      const totalHours = filteredData.reduce(
        (sum: number, log: any) => sum + (Number(log.hours) || 0),
        0
      );
      const totalEntries = filteredData.length;
      const uniqueAnalysts = new Set(filteredData.map((log: any) => log.analyst_id)).size;

      return {
        byAnalyst,
        byQueue,
        byTeam,
        byType,
        byClient,
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
