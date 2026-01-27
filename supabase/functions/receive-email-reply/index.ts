import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface EmailReceivedPayload {
  type: "email.received";
  data: {
    from: {
      email: string;
      name?: string;
    };
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    email_id: string;
    created_at: string;
  };
}

// Função para validar webhook signature do Resend
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  try {
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

// Extrair número do ticket do assunto
function extractTicketNumber(subject: string): string | null {
  const match = subject.match(/\[Ticket #(\d+)\]/);
  return match ? match[1] : null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received email webhook from Resend");

    // SECURITY: Require webhook secret - fail if not configured
    if (!RESEND_WEBHOOK_SECRET) {
      console.error("RESEND_WEBHOOK_SECRET not configured - rejecting request");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obter headers para validação
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    // SECURITY: Require signature headers
    if (!svixSignature || !svixTimestamp) {
      console.error("Missing webhook signature headers");
      return new Response(
        JSON.stringify({ error: "Missing signature headers" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.text();
    
    // Validar signature do webhook - MANDATORY
    const isValid = await verifyWebhookSignature(
      payload,
      svixSignature,
      svixTimestamp,
      RESEND_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Webhook signature verified successfully");

    const webhookData: EmailReceivedPayload = JSON.parse(payload);
    
    if (webhookData.type !== "email.received") {
      console.log("Ignoring non-email.received webhook");
      return new Response(
        JSON.stringify({ message: "Event type not handled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { from, subject, text, html, email_id } = webhookData.data;
    
    console.log("Processing email from:", from.email, "Subject:", subject);

    // Extrair número do ticket
    const ticketNumber = extractTicketNumber(subject);
    
    if (!ticketNumber) {
      console.log("No ticket number found in subject");
      return new Response(
        JSON.stringify({ message: "No ticket number in subject" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, contact_email, contact_name, status, analyst_id, ticket_number, title")
      .eq("ticket_number", ticketNumber)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketNumber);
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar que o remetente é o contato do ticket
    if (from.email.toLowerCase() !== ticket.contact_email.toLowerCase()) {
      console.error(
        "Sender email does not match ticket contact:",
        from.email,
        "vs",
        ticket.contact_email
      );
      return new Response(
        JSON.stringify({ error: "Unauthorized sender" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar conteúdo completo do email via API do Resend
    let emailContent = text || "";
    
    if (RESEND_API_KEY && email_id) {
      try {
        const emailDetailResponse = await fetch(
          `https://api.resend.com/emails/${email_id}`,
          {
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
          }
        );

        if (emailDetailResponse.ok) {
          const emailDetail = await emailDetailResponse.json();
          emailContent = emailDetail.text || emailDetail.html || text || "";
        }
      } catch (error) {
        console.error("Error fetching email details:", error);
      }
    }

    // Limpar conteúdo do email (remover quoted text)
    const cleanContent = emailContent.split(/On .* wrote:|Em .* escreveu:/)[0].trim();

    // Tentar encontrar usuário existente
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("client_id", ticket.id)
      .limit(1)
      .single();

    // Inserir comentário
    const { error: commentError } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: ticket.id,
        author_id: profile?.id || null,
        content: cleanContent,
        is_internal: false,
        source: "email",
        sender_email: from.email,
        author_name: from.name || ticket.contact_name,
        email_message_id: email_id,
      });

    if (commentError) {
      console.error("Error inserting comment:", commentError);
      throw commentError;
    }

    // Registrar no histórico
    const { error: historyError } = await supabase
      .from("ticket_history")
      .insert({
        ticket_id: ticket.id,
        user_id: profile?.id || null,
        action_type: "comment_added_email",
        new_value: "Cliente respondeu por email",
        metadata: {
          email: from.email,
          email_id: email_id,
        },
      });

    if (historyError) {
      console.error("Error inserting history:", historyError);
    }

    // Se o ticket estava aguardando cliente, mudar para em_atendimento
    if (ticket.status === "aguardando_cliente") {
      await supabase
        .from("tickets")
        .update({ status: "em_atendimento" })
        .eq("id", ticket.id);
    }

    // Notificar analista responsável
    if (ticket.analyst_id) {
      try {
        console.log("Notifying analyst about client email reply...");
        const notifyResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/send-analyst-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              ticketId: ticket.id,
              ticketNumber: ticket.ticket_number,
              ticketTitle: ticket.title,
              commentContent: cleanContent,
              clientName: from.name || ticket.contact_name,
              clientEmail: from.email,
            }),
          }
        );
        
        if (!notifyResponse.ok) {
          console.error("Failed to notify analyst:", await notifyResponse.text());
        } else {
          console.log("Analyst notified successfully");
        }
      } catch (notifyError) {
        console.error("Error notifying analyst:", notifyError);
        // Don't fail the request - the comment was saved
      }
    }

    console.log("Email reply processed successfully for ticket:", ticketNumber);

    return new Response(
      JSON.stringify({ success: true, ticket_id: ticket.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in receive-email-reply function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
