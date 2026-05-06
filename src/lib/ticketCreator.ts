import { supabase } from "@/integrations/supabase/client";

export type TicketCreator = {
  created_by_id: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
};

/**
 * Resolve who opened a ticket using ticket_history (action_type='created').
 * Returns name + email when available.
 */
export async function fetchTicketCreator(ticketId: string): Promise<TicketCreator> {
  const empty: TicketCreator = { created_by_id: null, created_by_name: null, created_by_email: null };
  const { data: hist } = await supabase
    .from("ticket_history")
    .select("user_id, created_at")
    .eq("ticket_id", ticketId)
    .eq("action_type", "created")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const userId = (hist as any)?.user_id as string | null | undefined;
  if (!userId) return empty;

  const [{ data: profile }, { data: emailData }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.rpc("get_user_email", { _user_id: userId }),
  ]);

  return {
    created_by_id: userId,
    created_by_name: (profile as any)?.full_name ?? null,
    created_by_email: (emailData as string) ?? null,
  };
}

export async function attachTicketCreators<T extends { id: string }>(tickets: T[]): Promise<(T & TicketCreator)[]> {
  const results = await Promise.all(tickets.map((t) => fetchTicketCreator(t.id)));
  return tickets.map((t, i) => ({ ...t, ...results[i] }));
}