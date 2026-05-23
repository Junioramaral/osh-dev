import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InactiveTicket {
  id: string;
  ticket_number: string;
  title: string;
  updated_at: string;
  client_name: string;
  analyst_name: string | null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "https://osh.tec.br";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Iniciando verificação de tickets inativos...");

    // Buscar configuração de dias de inatividade
    const { data: configData } = await supabase
      .from("system_configs")
      .select("value")
      .eq("key", "ticket_inactivity_days")
      .maybeSingle();

    const inactivityDays = configData?.value ? Number(configData.value) : 7;
    console.log(`Configuração: ${inactivityDays} dias de inatividade`);

    // Buscar tickets inativos
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);

    const { data: inactiveTickets, error: fetchError } = await supabase
      .from("tickets")
      .select(`
        id,
        ticket_number,
        title,
        updated_at,
        clients!inner(name),
        profiles!tickets_analyst_id_fkey(full_name)
      `)
      .not("analyst_id", "is", null)
      .not("status", "in", '("resolvido","fechado")')
      .lt("updated_at", cutoffDate.toISOString());

    if (fetchError) {
      console.error("Erro ao buscar tickets inativos:", fetchError);
      throw fetchError;
    }

    if (!inactiveTickets || inactiveTickets.length === 0) {
      console.log("Nenhum ticket inativo encontrado.");
      return new Response(
        JSON.stringify({ message: "Nenhum ticket inativo encontrado", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontrados ${inactiveTickets.length} tickets inativos.`);

    // Preparar dados para email antes de atualizar
    const ticketsForEmail: InactiveTicket[] = inactiveTickets.map((ticket: any) => ({
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      updated_at: ticket.updated_at,
      client_name: ticket.clients?.name || "N/A",
      analyst_name: ticket.profiles?.full_name || "N/A",
    }));

    // Atualizar tickets - desbloquear e remover analista
    const ticketIds = inactiveTickets.map((t: any) => t.id);

    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        analyst_id: null,
        lock_status: "unlocked",
        lock_owner_id: null,
        lock_at: null,
        unlocked_at: new Date().toISOString(),
        status: "liberado",
      })
      .in("id", ticketIds);

    if (updateError) {
      console.error("Erro ao atualizar tickets:", updateError);
      throw updateError;
    }

    console.log(`${ticketIds.length} tickets desbloqueados com sucesso.`);

    // Inserir histórico para cada ticket
    for (const ticket of inactiveTickets) {
      await supabase.from("ticket_history").insert({
        ticket_id: ticket.id,
        action_type: "unlocked_by_inactivity",
        old_value: (ticket as any).profiles?.full_name || null,
        new_value: null,
        metadata: { reason: "inactivity_7_days" },
      });
    }

    // Enviar email de notificação
    if (resendApiKey && ticketsForEmail.length > 0) {
      const resend = new Resend(resendApiKey);

      // Calcular dias de inatividade para cada ticket
      const ticketRows = ticketsForEmail.map((ticket) => {
        const lastUpdate = new Date(ticket.updated_at);
        const now = new Date();
        const daysInactive = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">
              <a href="${appUrl}/tickets/${ticket.id}" style="color: #667eea; text-decoration: none;">
                #${ticket.ticket_number}
              </a>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
              ${ticket.title}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              ${ticket.client_name}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              ${ticket.analyst_name}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              <span style="background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                ${daysInactive} dias
              </span>
            </td>
          </tr>
        `;
      }).join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 24px;">⏰ Tickets Retornados à Fila</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                ${ticketsForEmail.length} ticket(s) desbloqueado(s) por inatividade
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Os seguintes tickets não tiveram atualizações nos últimos <strong>${inactivityDays} dias</strong> e foram automaticamente 
                removidos da responsabilidade do analista, retornando para a fila geral.
              </p>
              
              <!-- Tickets Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                <thead>
                  <tr style="background-color: #fef3c7;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d97706; color: #92400e;">Ticket</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d97706; color: #92400e;">Título</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d97706; color: #92400e;">Cliente</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d97706; color: #92400e;">Último Analista</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #d97706; color: #92400e;">Dias Inativo</th>
                  </tr>
                </thead>
                <tbody>
                  ${ticketRows}
                </tbody>
              </table>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 30px;">
                <a href="${appUrl}/tickets" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; 
                          font-weight: 600; font-size: 14px;">
                  Ver Todos os Tickets
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Esta é uma notificação automática do sistema de gestão de tickets.
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
                Executado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "Sistema Otimizzo <noreply@resend.otimizzo.com>",
          to: ["suporte@resend.otimizzo.com"],
          subject: `⏰ ${ticketsForEmail.length} ticket(s) retornaram à fila por inatividade`,
          html: emailHtml,
        });
        console.log("Email de notificação enviado com sucesso.");
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
        // Não falhar a função por causa do email
      }
    }

    return new Response(
      JSON.stringify({
        message: "Tickets inativos processados com sucesso",
        count: ticketIds.length,
        tickets: ticketsForEmail.map((t) => t.ticket_number),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro na função unlock-inactive-tickets:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
