import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to get queue IDs associated with the current analyst via user_queues.
 * Used to filter tickets based on analyst's direct queue assignments.
 */
export function useAnalystQueues() {
  const { user, hasRole, isSuperAdmin, isOtimizzoUser } = useAuth();
  
  const isAnalyst = hasRole('analyst_db') || hasRole('analyst_app');
  const shouldFetchQueues = isAnalyst && !isSuperAdmin && !!user?.id;

  const { data: queueIds, isLoading, error } = useQuery({
    queryKey: ["analyst-queues", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_queues")
        .select("queue_id")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data.map(uq => uq.queue_id);
    },
    enabled: shouldFetchQueues,
  });

  // Also fetch queue names for display purposes
  const { data: queues } = useQuery({
    queryKey: ["analyst-queues-with-names", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_queues")
        .select("queue_id, queues(id, name)")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data.map(uq => ({
        id: uq.queue_id,
        name: (uq.queues as any)?.name || "Fila desconhecida"
      }));
    },
    enabled: shouldFetchQueues,
  });

  return {
    queueIds: queueIds || [],
    queues: queues || [],
    isLoading,
    error,
    isAnalyst,
    hasQueues: (queueIds?.length || 0) > 0,
    // Returns true if analyst should have restricted view
    shouldRestrictView: isAnalyst && !isSuperAdmin && !isOtimizzoUser,
  };
}
