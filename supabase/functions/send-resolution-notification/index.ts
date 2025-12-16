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

interface ResolutionNotificationRequest {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  contactEmail: string;
  contactName: string;
  resolutionReason: string;
  analystName: string;
  createdAt: string;
  resolvedAt: string;
  ccEmails?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Invalid authentication token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const {
      ticketId,
      ticketNumber,
      ticketTitle,
      contactEmail,
      contactName,
      resolutionReason,
      analystName,
      createdAt,
      resolvedAt,
      ccEmails,
    }: ResolutionNotificationRequest = await req.json();

    // Validate required fields
    if (!ticketId || !ticketNumber || !contactEmail || !resolutionReason) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, client_id, analyst_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError?.message);
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check authorization
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", user.id)
      .single();

    const isOtimizzoUser = userRole?.tenant_id === "00000000-0000-0000-0000-000000000001";
    const isSuperAdmin = userRole?.role === "super_admin";
    const isAssignedAnalyst = ticket.analyst_id === user.id;

    if (!isOtimizzoUser && !isSuperAdmin && !isAssignedAnalyst) {
      console.error("User not authorized to send resolution notification");
      return new Response(
        JSON.stringify({ error: "Not authorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending resolution notification to:", contactEmail, "CC:", ccEmails);

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const emailResponse = await resend.emails.send({
      from: "Otimizzo Suporte <noreply@otimizzo.com>",
      replyTo: "suporte@otimizzo.com",
      to: [contactEmail],
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      subject: `[Ticket #${ticketNumber}] ✅ Resolvido - ${ticketTitle}`,
      headers: {
        'X-Ticket-Number': ticketNumber,
        'In-Reply-To': `<ticket-${ticketNumber}@otimizzo.com>`,
        'References': `<ticket-${ticketNumber}@otimizzo.com>`,
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h2 { margin: 0; color: #ffffff; font-size: 24px; }
            .header .icon { font-size: 48px; margin-bottom: 10px; }
            .status-badge { display: inline-block; background: #ffffff; color: #28a745; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 15px; }
            .content { background-color: #ffffff; padding: 25px; border: 1px solid #e9ecef; border-top: none; }
            .ticket-info { background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .ticket-info p { margin: 5px 0; font-size: 14px; }
            .ticket-info strong { color: #155724; }
            .resolution-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0; }
            .resolution-box h4 { margin: 0 0 10px 0; color: #28a745; font-size: 16px; }
            .resolution-box p { margin: 10px 0; white-space: pre-wrap; }
            .resolution-box .analyst { font-size: 12px; color: #6c757d; margin-top: 15px; padding-top: 10px; border-top: 1px solid #dee2e6; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef; border-top: none; }
            .feedback-note { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .feedback-note p { margin: 0; font-size: 14px; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">✅</div>
              <h2>Ticket Resolvido</h2>
              <span class="status-badge">RESOLVIDO</span>
            </div>
            
            <div class="content">
              <p>Olá <strong>${contactName}</strong>,</p>
              
              <p>Temos o prazer de informar que seu ticket foi <strong>resolvido</strong>!</p>
              
              <div class="ticket-info">
                <p><strong>Ticket:</strong> #${ticketNumber}</p>
                <p><strong>Título:</strong> ${ticketTitle}</p>
                <p><strong>Data de Abertura:</strong> ${formatDate(createdAt)}</p>
                <p><strong>Data de Resolução:</strong> ${formatDate(resolvedAt)}</p>
              </div>
              
              <div class="resolution-box">
                <h4>📋 Motivo da Resolução</h4>
                <p>${resolutionReason}</p>
                <p class="analyst">Resolvido por: <strong>${analystName}</strong></p>
              </div>
              
              <div class="feedback-note">
                <p>💬 Se o problema não foi totalmente resolvido ou se você tiver alguma dúvida,<br>
                <strong>basta responder este email</strong> e reabriremos seu ticket.</p>
              </div>
            </div>
            
            <div class="footer">
              <p style="margin: 5px 0;">Agradecemos por utilizar nossos serviços!</p>
              <p style="margin: 5px 0;"><strong>Equipe Otimizzo</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
                Este email foi enviado em resposta ao Ticket #${ticketNumber}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Resolution email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-resolution-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
