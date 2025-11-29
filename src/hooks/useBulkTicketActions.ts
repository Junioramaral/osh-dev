import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useBulkTicketActions() {
  const queryClient = useQueryClient();

  const bulkAssignAnalyst = useMutation({
    mutationFn: async ({
      ticketIds,
      analystId,
    }: {
      ticketIds: string[];
      analystId: string;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ analyst_id: analystId })
        .in("id", ticketIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.ticketIds.length} ticket(s) atribuído(s) com sucesso!`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atribuir tickets: " + error.message);
    },
  });

  const bulkAssignTeam = useMutation({
    mutationFn: async ({
      ticketIds,
      teamId,
    }: {
      ticketIds: string[];
      teamId: string;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ team_id: teamId })
        .in("id", ticketIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.ticketIds.length} ticket(s) atribuído(s) ao time!`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atribuir time: " + error.message);
    },
  });

  const bulkChangeStatus = useMutation({
    mutationFn: async ({
      ticketIds,
      status,
    }: {
      ticketIds: string[];
      status: string;
    }) => {
      const updates: any = { status };
      
      // Se status for 'resolvido', marcar resolved_at
      if (status === "resolvido") {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .in("id", ticketIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.ticketIds.length} ticket(s) com status alterado!`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao alterar status: " + error.message);
    },
  });

  const bulkChangePriority = useMutation({
    mutationFn: async ({
      ticketIds,
      priority,
    }: {
      ticketIds: string[];
      priority: "P1" | "P2" | "P3" | "P4";
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ priority })
        .in("id", ticketIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.ticketIds.length} ticket(s) com prioridade alterada!`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao alterar prioridade: " + error.message);
    },
  });

  const bulkLockTickets = useMutation({
    mutationFn: async ({
      ticketIds,
      userId,
    }: {
      ticketIds: string[];
      userId: string;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({
          lock_status: "locked",
          lock_owner_id: userId,
          lock_at: new Date().toISOString(),
        })
        .in("id", ticketIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.ticketIds.length} ticket(s) assumido(s) com sucesso!`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao assumir tickets: " + error.message);
    },
  });

  return {
    bulkAssignAnalyst,
    bulkAssignTeam,
    bulkChangeStatus,
    bulkChangePriority,
    bulkLockTickets,
  };
}
