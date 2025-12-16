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

  const bulkChangeStatusWithReason = useMutation({
    mutationFn: async ({
      ticketIds,
      status,
      reason,
      userId,
    }: {
      ticketIds: string[];
      status: string;
      reason: string;
      userId: string;
    }) => {
      // 1. Buscar dados do analista (autor)
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      
      const authorName = authorProfile?.full_name || "Analista";

      // 2. Buscar dados completos dos tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, contact_email, contact_name, client_id")
        .in("id", ticketIds);

      if (!tickets || tickets.length === 0) {
        throw new Error("Tickets não encontrados");
      }

      const updates: any = { status };
      
      if (status === "resolvido") {
        updates.resolved_at = new Date().toISOString();
      }

      // 3. Atualizar status dos tickets
      const { error: updateError } = await supabase
        .from("tickets")
        .update(updates)
        .in("id", ticketIds);

      if (updateError) throw updateError;

      // 4. Obter sessão para auth
      const { data: { session } } = await supabase.auth.getSession();

      // 5. Buscar dados de created_at dos tickets
      const { data: ticketsWithDates } = await supabase
        .from("tickets")
        .select("id, created_at")
        .in("id", ticketIds);

      const ticketCreatedAtMap = new Map(
        ticketsWithDates?.map(t => [t.id, t.created_at]) || []
      );

      // 6. Inserir comentários e enviar emails para cada ticket
      for (const ticket of tickets) {
        const commentContent = `Motivo da Resolução: ${reason}`;
        
        // Inserir comentário
        const { error: commentError } = await supabase
          .from("ticket_comments")
          .insert({
            ticket_id: ticket.id,
            author_id: userId,
            author_name: authorName,
            content: commentContent,
            is_internal: false,
          });

        if (commentError) {
          console.error("Erro ao inserir comentário:", commentError);
          continue;
        }

        // Enviar email de resolução para o cliente
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
                  createdAt: ticketCreatedAtMap.get(ticket.id) || new Date().toISOString(),
                  resolvedAt: updates.resolved_at,
                }),
              }
            );
            console.log(`Email de resolução enviado para ${ticket.contact_email} - Ticket ${ticket.ticket_number}`);
          } catch (emailError) {
            console.error(`Erro ao enviar email para ticket ${ticket.ticket_number}:`, emailError);
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.ticketIds.length} ticket(s) resolvido(s) com sucesso!`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-comments"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao resolver tickets: " + error.message);
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
          analyst_id: userId,
        })
        .in("id", ticketIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.ticketIds.length} ticket(s) assumido(s) com sucesso!`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao assumir tickets: " + error.message);
    },
  });

  const bulkAssignQueue = useMutation({
    mutationFn: async ({
      ticketIds,
      queueId,
    }: {
      ticketIds: string[];
      queueId: string | null;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ queue_id: queueId })
        .in("id", ticketIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.ticketIds.length} ticket(s) com fila atualizada!`
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atribuir fila: " + error.message);
    },
  });

  return {
    bulkAssignAnalyst,
    bulkAssignTeam,
    bulkAssignQueue,
    bulkChangeStatus,
    bulkChangeStatusWithReason,
    bulkChangePriority,
    bulkLockTickets,
  };
}
