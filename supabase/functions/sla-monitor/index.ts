import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface TicketAlert {
  id: string;
  ticket_number: string;
  title: string;
  priority: string;
  client_name: string;
  alert_type: 'warning' | 'overdue';
  sla_type: 'first_response' | 'resolution';
  deadline: string;
  time_remaining_minutes: number;
  notification_level: number;
  escalate: boolean;
}

interface TicketWithClient {
  id: string;
  ticket_number: string;
  title: string;
  priority: string;
  status: string;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  sla_first_response_deadline: string | null;
  sla_resolution_deadline: string | null;
  clients: { name: string } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 SLA Monitor: Starting check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://osh.tec.br";
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const THROTTLE_HOURS = 12; // Silence notifications for 12 hours after acknowledgment

    // ========== BUSCAR TICKETS EM RISCO ==========

    const { data: tickets, error: ticketsError } = await adminClient
      .from("tickets")
      .select(`
        id,
        ticket_number,
        title,
        priority,
        status,
        created_at,
        first_response_at,
        resolved_at,
        sla_first_response_deadline,
        sla_resolution_deadline,
        clients(name)
      `)
      .not("status", "in", '("resolvido","fechado")')
      .order("created_at", { ascending: true });

    if (ticketsError) {
      console.error("❌ Error fetching tickets:", ticketsError);
      throw ticketsError;
    }

    console.log(`📊 Found ${tickets?.length || 0} active tickets`);

    // ========== ANALISAR CADA TICKET ==========

    const alerts: TicketAlert[] = [];

    for (const ticket of tickets || []) {
      const clientName = Array.isArray((ticket as any).clients) 
        ? (ticket as any).clients[0]?.name || 'N/A'
        : (ticket as any).clients?.name || 'N/A';

      // Verificar First Response SLA
      if (!ticket.first_response_at && ticket.sla_first_response_deadline) {
        const deadline = new Date(ticket.sla_first_response_deadline);
        const minutesRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60));
        const createdAt = new Date(ticket.created_at);
        const totalMinutes = Math.floor((deadline.getTime() - createdAt.getTime()) / (1000 * 60));
        const percentage = ((totalMinutes - minutesRemaining) / totalMinutes) * 100;

        let alertType: 'warning' | 'overdue' | null = null;

        if (minutesRemaining < 0) {
          alertType = 'overdue';
        } else if (percentage > 75) {
          alertType = 'warning';
        }

