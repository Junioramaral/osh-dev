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
      linkedTicketIds,
    }: {
      ticketId: string;
      reason: string;
      userId: string;
      linkedTicketIds?: string[];
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

      // 5. Insert ticket links (related tickets selected during resolution)
      if (linkedTicketIds && linkedTicketIds.length > 0) {
        const rows = linkedTicketIds.map((linkedId) => ({
          ticket_id: ticketId,
          linked_ticket_id: linkedId,
          linked_by: userId,
        }));
        const { error: linkError } = await supabase
          .from("ticket_links")
          .upsert(rows, { onConflict: "ticket_id,linked_ticket_id", ignoreDuplicates: true });
        if (linkError) {
          console.error("Erro ao vincular tickets:", linkError);
        } else {
          // Log a history entry listing the linked ticket numbers
          const { data: linkedTickets } = await supabase
            .from("tickets")
            .select("ticket_number")
            .in("id", linkedTicketIds);
          const numbers =
            linkedTickets?.map((t: any) => `#${t.ticket_number}`).join(", ") ?? "";
          if (numbers) {
            await supabase.from("ticket_history").insert({
              ticket_id: ticketId,
              user_id: userId,
              action_type: "linked_tickets",
              new_value: numbers,
            });
          }
        }
      }

      // 6. Send resolution email
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token && ticket.contact_email) {
        // Build CC list: creator (Otimizzo) + current resolver (Otimizzo), excluding contact
        const OTIMIZZO_TENANT_ID = "00000000-0000-0000-0000-000000000001";
        const ccCandidates: string[] = [];

        try {
          // Creator: first 'created' entry in ticket_history
          const { data: createdHist } = await supabase
            .from("ticket_history")
            .select("user_id")
            .eq("ticket_id", ticket.id)
            .eq("action_type", "created")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          const candidateIds = Array.from(
            new Set([createdHist?.user_id, userId].filter(Boolean) as string[])
          );

          for (const uid of candidateIds) {
            const { data: roleRow } = await supabase
              .from("user_roles")
              .select("tenant_id")
              .eq("user_id", uid)
              .maybeSingle();
            if (roleRow?.tenant_id !== OTIMIZZO_TENANT_ID) continue;
            const { data: email } = await supabase.rpc("get_user_email", { _user_id: uid });
            if (
              email &&
              typeof email === "string" &&
              email.toLowerCase() !== ticket.contact_email.toLowerCase() &&
              !ccCandidates.includes(email)
            ) {
              ccCandidates.push(email);
            }
          }
        } catch (ccErr) {
          console.error("Erro ao montar CC do e-mail de resolução:", ccErr);
        }

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
                ccEmails: ccCandidates.length > 0 ? ccCandidates : undefined,
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
      queryClient.invalidateQueries({ queryKey: ["ticket-links"] });
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

  const updateTicketPriority = useMutation({
    mutationFn: async ({
      ticketId,
      priority,
      recalculateSLA,
      reason,
    }: {
      ticketId: string;
      priority: TicketPriority;
      recalculateSLA?: boolean;
      reason?: string;
    }) => {
      const updates: Record<string, any> = { priority };

      if (recalculateSLA) {
        // Fetch ticket + client SLA settings
        const { data: t, error: tErr } = await supabase
          .from("tickets")
          .select("client_id, segment, record_type")
          .eq("id", ticketId)
          .single();
        if (tErr) throw tErr;
        if (t.record_type === "rfc") {
          throw new Error("RFCs não possuem SLA");
        }

        const { data: c, error: cErr } = await supabase
          .from("clients")
          .select("*")
          .eq("id", t.client_id)
          .single();
        if (cErr) throw cErr;

        const segPrefix = t.segment === "DB" ? "sla_db" : "sla_app";
        const p = priority.toLowerCase();
        const frMin = (c as any)[`${segPrefix}_${p}_first_response`] as number;
        const resMin = (c as any)[`${segPrefix}_${p}_resolution`] as number;

        const now = new Date();
        const fr = new Date(now.getTime() + frMin * 60_000).toISOString();
        const res = new Date(now.getTime() + resMin * 60_000).toISOString();

        updates.sla_first_response_deadline = fr;
        updates.sla_resolution_deadline = res;
        updates.sla_adjustment_reason = `Recalculado por mudança de prioridade${reason ? `: ${reason}` : ""}`;
        updates.sla_adjusted_at = now.toISOString();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) updates.sla_adjusted_by = user.id;
      }

      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prioridade atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar prioridade: " + error.message);
    },
  });

  const adjustSLA = useMutation({
    mutationFn: async ({
      ticketId,
      firstResponseDeadline,
      resolutionDeadline,
      reason,
    }: {
      ticketId: string;
      firstResponseDeadline: string | null;
      resolutionDeadline: string | null;
      reason: string;
    }) => {
      if (reason.trim().length < 10) {
        throw new Error("Motivo deve ter pelo menos 10 caracteres");
      }
      const { data: { user } } = await supabase.auth.getUser();
      const updates: Record<string, any> = {
        sla_adjustment_reason: reason.trim(),
        sla_adjusted_at: new Date().toISOString(),
        sla_adjusted_by: user?.id || null,
      };
      if (firstResponseDeadline) updates.sla_first_response_deadline = firstResponseDeadline;
      if (resolutionDeadline) updates.sla_resolution_deadline = resolutionDeadline;

      const { error } = await supabase.from("tickets").update(updates).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SLA ajustado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-detail"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao ajustar SLA: " + error.message);
    },
  });

  return {
    resolveTicketWithReason,
    updateTicketStatus,
    updateTicketPriority,
    adjustSLA,
  };
}
