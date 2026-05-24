import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SLAPauseRow {
  id: string;
  ticket_id: string;
  paused_at: string;
  resumed_at: string | null;
  status_during_pause: string;
  pause_minutes: number | null;
  paused_by: string | null;
  resumed_by: string | null;
  paused_by_name?: string | null;
  resumed_by_name?: string | null;
}

export function useTicketSLAPauses(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-sla-pauses", ticketId],
    enabled: !!ticketId,
    queryFn: async (): Promise<SLAPauseRow[]> => {
      const { data, error } = await supabase
        .from("ticket_sla_pauses")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("paused_at", { ascending: false });

      if (error) throw error;
      const rows = (data || []) as SLAPauseRow[];

      const userIds = Array.from(
        new Set(
          rows
            .flatMap((r) => [r.paused_by, r.resumed_by])
            .filter((v): v is string => !!v)
        )
      );

      if (userIds.length === 0) return rows;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

      return rows.map((r) => ({
        ...r,
        paused_by_name: r.paused_by ? nameMap.get(r.paused_by) ?? null : null,
        resumed_by_name: r.resumed_by ? nameMap.get(r.resumed_by) ?? null : null,
      }));
    },
  });
}