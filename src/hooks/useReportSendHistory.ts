import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReportSendLog {
  id: string;
  client_id: string | null;
  client_name?: string;
  report_type: string;
  month: number;
  year: number;
  status: string;
  recipients: string[];
  sent_at: string | null;
  error_message: string | null;
  created_at: string | null;
}

export const useReportSendHistory = () => {
  return useQuery({
    queryKey: ["report-send-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_send_logs")
        .select(`
          *,
          clients:client_id (name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((log) => ({
        ...log,
        client_name: (log.clients as any)?.name || "Cliente removido",
      })) as ReportSendLog[];
    },
  });
};
