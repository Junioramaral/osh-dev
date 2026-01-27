import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://osh.tec.br";
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const notificationId = url.searchParams.get("id");
    const token = url.searchParams.get("token");
    const userId = url.searchParams.get("user");

    console.log(`🔔 Acknowledge SLA: Processing notification ${notificationId}`);

    if (!notificationId || !token) {
      console.error("❌ Missing required parameters");
      return new Response(
        generateHtmlResponse(false, "Parâmetros inválidos", appUrl),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Fetch the notification and validate token
    const { data: notification, error: fetchError } = await adminClient
      .from("sla_notifications")
      .select("id, ticket_id, acknowledgment_token, acknowledged_at")
      .eq("id", notificationId)
      .maybeSingle();

    if (fetchError || !notification) {
      console.error("❌ Notification not found:", fetchError);
      return new Response(
        generateHtmlResponse(false, "Notificação não encontrada", appUrl),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Validate token
    if (notification.acknowledgment_token !== token) {
      console.error("❌ Invalid token");
      return new Response(
        generateHtmlResponse(false, "Token inválido", appUrl),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Check if already acknowledged
    if (notification.acknowledged_at) {
      console.log("ℹ️ Notification already acknowledged");
      return new Response(
        generateHtmlResponse(true, "Esta notificação já foi confirmada anteriormente.", appUrl, notification.ticket_id),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Update the notification as acknowledged
    const { error: updateError } = await adminClient
      .from("sla_notifications")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId || null,
      })
      .eq("id", notificationId);

    if (updateError) {
      console.error("❌ Error updating notification:", updateError);
      return new Response(
        generateHtmlResponse(false, "Erro ao confirmar ciência", appUrl),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    console.log(`✅ Notification ${notificationId} acknowledged successfully`);

    return new Response(
      generateHtmlResponse(true, "Ciência confirmada com sucesso!", appUrl, notification.ticket_id),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    const appUrl = Deno.env.get("APP_URL") || "https://osh.tec.br";
    return new Response(
      generateHtmlResponse(false, "Erro interno do servidor", appUrl),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }
});

function generateHtmlResponse(success: boolean, message: string, appUrl: string, ticketId?: string): string {
  const ticketUrl = ticketId ? `${appUrl}/tickets/${ticketId}` : `${appUrl}/tickets`;
  const iconColor = success ? "#10b981" : "#ef4444";
  const icon = success ? "✅" : "❌";

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${success ? "Ciência Confirmada" : "Erro"} - Otimizzo</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 48px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            max-width: 440px;
            width: 100%;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 24px;
          }
          h1 {
            color: ${iconColor};
            font-size: 24px;
            margin-bottom: 16px;
          }
          p {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 32px;
            line-height: 1.5;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.4);
          }
          .info {
            margin-top: 24px;
            padding: 16px;
            background: #f3f4f6;
            border-radius: 8px;
            font-size: 14px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${icon}</div>
          <h1>${success ? "Ciência Confirmada" : "Erro"}</h1>
          <p>${message}</p>
          <a href="${ticketUrl}" class="button">
            ${ticketId ? "Ver Ticket" : "Ver Todos os Tickets"}
          </a>
          ${success ? `
            <div class="info">
              <strong>💡 Nota:</strong> Você não receberá novas notificações sobre este alerta por 12 horas.
            </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;
}
