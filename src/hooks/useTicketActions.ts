import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

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
        .select("id, ticket_number, title, contact_email, contact_name, created_at, analyst_id, team_id, queue_id")
        .eq("id", ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new Error("Ticket não encontrado");
      }

      // Validação obrigatória: Analista, Time e Fila atribuídos
      const effectiveAnalystId = ticket.analyst_id || userId; // auto-allocate caso não tenha
      if (!effectiveAnalystId || !ticket.team_id || !ticket.queue_id) {
        throw new Error("Atribua Analista, Time e Fila antes de resolver o ticket.");
      }

      const resolvedAt = new Date().toISOString();

      // 3. Update ticket status + auto-allocate if no analyst
      const updateData: Record<string, any> = {
        status: "resolvido" as TicketStatus,
        resolved_at: resolvedAt,
        resolved_by: authorName,
      };

      if (!ticket.analyst_id) {
        updateData.analyst_id = userId;
        updateData.lock_status = "locked";
        updateData.lock_owner_id = userId;
        updateData.lock_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // 4. Insert comment with resolution reason
      const { error: commentError } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: ticketId,
          author_id: userId,
          sender_name: authorName,
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
      const updateData: Record<string, any> = { status };

      const { data: { user } } = await supabase.auth.getUser();

      // Check current ticket for auto-allocation
      if (user) {
        const { data: currentTicket } = await supabase
          .from("tickets")
          .select("analyst_id")
          .eq("id", ticketId)
          .single();

        // Auto-allocate if no analyst assigned
        if (currentTicket && !currentTicket.analyst_id) {
          updateData.analyst_id = user.id;
          updateData.lock_status = "locked";
          updateData.lock_owner_id = user.id;
          updateData.lock_at = new Date().toISOString();
        }

        // If resolving, also set resolved_by and resolved_at
        if (status === "resolvido") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
          updateData.resolved_by = profile?.full_name || "Analista";
          updateData.resolved_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
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
    updateTicketPriority,
  };
}
