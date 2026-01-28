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
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; padding: 20px; border-radius: 8px 8px 0 0; }
            .header h2 { margin: 0; color: #ffffff; }
            .content { background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; }
            .comment-box { background-color: #f0fdf4; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
            .ticket-info { background-color: #ecfdf5; padding: 10px; border-radius: 4px; margin: 15px 0; }
            .action-btn { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📩 Nova Resposta do Cliente</h2>
            </div>
            
            <div class="content">
              <p>Olá <strong>${analystName}</strong>,</p>
              
              <p>O cliente respondeu ao ticket que você está atendendo:</p>
              
              <div class="ticket-info">
                <strong>Ticket:</strong> #${ticketNumber}<br>
                <strong>Título:</strong> ${ticketTitle}
              </div>
              
              <div class="comment-box">
                <p style="margin: 0 0 10px 0;"><strong>Cliente:</strong> ${clientName}</p>
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${clientEmail}</p>
                <p style="margin: 0 0 10px 0;"><strong>Data:</strong> ${currentDate}</p>
                <hr style="border: none; border-top: 1px solid #bbf7d0; margin: 10px 0;">
                <p style="white-space: pre-wrap;">${commentContent}</p>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">
                Acesse o sistema para responder ao cliente.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 5px 0;">Sistema de Tickets<br><strong>Otimizzo</strong></p>
              <p style="margin: 5px 0; font-size: 11px; color: #999;">
                Ticket #${ticketNumber}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
