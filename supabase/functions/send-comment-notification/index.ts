import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Escape HTML and convert newlines to <br> so all email clients (including Outlook desktop, which ignores white-space:pre-wrap) preserve line breaks from user-entered text.
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

// Input validation schema
const CommentNotificationSchema = z.object({
  ticketId: z.string().uuid(),
  commentId: z.string().uuid(),
  commentContent: z.string().min(1).max(10000),
  authorName: z.string().min(1).max(255),
  contactEmail: z.string().email().max(255),
  contactName: z.string().min(1).max(255),
  ticketNumber: z.string().regex(/^[0-9]+$/, "Must be numeric"),
  ticketTitle: z.string().min(1).max(500),
  ccEmails: z.array(z.string().email()).max(10).optional(),
});

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

    // Validate input using Zod schema
    const rawData = await req.json();
    const validationResult = CommentNotificationSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    } = validationResult.data;

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
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailResponse = await resend.emails.send({
      from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
      replyTo: `ticket-${ticketNumber}@resend.otimizzo.com`,
      to: [contactEmail],
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      subject: `[Ticket #${ticketNumber}] Nova atualização - ${ticketTitle}`,
      headers: {
        'X-Ticket-Number': ticketNumber,
        'In-Reply-To': `<ticket-${ticketNumber}@resend.otimizzo.com>`,
        'References': `<ticket-${ticketNumber}@resend.otimizzo.com>`,
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;line-height:1.6;color:#333;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
            <tr><td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e9ecef;">
                <tr><td style="background-color:#f8f9fa;padding:20px;">
                  <h2 style="margin:0;color:#0066cc;font-size:22px;">Atualização de Ticket</h2>
                </td></tr>
                <tr><td style="padding:20px;">
                  <p style="margin:0 0 12px;">Olá <strong>${contactName}</strong>,</p>
                  <p style="margin:0 0 12px;">Você recebeu uma nova atualização no seu ticket:</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e7f3ff;margin:15px 0;">
                    <tr><td style="padding:10px;font-size:14px;">
                      <strong>Ticket:</strong> #${ticketNumber}<br>
                      <strong>Título:</strong> ${ticketTitle}
                    </td></tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa;border-left:4px solid #0066cc;margin:20px 0;">
                    <tr><td style="padding:15px;">
                      <p style="margin:0 0 10px;"><strong>Comentário de:</strong> ${authorName}</p>
                      <p style="margin:0 0 10px;"><strong>Data:</strong> ${currentDate}</p>
                      <hr style="border:none;border-top:1px solid #dee2e6;margin:10px 0;">
                      <p style="margin:0;">${formatUserTextHtml(commentContent)}</p>
                    </td></tr>
                  </table>
                  <p style="color:#6c757d;font-size:14px;margin:15px 0 0;">
                    💡 <strong>Você pode responder diretamente este email!</strong><br>
                    Sua resposta será automaticamente adicionada ao ticket.
                  </p>
                </td></tr>
                <tr><td style="background-color:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#6c757d;">
                  <p style="margin:5px 0;">Atenciosamente,<br><strong>Equipe Otimizzo</strong></p>
                  <p style="margin:5px 0;font-size:11px;color:#999;">Este email foi enviado em resposta ao Ticket #${ticketNumber}</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
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
