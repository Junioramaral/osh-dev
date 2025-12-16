import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export function useTicketActions() {
  const queryClient = useQueryClient();

  const resolveTicketWithReason = useMutation({
    mutationFn: async ({
      ticketId,
      reason,
      userId,
    }: {
      ticketId: string;
      reason: string;
      userId: string;
    }) => {
      // 1. Get analyst profile
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      const authorName = authorProfile?.full_name || "Analista";

      // 2. Get complete ticket data
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, contact_email, contact_name, created_at")
        .eq("id", ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new Error("Ticket não encontrado");
      }

      const resolvedAt = new Date().toISOString();

      // 3. Update ticket status
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          status: "resolvido" as TicketStatus,
          resolved_at: resolvedAt,
        })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // 4. Insert comment with resolution reason
      const { error: commentError } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: ticketId,
          author_id: userId,
          author_name: authorName,
          content: `Motivo da Resolução: ${reason}`,
          is_internal: false,
        });

      if (commentError) {
        console.error("Erro ao inserir comentário:", commentError);
      }

      // 5. Send resolution email
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token && ticket.contact_email) {
        try {
          await fetch(
            `https://ukrgzsntvddzwtmccwbf.supabase.co/functions/v1/send-resolution-notification`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                ticketId: ticket.id,
                ticketNumber: ticket.ticket_number,
                ticketTitle: ticket.title,
                contactEmail: ticket.contact_email,
                contactName: ticket.contact_name,
                resolutionReason: reason,
                analystName: authorName,
                createdAt: ticket.created_at,
                resolvedAt,
              }),
            }
          );
          console.log(`Email de resolução enviado para ${ticket.contact_email}`);
        } catch (emailError) {
          console.error("Erro ao enviar email de resolução:", emailError);
        }
      }

      return ticket;
    },
    onSuccess: () => {
      toast.success("Ticket resolvido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-comments"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao resolver ticket: " + error.message);
    },
  });

  const updateTicketStatus = useMutation({
    mutationFn: async ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: TicketStatus;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  return {
    resolveTicketWithReason,
    updateTicketStatus,
  };
}
