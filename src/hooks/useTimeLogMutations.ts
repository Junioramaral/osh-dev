import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddTimeLogParams {
  ticketId: string;
  hours: number;
  description?: string;
}

interface UpdateTimeLogParams {
  logId: string;
  ticketId: string;
  hours: number;
  description?: string;
}

interface DeleteTimeLogParams {
  logId: string;
  ticketId: string;
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

  const updateTimeLog = useMutation({
    mutationFn: async ({ logId, hours, description }: UpdateTimeLogParams) => {
      const { error } = await supabase
        .from("ticket_time_logs")
        .update({
          hours,
          description: description || null,
        })
        .eq("id", logId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Horas atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ticket-time-logs", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-timeline", variables.ticketId] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar horas:", error);
      toast.error("Erro ao atualizar horas. Tente novamente.");
    },
  });

  const deleteTimeLog = useMutation({
    mutationFn: async ({ logId }: DeleteTimeLogParams) => {
      const { error } = await supabase
        .from("ticket_time_logs")
        .delete()
        .eq("id", logId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Registro de horas excluído!");
      queryClient.invalidateQueries({ queryKey: ["ticket-time-logs", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-timeline", variables.ticketId] });
    },
    onError: (error) => {
      console.error("Erro ao excluir horas:", error);
      toast.error("Erro ao excluir registro. Tente novamente.");
    },
  });

  return { addTimeLog, updateTimeLog, deleteTimeLog };
}
