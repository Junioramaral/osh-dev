import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LinkableTicket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export function useClientLinkableTickets(
  clientId: string | undefined,
  currentTicketId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["client-linkable-tickets", clientId, currentTicketId],
    enabled: enabled && !!clientId && !!currentTicketId,
    queryFn: async (): Promise<LinkableTicket[]> => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, status, created_at, resolved_at, record_type")
        .eq("client_id", clientId!)
        .neq("id", currentTicketId!)
        .neq("record_type", "rfc")
        .or(
          `and(status.neq.resolvido,status.neq.fechado),resolved_at.gte.${thirtyDaysAgo}`,
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as LinkableTicket[];
    },
  });
}