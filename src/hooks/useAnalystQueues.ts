import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to get queue IDs associated with the current analyst's team.
 * Used to filter tickets based on analyst's team queue assignments.
 */
export function useAnalystQueues() {
  const { profile, hasRole, isSuperAdmin, isOtimizzoUser } = useAuth();
  
  const isAnalyst = hasRole('analyst_db') || hasRole('analyst_app');
  const shouldFetchQueues = isAnalyst && !isSuperAdmin && !isOtimizzoUser && !!profile?.team_id;

  const { data: queueIds, isLoading, error } = useQuery({
    queryKey: ["analyst-queues", profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      
      const { data, error } = await supabase
        .from("teams_queues")
        .select("queue_id")
        .eq("team_id", profile.team_id);
      
      if (error) throw error;
      return data.map(tq => tq.queue_id);
    },
    enabled: shouldFetchQueues,
  });

  // Also fetch queue names for display purposes
  const { data: queues } = useQuery({
    queryKey: ["analyst-queues-with-names", profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      
      const { data, error } = await supabase
        .from("teams_queues")
        .select("queue_id, queues(id, name)")
        .eq("team_id", profile.team_id);
      
      if (error) throw error;
      return data.map(tq => ({
        id: tq.queue_id,
        name: (tq.queues as any)?.name || "Fila desconhecida"
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
    hasTeam: !!profile?.team_id,
    hasQueues: (queueIds?.length || 0) > 0,
    // Returns true if analyst should have restricted view
    shouldRestrictView: isAnalyst && !isSuperAdmin && !isOtimizzoUser,
  };
}
