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
  ticketNumber: string;
  ticketTitle: string;
  contactEmail: string;
  contactName: string;
  clientName: string;
  reportUrl: string;
  analystName: string;
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

    const {
      ticketId,
      ticketNumber,
      ticketTitle,
      contactEmail,
      contactName,
      clientName,
      reportUrl,
      analystName,
    }: RFCReportRequest = await req.json();

    if (!ticketId || !ticketNumber || !contactEmail || !reportUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a7f37 0%, #2da44e 100%); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h2 { margin: 0; color: #ffffff; font-size: 24px; }
            .header .icon { font-size: 48px; margin-bottom: 10px; }
            .status-badge { display: inline-block; background: #ffffff; color: #1a7f37; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 15px; }
            .content { background-color: #ffffff; padding: 25px; border: 1px solid #e9ecef; border-top: none; }
            .ticket-info { background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a7f37; }
            .ticket-info p { margin: 5px 0; font-size: 14px; }
            .ticket-info strong { color: #155724; }
            .download-section { text-align: center; margin: 30px 0; padding: 25px; background: #f8f9fa; border-radius: 12px; }
            .download-btn { display: inline-block; background: linear-gradient(135deg, #1a7f37 0%, #2da44e 100%); color: white; padding: 14px 32px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(26, 127, 55, 0.3); }
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
              <p>Olá <strong>${contactName}</strong>,</p>
              
              <p>O relatório de execução da RFC foi gerado e está disponível para download.</p>
              
              <div class="ticket-info">
                <p><strong>RFC:</strong> #${ticketNumber}</p>
                <p><strong>Título:</strong> ${ticketTitle}</p>
                <p><strong>Cliente:</strong> ${clientName}</p>
                <p><strong>Analista Responsável:</strong> ${analystName}</p>
              </div>
              
              <div class="download-section">
                <h3 style="margin: 0 0 10px 0; color: #333;">📥 Download do Relatório</h3>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                  Clique no botão abaixo para baixar o relatório completo em PDF
                </p>
                <a href="${reportUrl}" class="download-btn">
                  Baixar Relatório PDF
                </a>
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                  O link expira em 30 dias
                </p>
              </div>
              
              <p style="font-size: 14px; color: #666;">
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
