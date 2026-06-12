import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddTimeLogParams {
  ticketId: string;
  projectId?: string;
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  description?: string;
}

interface UpdateTimeLogParams {
  logId: string;
  ticketId: string;
  projectId?: string;
  workDate?: string;
  startTime?: string;
  endTime?: string;
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
    mutationFn: async ({ 
      ticketId, 
      projectId, 
      workDate, 
      startTime, 
      endTime, 
      hours, 
      description 
    }: AddTimeLogParams) => {
      if (!profile?.id) {
        throw new Error("Usuário não autenticado");
      }

      const insertData: any = {
        ticket_id: ticketId,
        analyst_id: profile.id,
        hours,
        description: description || null,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
      };

      // Only add project_id if it's a valid UUID (not empty or "none")
      if (projectId && projectId !== "none" && projectId.length > 0) {
        insertData.project_id = projectId;
      }

      const { error } = await supabase
        .from("ticket_time_logs")
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Horas registradas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ticket-time-logs", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-timeline", variables.ticketId] });
    },
    onError: (error: any) => {
      console.error("Erro ao registrar horas:", error);
      const msg = String(error?.message ?? "");
      if (msg.includes("TIME_LOG_OVERLAP")) {
        const clean = msg.replace(/.*TIME_LOG_OVERLAP:\s*/, "");
        toast.error(clean || "Já existe um lançamento que se sobrepõe a este horário.");
      } else {
        toast.error("Erro ao registrar horas. Tente novamente.");
      }
    },
  });

  const updateTimeLog = useMutation({
    mutationFn: async ({ 
      logId, 
      projectId, 
      workDate, 
      startTime, 
      endTime, 
      hours, 
      description 
    }: UpdateTimeLogParams) => {
      const updateData: any = {
        hours,
        description: description || null,
      };

      // Only update optional fields if provided
      if (workDate) updateData.work_date = workDate;
      if (startTime) updateData.start_time = startTime;
      if (endTime) updateData.end_time = endTime;
      
      // Handle project_id: set to null if "none" or empty, otherwise use the value
      if (projectId === "none" || projectId === "") {
        updateData.project_id = null;
      } else if (projectId) {
        updateData.project_id = projectId;
      }

      const { error } = await supabase
        .from("ticket_time_logs")
        .update(updateData)
        .eq("id", logId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Horas atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ticket-time-logs", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-timeline", variables.ticketId] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar horas:", error);
      const msg = String(error?.message ?? "");
      if (msg.includes("TIME_LOG_OVERLAP")) {
        const clean = msg.replace(/.*TIME_LOG_OVERLAP:\s*/, "");
        toast.error(clean || "Já existe um lançamento que se sobrepõe a este horário.");
      } else {
        toast.error("Erro ao atualizar horas. Tente novamente.");
      }
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
