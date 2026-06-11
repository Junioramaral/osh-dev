import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Props {
  ticketId: string;
}

export default function TicketLinkedTicketsCard({ ticketId }: Props) {
  const { data: links = [] } = useQuery({
    queryKey: ["ticket-links", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      // Forward links (this ticket links to others)
      const { data: forward, error: e1 } = await supabase
        .from("ticket_links")
        .select("linked_ticket_id, linked_at, tickets:linked_ticket_id(id, ticket_number, title, status)")
        .eq("ticket_id", ticketId);
      if (e1) throw e1;

      // Reverse links (other tickets that link to this one)
      const { data: reverse, error: e2 } = await supabase
        .from("ticket_links")
        .select("ticket_id, linked_at, tickets:ticket_id(id, ticket_number, title, status)")
        .eq("linked_ticket_id", ticketId);
      if (e2) throw e2;

      const all = [
        ...(forward || []).map((r: any) => ({ ...r.tickets, linked_at: r.linked_at, direction: "out" })),
        ...(reverse || []).map((r: any) => ({ ...r.tickets, linked_at: r.linked_at, direction: "in" })),
      ].filter((t) => t && t.id);

      // Deduplicate by id
      const seen = new Set<string>();
      return all.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
    },
  });

  if (links.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          Tickets Vinculados
          <Badge variant="secondary" className="ml-1">{links.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <ul className="divide-y">
          {links.map((t: any) => (
            <li key={t.id} className="py-2">
              <Link
                to={`/tickets/${t.id}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Badge variant="outline" className="text-xs">#{t.ticket_number}</Badge>
                <Badge variant="secondary" className="text-xs capitalize">
                  {(t.status || "").replace(/_/g, " ")}
                </Badge>
                <span className="text-sm truncate flex-1">{t.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}