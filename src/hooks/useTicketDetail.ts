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
          app_machine:machines!tickets_app_machine_id_fkey(hostname)
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
