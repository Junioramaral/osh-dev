import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketTimeLogRow {
  id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  description: string | null;
  project_id: string | null;
  project_name: string | null;
  project_is_overtime: boolean;
  analyst_id: string;
  analyst_name: string;
}

export function useTicketTimeLogs(ticketId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["ticket-time-logs", ticketId],
    enabled: !!ticketId && enabled,
    queryFn: async (): Promise<TicketTimeLogRow[]> => {
      const { data, error } = await supabase
        .from("ticket_time_logs")
        .select(`
          id,
          work_date,
          start_time,
          end_time,
          hours,
          description,
          project_id,
          analyst_id,
          client_projects ( name, is_overtime )
        `)
        .eq("ticket_id", ticketId!)
        .order("work_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw error;

      const rows = data ?? [];
      const analystIds = Array.from(
        new Set(rows.map((r: any) => r.analyst_id).filter(Boolean))
      );

      let analystMap: Record<string, string> = {};
      if (analystIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", analystIds);
        analystMap = Object.fromEntries(
          (profiles ?? []).map((p: any) => [p.id, p.full_name ?? "—"])
        );
      }

      return rows.map((r: any) => ({
        id: r.id,
        work_date: r.work_date,
        start_time: r.start_time,
        end_time: r.end_time,
        hours: Number(r.hours ?? 0),
        description: r.description,
        project_id: r.project_id,
        project_name: r.client_projects?.name ?? null,
        project_is_overtime: !!r.client_projects?.is_overtime,
        analyst_id: r.analyst_id,
        analyst_name: analystMap[r.analyst_id] ?? "—",
      }));
    },
  });
}