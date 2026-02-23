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
    const headerColor = isApproved
      ? "linear-gradient(135deg, #28a745 0%, #20c997 100%)"
      : "linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)";
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
      ? `<div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            ⚠️ A RFC retornou para <strong>rascunho</strong>. Faça os ajustes necessários e reenvie para aprovação.
          </p>
        </div>`
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
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${headerColor}; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h2 { margin: 0; color: #ffffff; font-size: 24px; }
            .header .icon { font-size: 48px; margin-bottom: 10px; }
            .status-badge { display: inline-block; background: #ffffff; color: ${badgeColor}; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 15px; }
            .content { background-color: #ffffff; padding: 25px; border: 1px solid #e9ecef; border-top: none; }
            .ticket-info { background-color: ${infoBg}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${infoBorder}; }
            .ticket-info p { margin: 5px 0; font-size: 14px; }
            .ticket-info strong { color: ${infoTextColor}; }
            .comment-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${commentBorder}; margin: 20px 0; }
            .comment-box h4 { margin: 0 0 10px 0; color: ${commentColor}; font-size: 16px; }
            .comment-box p { margin: 10px 0; white-space: pre-wrap; }
            .comment-box .gestor { font-size: 12px; color: #6c757d; margin-top: 15px; padding-top: 10px; border-top: 1px solid #dee2e6; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">${icon}</div>
              <h2>RFC ${isApproved ? "Aprovada" : "Rejeitada"}</h2>
              <span class="status-badge">${badgeText}</span>
            </div>
            
            <div class="content">
              <p>Olá <strong>${contactName}</strong>,</p>
              
              <p>Informamos que sua RFC foi <strong>${statusLabel}</strong>.</p>
              
              <div class="ticket-info">
                <p><strong>RFC:</strong> #${ticketNumber}</p>
                <p><strong>Título:</strong> ${ticketTitle}</p>
              </div>
              
              <div class="comment-box">
                <h4>💬 Comentário do Gestor</h4>
                <p>${comentario}</p>
                <p class="gestor">Decisão por: <strong>${gestorName}</strong></p>
              </div>
              
              ${rejectedNote}
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
