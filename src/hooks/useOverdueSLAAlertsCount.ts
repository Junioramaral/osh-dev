import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useOverdueSLAAlertsCount = () => {
  return useQuery({
    queryKey: ["overdue-sla-alerts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sla_notifications")
        .select("*", { count: "exact", head: true })
        .eq("alert_type", "overdue")
        .is("acknowledged_at", null);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export interface OverdueSLAAlert {
  id: string;
  ticket_id: string;
  sla_type: string;
  sent_at: string;
  notification_level: number;
  acknowledgment_token: string;
  email_content: {
    ticket_number: string;
    title: string;
    client: string;
    time_remaining: number;
  };
}

export const useOverdueSLAAlerts = () => {
  return useQuery({
    queryKey: ["overdue-sla-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_notifications")
        .select("id, ticket_id, sla_type, sent_at, notification_level, acknowledgment_token, email_content")
        .eq("alert_type", "overdue")
        .is("acknowledged_at", null)
        .order("sent_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as OverdueSLAAlert[];
    },
    refetchInterval: 30000,
  });
};
