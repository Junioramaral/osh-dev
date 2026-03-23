import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDeleteTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      // Delete dependent records first
      const tables = [
        "ticket_comments",
        "ticket_history",
        "ticket_time_logs",
        "rfc_steps",
        "sla_notifications",
      ] as const;

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in("ticket_id", ticketIds);
        if (error) throw new Error(`Erro ao excluir ${table}: ${error.message}`);
      }

      // Delete the tickets
      const { error } = await supabase
        .from("tickets")
        .delete()
        .in("id", ticketIds);
      if (error) throw new Error(`Erro ao excluir tickets: ${error.message}`);

      return ticketIds.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} ticket(s) excluído(s) com sucesso`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["pending-tickets-count"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