        if (alertType) {
          const shouldSendResult = await shouldSendNotification(
            adminClient,
            ticket.id,
            "first_response",
            alertType,
            now,
            THROTTLE_HOURS
          );

          if (shouldSendResult.shouldSend) {
            alerts.push({
              id: ticket.id,
              ticket_number: ticket.ticket_number,
              title: ticket.title,
              priority: ticket.priority,
              client_name: clientName,
              alert_type: alertType,
              sla_type: 'first_response',
              deadline: ticket.sla_first_response_deadline,
              time_remaining_minutes: minutesRemaining,
              notification_level: shouldSendResult.nextLevel,
              escalate: shouldSendResult.escalate,
            });
          }
        }
      }

      // Verificar Resolution SLA
      if (ticket.first_response_at && !ticket.resolved_at && ticket.sla_resolution_deadline) {
        const deadline = new Date(ticket.sla_resolution_deadline);
        const minutesRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60));
        const createdAt = new Date(ticket.created_at);
        const totalMinutes = Math.floor((deadline.getTime() - createdAt.getTime()) / (1000 * 60));
        const percentage = ((totalMinutes - minutesRemaining) / totalMinutes) * 100;

        let alertType: 'warning' | 'overdue' | null = null;

        if (minutesRemaining < 0) {
          alertType = 'overdue';
        } else if (percentage > 75) {
          alertType = 'warning';
        }

        if (alertType) {
          const shouldSendResult = await shouldSendNotification(
            adminClient,
            ticket.id,
            "resolution",
            alertType,
            now,
            THROTTLE_HOURS
          );

          if (shouldSendResult.shouldSend) {
            alerts.push({
              id: ticket.id,
              ticket_number: ticket.ticket_number,
              title: ticket.title,
              priority: ticket.priority,
              client_name: clientName,
              alert_type: alertType,
              sla_type: 'resolution',
              deadline: ticket.sla_resolution_deadline,
              time_remaining_minutes: minutesRemaining,
              notification_level: shouldSendResult.nextLevel,
              escalate: shouldSendResult.escalate,
            });
          }
        }
      }
    }

    console.log(`🚨 Found ${alerts.length} SLA alerts to send`);

    if (alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, alerts_sent: 0, message: "No alerts needed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== BUSCAR EMAILS DO TIME OTIMIZZO ==========

    const OTIMIZZO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

    const { data: otimizzoUsers, error: usersError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("client_id", OTIMIZZO_TENANT_ID)
      .eq("is_active", true);

    if (usersError || !otimizzoUsers?.length) {
      console.error("❌ Error fetching Otimizzo users:", usersError);
      throw new Error("No Otimizzo users found");
    }

    const userIds = otimizzoUsers.map(u => u.id);

    // Buscar emails do auth.users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error fetching auth users:", authError);
      throw authError;
    }

    const otimizzoEmails = authUsers.users
      .filter(u => userIds.includes(u.id))
      .map(u => u.email!)
      .filter(Boolean);

    // ========== BUSCAR SUPER ADMINS PARA ESCALONAMENTO ==========

    const hasEscalatedAlerts = alerts.some(a => a.escalate);
    let superAdminEmails: string[] = [];

    if (hasEscalatedAlerts) {
      const { data: superAdminRoles } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      if (superAdminRoles?.length) {
        const superAdminIds = superAdminRoles.map(r => r.user_id);
        superAdminEmails = authUsers.users
          .filter(u => superAdminIds.includes(u.id))
          .map(u => u.email!)
          .filter(Boolean);

        console.log(`📧 Including ${superAdminEmails.length} Super Admins in escalated alerts`);
      }
    }

    console.log(`📧 Sending alerts to ${otimizzoEmails.length} Otimizzo users`);

    // ========== AGRUPAR ALERTAS POR TIPO ==========

    const overdueAlerts = alerts.filter(a => a.alert_type === 'overdue');
    const warningAlerts = alerts.filter(a => a.alert_type === 'warning');
    const escalatedAlerts = alerts.filter(a => a.escalate);

    // ========== GERAR HTML DO EMAIL ==========

    const formatTime = (minutes: number): string => {
      const absMinutes = Math.abs(minutes);
      const hours = Math.floor(absMinutes / 60);
      const mins = absMinutes % 60;
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
      } else if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
      } else {
        return `${mins}min`;
      }
    };

    // First, insert notifications to get IDs and tokens
    const notificationsToInsert = alerts.map(alert => ({
      ticket_id: alert.id,
      alert_type: alert.alert_type,
      sla_type: alert.sla_type,
      recipients: alert.escalate ? [...otimizzoEmails, ...superAdminEmails] : otimizzoEmails,
      notification_level: alert.notification_level,
      email_content: {
        ticket_number: alert.ticket_number,
        title: alert.title,
        client: alert.client_name,
        time_remaining: alert.time_remaining_minutes,
      },
    }));

    const { data: insertedNotifications, error: insertError } = await adminClient
      .from("sla_notifications")
      .insert(notificationsToInsert)
      .select("id, acknowledgment_token, ticket_id");

    if (insertError) {
      console.error("⚠️ Error recording notifications:", insertError);
    }

    // Create a map of ticket_id to notification data
    const notificationMap = new Map(
      (insertedNotifications || []).map(n => [n.ticket_id, { id: n.id, token: n.acknowledgment_token }])
    );

    const generateTicketRow = (alert: TicketAlert): string => {
      const timeText = alert.time_remaining_minutes < 0
        ? `<span style="color: #dc2626; font-weight: bold;">Venceu há ${formatTime(alert.time_remaining_minutes)}</span>`
        : `<span style="color: #f59e0b; font-weight: bold;">${formatTime(alert.time_remaining_minutes)} restantes</span>`;

      const slaTypeText = alert.sla_type === 'first_response' ? 'Primeira Resposta' : 'Resolução';
      const priorityColor = alert.priority === 'P1' ? '#dc2626' : alert.priority === 'P2' ? '#f59e0b' : '#3b82f6';
      
      const notificationData = notificationMap.get(alert.id);
      const ackUrl = notificationData 
        ? `${appUrl}/sla-acknowledge/${notificationData.id}/${notificationData.token}`
        : null;

      const escalateBadge = alert.escalate 
        ? '<span style="background: #7c3aed; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">ESCALADO</span>'
        : '';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-family: monospace; font-weight: bold;">
            ${alert.ticket_number}${escalateBadge}
          </td>
          <td style="padding: 12px;">${alert.title}</td>
          <td style="padding: 12px;">${alert.client_name}</td>
          <td style="padding: 12px;">
            <span style="background: ${priorityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
              ${alert.priority}
            </span>
          </td>
          <td style="padding: 12px;">${slaTypeText}</td>
          <td style="padding: 12px;">${timeText}</td>
          <td style="padding: 12px;">
            ${ackUrl ? `
              <a href="${ackUrl}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 8px 12px; 
                        text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ✅ Ciente
              </a>
            ` : ''}
          </td>
        </tr>
      `;
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6;">
          <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">🚨 Alerta de SLA</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Tickets requerem atenção imediata</p>
              ${escalatedAlerts.length > 0 ? `
                <p style="margin: 10px 0 0 0; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 4px; display: inline-block;">
                  ⚡ ${escalatedAlerts.length} ${escalatedAlerts.length === 1 ? 'ticket escalado' : 'tickets escalados'} para Super Admin
                </p>
              ` : ''}
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${overdueAlerts.length > 0 ? `
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #dc2626; margin-top: 0;">
                    ⚠️ SLAs Vencidos (${overdueAlerts.length})
                  </h2>
                  <p style="color: #6b7280; margin-bottom: 15px;">
                    Estes tickets já ultrapassaram o prazo do SLA e precisam de ação urgente:
                  </p>
                  <table style="width: 100%; border-collapse: collapse; background: #fef2f2; border-radius: 8px; overflow: hidden;">
                    <thead>
                      <tr style="background: #fee2e2; text-align: left;">
                        <th style="padding: 12px; font-weight: 600;">Ticket</th>
                        <th style="padding: 12px; font-weight: 600;">Título</th>
                        <th style="padding: 12px; font-weight: 600;">Cliente</th>
                        <th style="padding: 12px; font-weight: 600;">Prioridade</th>
                        <th style="padding: 12px; font-weight: 600;">Tipo SLA</th>
                        <th style="padding: 12px; font-weight: 600;">Status</th>
                        <th style="padding: 12px; font-weight: 600;">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${overdueAlerts.map(generateTicketRow).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}
              
              ${warningAlerts.length > 0 ? `
                <div>
                  <h2 style="color: #f59e0b; margin-top: 0;">
                    ⏰ SLAs em Risco (${warningAlerts.length})
                  </h2>
                  <p style="color: #6b7280; margin-bottom: 15px;">
                    Estes tickets estão próximos de vencer (>75% do tempo decorrido):
                  </p>
                  <table style="width: 100%; border-collapse: collapse; background: #fffbeb; border-radius: 8px; overflow: hidden;">
                    <thead>
                      <tr style="background: #fef3c7; text-align: left;">
                        <th style="padding: 12px; font-weight: 600;">Ticket</th>
                        <th style="padding: 12px; font-weight: 600;">Título</th>
                        <th style="padding: 12px; font-weight: 600;">Cliente</th>
                        <th style="padding: 12px; font-weight: 600;">Prioridade</th>
                        <th style="padding: 12px; font-weight: 600;">Tipo SLA</th>
                        <th style="padding: 12px; font-weight: 600;">Tempo Restante</th>
                        <th style="padding: 12px; font-weight: 600;">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${warningAlerts.map(generateTicketRow).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}
              
              <div style="margin-top: 30px; text-align: center;">
                <a href="${appUrl}/tickets" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Ver Todos os Tickets
                </a>
              </div>
              
              <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 6px; font-size: 14px; color: #6b7280;">
                <strong>💡 Como funciona:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Clique em <strong>"Ciente"</strong> para confirmar que você viu este alerta</li>
                  <li>Após confirmar, você não receberá novas notificações sobre este ticket por 12 horas</li>
                  <li>Se ninguém confirmar em 12 horas, o alerta será escalado para Super Admins</li>
                </ul>
              </div>
            </div>
            
            <div style="text-align: center; color: #9ca3af; font-size: 14px; margin-top: 20px;">
              <p>Otimizzo Service Hub - Sistema de Monitoramento de SLA</p>
              <p style="font-size: 12px;">Enviado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // ========== ENVIAR EMAIL ==========

    // Combine recipients for escalated alerts
    const allRecipients = hasEscalatedAlerts 
      ? [...new Set([...otimizzoEmails, ...superAdminEmails])]
      : otimizzoEmails;

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "Otimizzo SLA Monitor <noreply@resend.otimizzo.com>",
      to: allRecipients,
      subject: `🚨 Alerta de SLA: ${overdueAlerts.length} vencidos, ${warningAlerts.length} em risco${escalatedAlerts.length > 0 ? ' [ESCALADO]' : ''}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("❌ Error sending email:", emailError);
      throw emailError;
    }

    console.log("✅ Email sent successfully:", emailResult);
    console.log(`✅ Recorded ${notificationsToInsert.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        alerts_sent: alerts.length,
        overdue: overdueAlerts.length,
        warning: warningAlerts.length,
        escalated: escalatedAlerts.length,
        recipients: allRecipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Unexpected error in sla-monitor:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to check if we should send a notification
async function shouldSendNotification(
  adminClient: any,
  ticketId: string,
  slaType: string,
  alertType: string,
  now: Date,
  throttleHours: number
): Promise<{ shouldSend: boolean; nextLevel: number; escalate: boolean }> {
  const { data: recentNotification } = await adminClient
    .from("sla_notifications")
    .select("id, sent_at, acknowledged_at, notification_level")
    .eq("ticket_id", ticketId)
    .eq("sla_type", slaType)
    .eq("alert_type", alertType)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!recentNotification) {
    // First notification for this ticket/SLA
    return { shouldSend: true, nextLevel: 1, escalate: false };
  }

  const sentAt = new Date(recentNotification.sent_at);
  const hoursSinceSent = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

  // If acknowledged within throttle period, don't send
  if (recentNotification.acknowledged_at) {
    const ackAt = new Date(recentNotification.acknowledged_at);
    const hoursSinceAck = (now.getTime() - ackAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceAck < throttleHours) {
      console.log(`⏳ Ticket ${ticketId}: Silenced (acknowledged ${hoursSinceAck.toFixed(1)}h ago)`);
      return { shouldSend: false, nextLevel: recentNotification.notification_level, escalate: false };
    }
  }

  // If not acknowledged and past throttle period, escalate
  if (!recentNotification.acknowledged_at && hoursSinceSent >= throttleHours) {
    console.log(`⚡ Ticket ${ticketId}: Escalating to Super Admin (${hoursSinceSent.toFixed(1)}h without acknowledgment)`);
    return { 
      shouldSend: true, 
      nextLevel: recentNotification.notification_level + 1, 
      escalate: true 
    };
  }

  // If recently sent and not acknowledged, wait for throttle period
  if (hoursSinceSent < 1) { // Keep 1 hour minimum between emails
    console.log(`⏳ Ticket ${ticketId}: Waiting (last sent ${hoursSinceSent.toFixed(1)}h ago)`);
    return { shouldSend: false, nextLevel: recentNotification.notification_level, escalate: false };
  }

  return { shouldSend: false, nextLevel: recentNotification.notification_level, escalate: false };
}
