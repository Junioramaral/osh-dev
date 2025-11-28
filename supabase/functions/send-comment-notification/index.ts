import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  ticketId: string;
  commentContent: string;
  authorName: string;
  contactEmail: string;
  contactName: string;
  ticketNumber: string;
  ticketTitle: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      commentContent,
      authorName,
      contactEmail,
      contactName,
      ticketNumber,
      ticketTitle,
    }: NotificationRequest = await req.json();

    console.log("Sending comment notification to:", contactEmail);

    const currentDate = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailResponse = await resend.emails.send({
      from: "Otimizzo Suporte <onboarding@resend.dev>",
      to: [contactEmail],
      subject: `[Ticket #${ticketNumber}] Nova atualização - ${ticketTitle}`,
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
              
              <p style="color: #6c757d; font-size: 14px;">Caso tenha dúvidas, responda diretamente este email ou acesse o portal de suporte.</p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">Atenciosamente,<br><strong>Equipe Otimizzo</strong></p>
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
