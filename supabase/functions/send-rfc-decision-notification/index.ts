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

interface RFCDecisionRequest {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  contactEmail: string;
  contactName: string;
  decision: "aprovada" | "rejeitada";
  comentario: string;
  gestorName: string;
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

    // Verify user is Otimizzo or Super Admin
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

    const {
      ticketId,
      ticketNumber,
      ticketTitle,
      contactEmail,
      contactName,
      decision,
      comentario,
      gestorName,
    }: RFCDecisionRequest = await req.json();

    if (!ticketId || !ticketNumber || !contactEmail || !comentario || !decision) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isApproved = decision === "aprovada";
    const headerColor = isApproved ? "#28a745" : "#dc3545";
    const badgeColor = isApproved ? "#28a745" : "#dc3545";
    const badgeText = isApproved ? "APROVADA" : "REJEITADA";
    const icon = isApproved ? "✅" : "❌";
    const statusLabel = isApproved ? "aprovada" : "rejeitada";
    const infoBg = isApproved ? "#d4edda" : "#f8d7da";
    const infoBorder = isApproved ? "#28a745" : "#dc3545";
    const infoTextColor = isApproved ? "#155724" : "#721c24";
    const commentBorder = isApproved ? "#28a745" : "#dc3545";
    const commentColor = isApproved ? "#28a745" : "#dc3545";

    const rejectedNote = !isApproved
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff3cd;margin:20px 0;">
          <tr><td style="padding:15px;text-align:center;font-size:14px;color:#856404;">
            ⚠️ A RFC retornou para <strong>rascunho</strong>. Faça os ajustes necessários e reenvie para aprovação.
          </td></tr>
        </table>`
      : "";

    const subject = `[RFC #${ticketNumber}] ${isApproved ? "Aprovada" : "Rejeitada"} - ${ticketTitle}`;

    console.log(`Sending RFC ${decision} notification to: ${contactEmail}`);

    const emailResponse = await resend.emails.send({
      from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
      to: [contactEmail],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;line-height:1.6;color:#333;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
            <tr><td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e9ecef;">
                <tr><td style="background-color:${headerColor};padding:30px 20px;text-align:center;">
                  <div style="font-size:48px;line-height:1;margin-bottom:10px;">${icon}</div>
                  <h2 style="margin:0;color:#ffffff;font-size:24px;">RFC ${isApproved ? "Aprovada" : "Rejeitada"}</h2>
                  <div style="margin-top:15px;">
                    <span style="display:inline-block;background:#ffffff;color:${badgeColor};padding:8px 20px;font-weight:bold;font-size:14px;">${badgeText}</span>
                  </div>
                </td></tr>
                <tr><td style="padding:25px;">
                  <p style="margin:0 0 12px;">Olá <strong>${contactName}</strong>,</p>
                  <p style="margin:0 0 12px;">Informamos que sua RFC foi <strong>${statusLabel}</strong>.</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${infoBg};border-left:4px solid ${infoBorder};margin:20px 0;">
                    <tr><td style="padding:15px;font-size:14px;color:${infoTextColor};">
                      <p style="margin:5px 0;"><strong>RFC:</strong> #${ticketNumber}</p>
                      <p style="margin:5px 0;"><strong>Título:</strong> ${ticketTitle}</p>
                    </td></tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa;border-left:4px solid ${commentBorder};margin:20px 0;">
                    <tr><td style="padding:20px;">
                      <h4 style="margin:0 0 10px;color:${commentColor};font-size:16px;">💬 Comentário do Gestor</h4>
                      <p style="margin:10px 0;white-space:pre-wrap;">${comentario}</p>
                      <p style="font-size:12px;color:#6c757d;margin:15px 0 0;padding-top:10px;border-top:1px solid #dee2e6;">Decisão por: <strong>${gestorName}</strong></p>
                    </td></tr>
                  </table>
                  ${rejectedNote}
                </td></tr>
                <tr><td style="background-color:#f8f9fa;padding:20px;text-align:center;font-size:12px;color:#6c757d;">
                  <p style="margin:5px 0;"><strong>Equipe Otimizzo</strong></p>
                  <p style="margin:10px 0 0;font-size:11px;color:#999;">Este email foi enviado em referência à RFC #${ticketNumber}</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("RFC decision email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-rfc-decision-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
