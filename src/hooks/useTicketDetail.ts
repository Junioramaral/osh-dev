import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTicketDetail(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-detail', ticketId],
    queryFn: async () => {
      if (!ticketId) throw new Error("Ticket ID is required");
      
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          clients(name, domain),
          profiles!tickets_analyst_id_fkey(full_name),
          teams(name, segment),
          database_instances(instance_name, version, engine),
          application_instances(version, environment),
          application_products(name),
          db_machine:machines!tickets_db_machine_id_fkey(hostname),
          app_machine:machines!tickets_app_machine_id_fkey(hostname),
          faq_articles(id, title, symptoms, problem, solution)
        `)
        .eq('id', ticketId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId
  });
}

export function useTicketComments(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-comments', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      
      const { data, error } = await supabase
        .from('ticket_comments')
        .select(`
          *,
          profiles!ticket_comments_author_id_fkey(full_name)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId
  });
}

export function useTicketHistory(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-history', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*, profiles!ticket_history_user_id_fkey(full_name)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId
  });
}

export function useTicketTimeLogs(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-time-logs', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      
      const { data, error } = await supabase
        .from('ticket_time_logs')
        .select('*, profiles!ticket_time_logs_analyst_id_fkey(full_name)')
        .eq('ticket_id', ticketId)
        .order('logged_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId
  });
}

export function useTicketRFCSteps(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-rfc-steps', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      
      const { data, error } = await supabase
        .from('rfc_steps')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      
      // Fetch profiles for started_by and concluded_by
      const userIds = [
        ...data.filter(s => (s as any).started_by).map(s => (s as any).started_by),
        ...data.filter(s => s.concluded_by).map(s => s.concluded_by!),
      ].filter((v, i, a) => a.indexOf(v) === i);
      
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        (profiles ?? []).forEach(p => { profileMap[p.id] = p.full_name; });
      }
      
      return data.map(step => ({
        ...step,
        started_at: (step as any).started_at,
        started_by: (step as any).started_by,
        started_by_name: (step as any).started_by ? profileMap[(step as any).started_by] : null,
        concluded_by_name: step.concluded_by ? profileMap[step.concluded_by] : null,
      }));
    },
    enabled: !!ticketId
  });
}
