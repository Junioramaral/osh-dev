import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FAQHistoryEntry {
  id: string;
  article_id: string;
  user_id: string | null;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user_name: string | null;
}

export function useFAQHistory(articleId: string | undefined) {
  return useQuery({
    queryKey: ["faq-history", articleId],
    queryFn: async () => {
      if (!articleId) return [];

      // Buscar histórico
      const { data: historyData, error: historyError } = await supabase
        .from("faq_history")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      // Buscar nomes dos usuários
      const userIds = [...new Set(historyData?.map((h) => h.user_id).filter(Boolean))] as string[];
      
      let profilesMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Mapear histórico com nomes
      return (historyData || []).map((entry) => ({
        ...entry,
        metadata: entry.metadata as Record<string, unknown>,
        user_name: entry.user_id ? profilesMap[entry.user_id] || null : null,
      })) as FAQHistoryEntry[];
    },
    enabled: !!articleId,
  });
}
