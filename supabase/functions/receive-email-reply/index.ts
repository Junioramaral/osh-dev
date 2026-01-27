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
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    email_id: string;
    created_at: string;
  };
}

// Helper para normalizar emails para comparações
function normalizeEmail(email: string | undefined | null): string {
  return email?.trim().toLowerCase() || "";
}

// Função para parsear endereço de email no formato "Name <email@example.com>"
function parseEmailAddress(fromString: string): { email: string; name: string } {
  if (!fromString) {
    return { email: "", name: "" };
  }
  
  // Normalizar: trim antes do match
  const normalized = fromString.trim();
  
  // Formato: "Name <email@example.com>" ou apenas "email@example.com"
  const match = normalized.match(/^(?:(.+?)\s*)?<(.+)>$/);
  if (match) {
    return {
      name: match[1]?.trim() || "",
      email: match[2].trim().toLowerCase()
    };
  }
  
  // Fallback: assume que é só o email
  return {
    name: "",
    email: normalized.toLowerCase()
  };
}

// Função para validar webhook signature do Resend (Svix)
async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  timestamp: string,
  svixId: string,
  secret: string
): Promise<boolean> {
  try {
    const secretWithoutPrefix = secret.startsWith("whsec_") 
      ? secret.slice(6) 
      : secret;
    
    const secretBytes = Uint8Array.from(
      atob(secretWithoutPrefix),
      (c) => c.charCodeAt(0)
    );
    
    const signedContent = `${svixId}.${timestamp}.${payload}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedContent)
    );
    
    const computedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBytes))
    );
    
    const signatures = signatureHeader.split(" ");
    
    for (const sig of signatures) {
      const [version, signature] = sig.split(",");
      if (version === "v1" && signature === computedSignature) {
        return true;
      }
    }
    
    console.error("Signature mismatch. Computed:", computedSignature);
    return false;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

// Extrair número do ticket do campo "to" (ticket-00000006@otimizzo.com)
function extractTicketNumberFromTo(toAddresses: string[]): string | null {
  if (!toAddresses || !Array.isArray(toAddresses)) {
    return null;
  }
  
  for (const addr of toAddresses) {
    const match = addr.match(/ticket-(\d+)@/i);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Extrair número do ticket do assunto [Ticket #00000006]
function extractTicketNumberFromSubject(subject: string): string | null {
  const match = subject.match(/\[Ticket #(\d+)\]/);
  return match ? match[1] : null;
}

// Converter HTML básico para texto (strip tags)
function htmlToText(html: string): string {
  if (!html) return "";
  
  return html
    // Remover scripts e styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Substituir <br> e <p> por quebras de linha
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    // Remover todas as outras tags
    .replace(/<[^>]+>/g, "")
    // Decodificar entidades HTML comuns
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // Limpar espaços extras
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Lista de emails do sistema para ignorar
const SYSTEM_EMAILS = [
  "noreply@otimizzo.com",
  "suporte@otimizzo.com",
  "mailer-daemon@",
  "postmaster@",
  "no-reply@",
  "noreply@"
];

// Verificar se é email do sistema ou bounce
function isSystemOrBounceEmail(email: string, subject: string): boolean {
  const normalizedEmail = normalizeEmail(email);
  
  // Verificar emails do sistema
  for (const sysEmail of SYSTEM_EMAILS) {
    if (normalizedEmail === sysEmail || normalizedEmail.startsWith(sysEmail)) {
      return true;
    }
  }
  
  // Verificar assuntos típicos de bounce
  const bounceSubjects = [
    "undelivered mail",
    "delivery status notification",
    "mail delivery failed",
    "returned mail",
    "failure notice"
  ];
  
  const normalizedSubject = subject?.toLowerCase() || "";
  for (const bounceSubj of bounceSubjects) {
    if (normalizedSubject.includes(bounceSubj)) {
      return true;
    }
  }
  
  return false;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received email webhook from Resend");

    if (!RESEND_WEBHOOK_SECRET) {
      console.error("RESEND_WEBHOOK_SECRET not configured - rejecting request");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixSignature || !svixTimestamp) {
      console.error("Missing webhook signature headers");
      return new Response(
        JSON.stringify({ error: "Missing signature headers" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.text();
    
    const isValid = await verifyWebhookSignature(
      payload,
      svixSignature,
      svixTimestamp,
      svixId!,
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

    if (!webhookData.data) {
      console.log("No data in webhook payload");
      return new Response(
        JSON.stringify({ message: "No data in payload" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { from, to, subject, text, html, email_id } = webhookData.data;
    
    if (!from || !subject) {
      console.log("Missing required fields - from:", from, "subject:", subject);
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parsear o endereço de email
    const parsedFrom = parseEmailAddress(from);
    
    // VERIFICAÇÃO ROBUSTA: Ignorar emails do sistema ou bounces
    if (isSystemOrBounceEmail(parsedFrom.email, subject)) {
      console.log("Ignoring system/bounce email from:", parsedFrom.email, "Subject:", subject);
      return new Response(
        JSON.stringify({ message: "System/bounce email ignored" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Processing email from:", parsedFrom.email, "Name:", parsedFrom.name, "Subject:", subject);

    // Extrair número do ticket - primeiro do "to", depois do subject
    let ticketNumber = extractTicketNumberFromTo(to);
    
    if (!ticketNumber) {
      ticketNumber = extractTicketNumberFromSubject(subject);
    }
    
    if (!ticketNumber) {
      console.log("No ticket number found in 'to' addresses or subject");
      return new Response(
        JSON.stringify({ message: "No ticket number found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Ticket number extracted:", ticketNumber);

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // IDEMPOTÊNCIA: Verificar se este email já foi processado
    if (email_id) {
      const { data: existingComment } = await supabase
        .from("ticket_comments")
        .select("id")
        .eq("email_message_id", email_id)
        .maybeSingle();
      
      if (existingComment) {
        console.log("Email already processed, skipping:", email_id);
        return new Response(
          JSON.stringify({ message: "Email already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Buscar ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, contact_email, contact_name, status, analyst_id, ticket_number, title, client_id")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();

    if (ticketError || !ticket) {
      console.log("Ticket not found:", ticketNumber);
      // Retorna 200 para não gerar retry
      return new Response(
        JSON.stringify({ message: "Ticket not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar que o remetente é o contato do ticket
    const senderEmail = normalizeEmail(parsedFrom.email);
    const contactEmail = normalizeEmail(ticket.contact_email);
    
    if (!senderEmail || senderEmail !== contactEmail) {
      console.log(
        "Sender email does not match ticket contact:",
        senderEmail,
        "vs",
        contactEmail,
        "- ignoring (returning 200)"
      );
      // Retorna 200 para não gerar retry infinito
      return new Response(
        JSON.stringify({ message: "Sender not authorized for this ticket" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar conteúdo completo do email via API do Resend
    let emailContent = text || "";
    
    if (RESEND_API_KEY && email_id) {
      try {
        const emailDetailResponse = await fetch(
          `https://api.resend.com/emails/receiving/${email_id}`,
          {
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
          }
        );

        if (emailDetailResponse.ok) {
          const emailDetail = await emailDetailResponse.json();
          console.log("Email content fetched - text length:", emailDetail.text?.length || 0, "html length:", emailDetail.html?.length || 0);
          
          // Priorizar text, mas converter HTML se text estiver vazio
          if (emailDetail.text && emailDetail.text.trim()) {
            emailContent = emailDetail.text;
          } else if (emailDetail.html && emailDetail.html.trim()) {
            emailContent = htmlToText(emailDetail.html);
            console.log("Converted HTML to text, length:", emailContent.length);
          } else {
            emailContent = text || "";
          }
        }
      } catch (error) {
        console.error("Error fetching email details:", error);
      }
    }

    // Se ainda não tiver conteúdo, tentar do webhook
    if (!emailContent && html) {
      emailContent = htmlToText(html);
    }

    // Limpar conteúdo do email (remover quoted text)
    let cleanContent = emailContent.split(/On .* wrote:|Em .* escreveu:/)[0].trim();
    
    // Se o conteúdo estiver vazio, usar um placeholder
    if (!cleanContent) {
      console.log("Warning: Email content is empty after processing");
      cleanContent = "[Conteúdo do email não pôde ser extraído]";
    }
    
    console.log("Final content length:", cleanContent.length);

    // Inserir comentário (author_id = null para replies por email)
    const { error: commentError } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: ticket.id,
        author_id: null,
        content: cleanContent,
        is_internal: false,
        source: "email",
        sender_email: parsedFrom.email,
        sender_name: parsedFrom.name || ticket.contact_name,
        email_message_id: email_id,
      });

    if (commentError) {
      console.error("Error inserting comment:", commentError);
      throw commentError;
    }

    console.log("Comment inserted successfully");

    // Registrar no histórico
    const { error: historyError } = await supabase
      .from("ticket_history")
      .insert({
        ticket_id: ticket.id,
        user_id: null,
        action_type: "comment_added_email",
        new_value: "Cliente respondeu por email",
        metadata: {
          email: parsedFrom.email,
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
      console.log("Ticket status updated to em_atendimento");
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
              clientName: parsedFrom.name || ticket.contact_name,
              clientEmail: parsedFrom.email,
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
    // Retorna 200 mesmo em erro para evitar retries infinitos do Resend
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);