import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useMyTicketsCount = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["my-tickets-count", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      
      const { count, error } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["novo", "em_atendimento", "aguardando_cliente"])
        .or(`analyst_id.eq.${profile.id},lock_owner_id.eq.${profile.id}`);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });
};
