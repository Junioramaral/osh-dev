import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePendingTicketsCount = () => {
  return useQuery({
    queryKey: ["pending-tickets-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["novo", "em_atendimento", "aguardando_cliente"]);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
};
