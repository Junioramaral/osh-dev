import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface MyTimeLogRow {
  id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  description: string | null;
  analyst_id: string;
  analyst_name: string | null;
  ticket_id: string;
  ticket_number: string;
  ticket_title: string;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
}

export interface MyTimeLogsFilters {
  startDate: Date;
  endDate: Date;
  analystId: string; // 'all' allowed only for tenant admin
  clientId: string;  // 'all' or uuid
  projectId: string; // 'all' or uuid
  isTenantAdmin: boolean;
  currentUserId?: string;
}

export function useMyTimeLogsData(filters: MyTimeLogsFilters) {
  return useQuery({
    queryKey: ["my-time-logs", filters],
    enabled: !!filters.currentUserId,
    queryFn: async () => {
      const startStr = format(filters.startDate, "yyyy-MM-dd");
      const endStr = format(filters.endDate, "yyyy-MM-dd");

      let query = supabase
        .from("ticket_time_logs")
        .select(`
          id,
          work_date,
          start_time,
          end_time,
          hours,
          description,
          analyst_id,
          ticket_id,
          project_id,
          tickets!inner ( id, ticket_number, title, client_id, clients ( id, name ) ),
          client_projects ( id, name )
        `)
        .gte("work_date", startStr)
        .lte("work_date", endStr)
        .order("work_date", { ascending: false })
        .order("start_time", { ascending: true });

      // Force own logs unless tenant admin
      if (!filters.isTenantAdmin) {
        query = query.eq("analyst_id", filters.currentUserId!);
      } else if (filters.analystId !== "all") {
        query = query.eq("analyst_id", filters.analystId);
      } else {
        // Tenant Admin + "Todos": restrict to internal analysts (tenant owner)
        const { data: internal } = await supabase
          .from("profiles")
          .select("id")
          .is("client_id", null);
        const internalIds = (internal ?? []).map((p: any) => p.id);
        if (internalIds.length === 0) return [] as MyTimeLogRow[];
        query = query.in("analyst_id", internalIds);
      }

      if (filters.clientId !== "all") {
        query = query.eq("tickets.client_id", filters.clientId);
      }
      if (filters.projectId !== "all") {
        query = query.eq("project_id", filters.projectId);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;

      const analystIds = Array.from(new Set((data ?? []).map((r: any) => r.analyst_id))).filter(Boolean);
      let analystMap: Record<string, string> = {};
      if (analystIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", analystIds);
        analystMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      }

      const rows: MyTimeLogRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        work_date: r.work_date,
        start_time: r.start_time,
        end_time: r.end_time,
        hours: Number(r.hours) || 0,
        description: r.description,
        analyst_id: r.analyst_id,
        analyst_name: analystMap[r.analyst_id] ?? null,
        ticket_id: r.ticket_id,
        ticket_number: r.tickets?.ticket_number ?? "",
        ticket_title: r.tickets?.title ?? "",
        client_id: r.tickets?.client_id ?? "",
        client_name: r.tickets?.clients?.name ?? "",
        project_id: r.project_id,
        project_name: r.client_projects?.name ?? null,
      }));

      return rows;
    },
  });
}