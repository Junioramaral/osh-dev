import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://www.osh.tec.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(JSON.stringify({ error: "ticketId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: ticket, error: tErr } = await supabase
      .from("tickets")
      .select("id, ticket_number, title, analyst_id, priority, record_type, clients(name)")
      .eq("id", ticketId)
      .single();

    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ticket.analyst_id) {
      return new Response(JSON.stringify({ success: true, message: "No analyst" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", ticket.analyst_id)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(ticket.analyst_id);
    const analystEmail = authUser?.user?.email;
    if (!analystEmail) {
      return new Response(JSON.stringify({ error: "Analyst email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isRFC = ticket.record_type === "rfc";
    const label = isRFC ? "RFC" : "Ticket";
    const link = `${APP_URL}/tickets/${ticket.id}`;
    const clientName = (ticket as any).clients?.name || "—";
    const analystName = profile?.full_name || "Analista";

    await resend.emails.send({
      from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
      replyTo: "suporte@resend.otimizzo.com",
      to: [analystEmail],
      subject: `[${label} #${ticket.ticket_number}] Você foi atribuído - ${ticket.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #2563eb; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; color: #ffffff;">🎯 Novo ${label} Atribuído</h2>
            </div>
            <div style="background:#fff; padding:20px; border:1px solid #e9ecef;">
              <p>Olá <strong>${analystName}</strong>,</p>
              <p>Você foi atribuído ao ${label.toLowerCase()} abaixo:</p>
              <div style="background:#eff6ff; padding:12px; border-left:4px solid #2563eb; margin:15px 0;">
                <p style="margin:0;"><strong>${label}:</strong> #${ticket.ticket_number}</p>
                <p style="margin:6px 0 0;"><strong>Título:</strong> ${ticket.title}</p>
                <p style="margin:6px 0 0;"><strong>Cliente:</strong> ${clientName}</p>
                <p style="margin:6px 0 0;"><strong>Prioridade:</strong> ${ticket.priority}</p>
              </div>
              <p style="margin-top:20px;">
                <a href="${link}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px;">
                  Abrir ${label}
                </a>
              </p>
            </div>
            <div style="background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#6c757d; border-radius:0 0 8px 8px;">
              <p style="margin:5px 0;">Sistema de Tickets · <strong>Otimizzo</strong></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-analyst-assignment-notification error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});