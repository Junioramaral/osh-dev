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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function formatUserTextHtml(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, "<br>");
}

interface NotificationRequest {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  commentContent: string;
  clientName: string;
  clientEmail: string;
  ccEmails?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("send-analyst-notification: Starting...");

    const {
      ticketId,
      ticketNumber,
      ticketTitle,
      commentContent,
      clientName,
      clientEmail,
      ccEmails,
    }: NotificationRequest = await req.json();

    // Validate required fields
    if (!ticketId || !ticketNumber) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch ticket and analyst info
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, analyst_id, ticket_number, title")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError?.message);
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ticket.analyst_id) {
      console.log("No analyst assigned to ticket, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No analyst assigned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch analyst email from auth.users via profile
    const { data: analystProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", ticket.analyst_id)
      .single();

    if (profileError || !analystProfile) {
      console.error("Analyst profile not found:", profileError?.message);
      return new Response(
        JSON.stringify({ error: "Analyst profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get analyst email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(ticket.analyst_id);

    if (authError || !authUser?.user?.email) {
      console.error("Analyst email not found:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Analyst email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analystEmail = authUser.user.email;
    const analystName = analystProfile.full_name;

    console.log("Sending analyst notification to:", analystEmail, "CC:", ccEmails);

    const currentDate = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailResponse = await resend.emails.send({
      from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
      replyTo: "suporte@resend.otimizzo.com",
      to: [analystEmail],
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      subject: `[Ticket #${ticketNumber}] Nova resposta do cliente - ${ticketTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;line-height:1.6;color:#333;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
            <tr><td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e9ecef;">
                <tr><td style="background-color:#10b981;padding:20px;">
                  <h2 style="margin:0;color:#ffffff;font-size:22px;">📩 Nova Resposta do Cliente</h2>
                </td></tr>
                <tr><td style="padding:20px;">
                  <p style="margin:0 0 12px;">Olá <strong>${analystName}</strong>,</p>
                  <p style="margin:0 0 12px;">O cliente respondeu ao ticket que você está atendendo:</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf5;margin:15px 0;">
                    <tr><td style="padding:10px;font-size:14px;">
                      <strong>Ticket:</strong> #${ticketNumber}<br>
                      <strong>Título:</strong> ${ticketTitle}
                    </td></tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-left:4px solid #10b981;margin:20px 0;">
                    <tr><td style="padding:15px;">
                      <p style="margin:0 0 10px;"><strong>Cliente:</strong> ${clientName}</p>
                      <p style="margin:0 0 10px;"><strong>Email:</strong> ${clientEmail}</p>
                      <p style="margin:0 0 10px;"><strong>Data:</strong> ${currentDate}</p>
                      <hr style="border:none;border-top:1px solid #bbf7d0;margin:10px 0;">
                      <p style="margin:0;">${formatUserTextHtml(commentContent)}</p>
                    </td></tr>
                  </table>
                  <p style="color:#6c757d;font-size:14px;margin:15px 0 0;">Acesse o sistema para responder ao cliente.</p>
                </td></tr>
                <tr><td style="background-color:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#6c757d;">
                  <p style="margin:5px 0;">Sistema de Tickets<br><strong>Otimizzo</strong></p>
                  <p style="margin:5px 0;font-size:11px;color:#999;">Ticket #${ticketNumber}</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
      text: `Nova Resposta do Cliente\n\nOlá ${analystName},\n\nO cliente respondeu ao ticket que você está atendendo:\nTicket: #${ticketNumber}\nTítulo: ${ticketTitle}\n\nCliente: ${clientName}\nEmail: ${clientEmail}\nData: ${currentDate}\n\n${commentContent}\n\nAcesse o sistema para responder ao cliente.`,
    });

    console.log("Analyst notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-analyst-notification function:", error);
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
