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
  commentId: string;
  commentContent: string;
  authorName: string;
  contactEmail: string;
  contactName: string;
  ticketNumber: string;
  ticketTitle: string;
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

    // Create authenticated Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the JWT token
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
      commentId,
      commentContent,
      authorName,
      contactEmail,
      contactName,
      ticketNumber,
      ticketTitle,
      ccEmails,
    }: NotificationRequest = await req.json();

    // SECURITY: Validate required fields
    if (!ticketId || !commentId || !ticketNumber) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Verify the comment exists and belongs to the ticket
    const { data: comment, error: commentError } = await supabase
      .from("ticket_comments")
      .select("id, ticket_id, author_id")
      .eq("id", commentId)
      .eq("ticket_id", ticketId)
      .single();

    if (commentError || !comment) {
      console.error("Comment not found or does not belong to ticket:", commentError?.message);
      return new Response(
        JSON.stringify({ error: "Comment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Verify user has access to the ticket (is assigned analyst, Otimizzo user, or super admin)
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, client_id, analyst_id, contact_email")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError?.message);
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is authorized (is Otimizzo user, super admin, or assigned analyst)
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", user.id)
      .single();

    const isOtimizzoUser = userRole?.tenant_id === "00000000-0000-0000-0000-000000000001";
    const isSuperAdmin = userRole?.role === "super_admin";
    const isAssignedAnalyst = ticket.analyst_id === user.id;

    if (!isOtimizzoUser && !isSuperAdmin && !isAssignedAnalyst) {
      console.error("User not authorized to send notification for this ticket");
      return new Response(
        JSON.stringify({ error: "Not authorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending comment notification to:", contactEmail, "CC:", ccEmails);

    const currentDate = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailResponse = await resend.emails.send({
      from: "Otimizzo Suporte <noreply@otimizzo.com>",
      replyTo: "suporte@otimizzo.com",
      to: [contactEmail],
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      subject: `[Ticket #${ticketNumber}] Nova atualização - ${ticketTitle}`,
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; }
            .comment-box { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
            .ticket-info { background-color: #e7f3ff; padding: 10px; border-radius: 4px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: #0066cc;">Atualização de Ticket</h2>
            </div>
            
            <div class="content">
              <p>Olá <strong>${contactName}</strong>,</p>
              
              <p>Você recebeu uma nova atualização no seu ticket:</p>
              
              <div class="ticket-info">
                <strong>Ticket:</strong> #${ticketNumber}<br>
                <strong>Título:</strong> ${ticketTitle}
              </div>
              
              <div class="comment-box">
                <p style="margin: 0 0 10px 0;"><strong>Comentário de:</strong> ${authorName}</p>
                <p style="margin: 0 0 10px 0;"><strong>Data:</strong> ${currentDate}</p>
                <hr style="border: none; border-top: 1px solid #dee2e6; margin: 10px 0;">
                <p style="white-space: pre-wrap;">${commentContent}</p>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">
                💡 <strong>Você pode responder diretamente este email!</strong><br>
                Sua resposta será automaticamente adicionada ao ticket.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 5px 0;">Atenciosamente,<br><strong>Equipe Otimizzo</strong></p>
              <p style="margin: 5px 0; font-size: 11px; color: #999;">
                Este email foi enviado em resposta ao Ticket #${ticketNumber}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-comment-notification function:", error);
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
