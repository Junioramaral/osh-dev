import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RFCReportRequest {
  ticketId: string;
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBR(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getDurationMinutes(startedAt: string | null, concludedAt: string | null): number {
  if (!startedAt || !concludedAt) return 0;
  const diffMs = new Date(concludedAt).getTime() - new Date(startedAt).getTime();
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
}

function formatDuration(startedAt: string | null, concludedAt: string | null): string {
  const totalMinutes = getDurationMinutes(startedAt, concludedAt);
  if (totalMinutes === 0 && (!startedAt || !concludedAt)) return "—";
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function formatTotalDuration(totalMinutes: number): string {
  if (totalMinutes === 0) return "—";
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function statusBadge(step: any): string {
  if (step.status_concluido) {
    return `<span style="display:inline-block;background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">Concluído</span>`;
  }
  if (step.started_at) {
    return `<span style="display:inline-block;background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">Em andamento</span>`;
  }
  return `<span style="display:inline-block;background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">Pendente</span>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { ticketId }: RFCReportRequest = await req.json();

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: "Missing ticketId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify authorization
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", user.id)
      .single();

    const isOtimizzoUser = userRole?.tenant_id === "00000000-0000-0000-0000-000000000001";
    const isSuperAdmin = userRole?.role === "super_admin";

    if (!isOtimizzoUser && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Not authorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select(`id, ticket_number, title, contact_email, contact_name, analyst_id, client_id, clients(name)`)
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ticket.contact_email) {
      return new Response(
        JSON.stringify({ error: "Ticket has no contact_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch analyst profile
    let analystName = "Analista";
    if (ticket.analyst_id) {
      const { data: analyst } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ticket.analyst_id)
        .maybeSingle();
      if (analyst?.full_name) analystName = analyst.full_name;
    }

    // Fetch RFC steps
    const { data: stepsData } = await supabase
      .from("rfc_steps")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("ordem", { ascending: true });

    const steps = stepsData ?? [];

    // Resolve user names for started_by/concluded_by
    const userIds = Array.from(new Set([
      ...steps.map((s: any) => s.started_by).filter(Boolean),
      ...steps.map((s: any) => s.concluded_by).filter(Boolean),
    ]));
    const profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
    }

    const completedCount = steps.filter((s: any) => s.status_concluido).length;
    const totalSteps = steps.length;
    const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
    const totalMinutes = steps.reduce(
      (acc: number, s: any) => acc + getDurationMinutes(s.started_at, s.concluded_at),
      0,
    );

    const ticketNumber = ticket.ticket_number;
    const ticketTitle = ticket.title || "";
    const clientName = (ticket as any).clients?.name || "Cliente";
    const contactEmail = ticket.contact_email;
    const contactName = ticket.contact_name || "Cliente";

    const stepsRowsHtml = steps.map((s: any, idx: number) => {
      const responsibleId = s.concluded_by || s.started_by;
      const responsible = responsibleId ? profileMap[responsibleId] || "—" : "—";
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;color:#6b7280;">${String((s.ordem ?? idx) + 1).padStart(2, "0")}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${escapeHtml(s.descricao)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">${statusBadge(s)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${formatBR(s.started_at)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${formatBR(s.concluded_at)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:#111827;">${formatDuration(s.started_at, s.concluded_at)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${escapeHtml(responsible)}</td>
        </tr>
      `;
    }).join("");

    console.log("Sending RFC report to:", contactEmail);

    const emailResponse = await resend.emails.send({
      from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
      replyTo: `ticket-${ticketNumber}@resend.otimizzo.com`,
      to: [contactEmail],
      subject: `[RFC #${ticketNumber}] 📄 Relatório de Execução - ${ticketTitle}`,
      headers: {
        "X-Ticket-Number": ticketNumber,
        "In-Reply-To": `<ticket-${ticketNumber}@resend.otimizzo.com>`,
        "References": `<ticket-${ticketNumber}@resend.otimizzo.com>`,
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 760px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a7f37 0%, #2da44e 100%); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h2 { margin: 0; color: #ffffff; font-size: 24px; }
            .header .icon { font-size: 48px; margin-bottom: 10px; }
            .status-badge { display: inline-block; background: #ffffff; color: #1a7f37; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 15px; }
            .content { background-color: #ffffff; padding: 25px; border: 1px solid #e9ecef; border-top: none; }
            .ticket-info { background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a7f37; }
            .ticket-info p { margin: 5px 0; font-size: 14px; }
            .ticket-info strong { color: #155724; }
            .summary-grid { display: table; width: 100%; margin: 20px 0; border-collapse: collapse; }
            .summary-cell { display: table-cell; padding: 12px; background: #f8f9fa; border: 1px solid #e9ecef; text-align: center; width: 33%; }
            .summary-cell .label { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
            .summary-cell .value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 4px; }
            table.steps { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            table.steps thead th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 12px; color: #374151; border-bottom: 2px solid #e5e7eb; }
            table.steps tfoot td { background: #f9fafb; padding: 10px 8px; font-weight: 700; border-top: 2px solid #e5e7eb; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">📄</div>
              <h2>Relatório de RFC</h2>
              <span class="status-badge">EXECUÇÃO CONCLUÍDA</span>
            </div>
            
            <div class="content">
              <p>Olá <strong>${escapeHtml(contactName)}</strong>,</p>

              <p>Segue abaixo o relatório completo de execução da RFC <strong>#${escapeHtml(ticketNumber)}</strong>.</p>

              <div class="ticket-info">
                <p><strong>RFC:</strong> #${escapeHtml(ticketNumber)}</p>
                <p><strong>Título:</strong> ${escapeHtml(ticketTitle)}</p>
                <p><strong>Cliente:</strong> ${escapeHtml(clientName)}</p>
                <p><strong>Analista Responsável:</strong> ${escapeHtml(analystName)}</p>
              </div>

              <div class="summary-grid">
                <div class="summary-cell">
                  <div class="label">Progresso</div>
                  <div class="value">${completedCount}/${totalSteps} (${progressPercent}%)</div>
                </div>
                <div class="summary-cell">
                  <div class="label">Passos concluídos</div>
                  <div class="value">${completedCount}</div>
                </div>
                <div class="summary-cell">
                  <div class="label">Tempo total</div>
                  <div class="value">${formatTotalDuration(totalMinutes)}</div>
                </div>
              </div>

              <h3 style="margin: 24px 0 8px 0; color: #111827; font-size: 16px;">Passos da Execução</h3>
              ${steps.length === 0
                ? `<p style="color:#6b7280;font-size:13px;">Nenhum passo registrado para esta RFC.</p>`
                : `<table class="steps">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Descrição</th>
                        <th>Status</th>
                        <th>Início</th>
                        <th>Fim</th>
                        <th>Duração</th>
                        <th>Responsável</th>
                      </tr>
                    </thead>
                    <tbody>${stepsRowsHtml}</tbody>
                    <tfoot>
                      <tr>
                        <td colspan="5" style="text-align:right;">Tempo Total</td>
                        <td>${formatTotalDuration(totalMinutes)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>`}

              <p style="font-size: 14px; color: #666; margin-top: 24px;">
                Em caso de dúvidas, basta responder este email.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 5px 0;"><strong>Equipe Otimizzo</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
                Este email foi enviado em referência à RFC #${ticketNumber}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("RFC report email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-rfc-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
