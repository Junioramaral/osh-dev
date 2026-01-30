import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddTimeLogParams {
  ticketId: string;
  hours: number;
  description?: string;
}

export function useTimeLogMutations() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const addTimeLog = useMutation({
    mutationFn: async ({ ticketId, hours, description }: AddTimeLogParams) => {
      if (!profile?.id) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase
        .from("ticket_time_logs")
        .insert({
          ticket_id: ticketId,
          analyst_id: profile.id,
          hours,
          description: description || null,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Horas registradas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ticket-time-logs", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-timeline", variables.ticketId] });
    },
    onError: (error) => {
      console.error("Erro ao registrar horas:", error);
      toast.error("Erro ao registrar horas. Tente novamente.");
    },
  });

  return { addTimeLog };
}
