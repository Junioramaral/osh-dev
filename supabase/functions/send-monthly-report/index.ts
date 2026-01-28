import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClientWithContacts {
  id: string;
  name: string;
  client_contacts: Array<{ name: string; email: string; is_primary: boolean }>;
}

interface TicketData {
  id: string;
  ticket_number: string;
  title: string;
  priority: string;
  status: string;
  segment: string;
  category: string;
  created_at: string;
  resolved_at: string | null;
  sla_first_response_met: boolean | null;
  sla_resolution_met: boolean | null;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_atendimento: "Em Atendimento",
  aguardando_cliente: "Aguardando Cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

function calculateMetrics(tickets: TicketData[]) {
  const total = tickets.length;
  const resolved = tickets.filter(t => t.status === "resolvido" || t.status === "fechado").length;
  const pending = total - resolved;
  
  const slaMetCount = tickets.filter(t => t.sla_resolution_met === true).length;
  const slaNotMetCount = tickets.filter(t => t.sla_resolution_met === false).length;
  const slaInProgress = tickets.filter(t => t.sla_resolution_met === null).length;
  const slaMetRate = total > 0 ? Math.round((slaMetCount / (slaMetCount + slaNotMetCount || 1)) * 100) : 0;
  
  // Average resolution time in hours
  const resolvedTickets = tickets.filter(t => t.resolved_at && t.created_at);
  let avgResolutionHours = 0;
  if (resolvedTickets.length > 0) {
    const totalHours = resolvedTickets.reduce((sum, t) => {
      const created = new Date(t.created_at).getTime();
      const resolved = new Date(t.resolved_at!).getTime();
      return sum + (resolved - created) / (1000 * 60 * 60);
    }, 0);
    avgResolutionHours = Math.round(totalHours / resolvedTickets.length);
  }
  
  // By priority
  const byPriority = {
    P1: tickets.filter(t => t.priority === "P1").length,
    P2: tickets.filter(t => t.priority === "P2").length,
    P3: tickets.filter(t => t.priority === "P3").length,
    P4: tickets.filter(t => t.priority === "P4").length,
  };
  
  // By segment
  const bySegment = {
    DB: tickets.filter(t => t.segment === "DB").length,
    APP: tickets.filter(t => t.segment === "APP").length,
  };
  
  // Top categories
  const categoryCounts: Record<string, number> = {};
  tickets.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return {
    total,
    resolved,
    pending,
    slaMetRate,
    slaMetCount,
    slaNotMetCount,
    slaInProgress,
    avgResolutionHours,
    byPriority,
    bySegment,
    topCategories,
  };
}

function generateReportHTML(
  clientName: string,
  month: number,
  year: number,
  metrics: ReturnType<typeof calculateMetrics>,
  tickets: TicketData[]
): string {
  const monthName = MONTH_NAMES[month - 1];
  const generationDate = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 700px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px; text-align: center; }
    .header h1 { color: white; font-size: 32px; margin: 0 0 10px 0; letter-spacing: 2px; }
    .header h2 { color: white; font-size: 18px; margin: 0 0 20px 0; font-weight: normal; }
    .header .client { color: rgba(255,255,255,0.9); font-size: 16px; margin: 5px 0; }
    .header .competencia { color: rgba(255,255,255,0.8); font-size: 14px; }
    .section { padding: 30px; }
    .section-title { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    .metrics { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px; }
    .metric-card { flex: 1; min-width: 140px; background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .metric-card.success { background: #dcfce7; }
    .metric-card.warning { background: #fef3c7; }
    .metric-card.danger { background: #fee2e2; }
    .metric-value { font-size: 28px; font-weight: bold; color: #1e293b; }
    .metric-card.success .metric-value { color: #16a34a; }
    .metric-card.warning .metric-value { color: #d97706; }
    .metric-card.danger .metric-value { color: #dc2626; }
    .metric-label { font-size: 12px; color: #64748b; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
    .badge-p1 { background: #fee2e2; color: #dc2626; }
    .badge-p2 { background: #fef3c7; color: #d97706; }
    .badge-p3 { background: #dbeafe; color: #2563eb; }
    .badge-p4 { background: #f1f5f9; color: #64748b; }
    .badge-success { background: #dcfce7; color: #16a34a; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-info { background: #dbeafe; color: #2563eb; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; background: #f8fafc; }
    .chart-section { margin: 20px 0; }
    .bar-chart { display: flex; align-items: flex-end; height: 100px; gap: 10px; }
    .bar { flex: 1; background: #3b82f6; border-radius: 4px 4px 0 0; min-height: 5px; position: relative; }
    .bar-label { position: absolute; bottom: -20px; width: 100%; text-align: center; font-size: 10px; }
    .bar-value { position: absolute; top: -20px; width: 100%; text-align: center; font-size: 11px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header / Capa -->
    <div class="header">
      <h1>OTIMIZZO</h1>
      <h2>Relatório Mensal de Suporte</h2>
      <p class="client"><strong>Cliente:</strong> ${clientName}</p>
      <p class="competencia">Competência: ${monthName}/${year}</p>
      <p class="competencia">Gerado em: ${generationDate}</p>
    </div>
    
    <!-- Resumo Executivo -->
    <div class="section">
      <div class="section-title">📊 Resumo Executivo</div>
      <div class="metrics">
        <div class="metric-card">
          <div class="metric-value">${metrics.total}</div>
          <div class="metric-label">Total de Tickets</div>
        </div>
        <div class="metric-card success">
          <div class="metric-value">${metrics.resolved}</div>
          <div class="metric-label">Resolvidos</div>
        </div>
        <div class="metric-card warning">
          <div class="metric-value">${metrics.pending}</div>
          <div class="metric-label">Em Aberto</div>
        </div>
        <div class="metric-card ${metrics.slaMetRate >= 90 ? 'success' : metrics.slaMetRate >= 70 ? 'warning' : 'danger'}">
          <div class="metric-value">${metrics.slaMetRate}%</div>
          <div class="metric-label">SLA Cumprido</div>
        </div>
      </div>
      
      <div class="metrics">
        <div class="metric-card">
          <div class="metric-value">${metrics.avgResolutionHours}h</div>
          <div class="metric-label">Tempo Médio Resolução</div>
        </div>
        <div class="metric-card success">
          <div class="metric-value">${metrics.slaMetCount}</div>
          <div class="metric-label">SLA Atendido</div>
        </div>
        <div class="metric-card danger">
          <div class="metric-value">${metrics.slaNotMetCount}</div>
          <div class="metric-label">SLA Não Atendido</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.slaInProgress}</div>
          <div class="metric-label">Em Andamento</div>
        </div>
      </div>
    </div>
    
    <!-- Volume por Segmento e Prioridade -->
    <div class="section">
      <div class="section-title">📈 Distribuição de Tickets</div>
      <table>
        <tr>
          <th>Segmento</th>
          <th>Quantidade</th>
          <th>%</th>
        </tr>
        <tr>
          <td><span class="badge badge-info">DB</span> Banco de Dados</td>
          <td>${metrics.bySegment.DB}</td>
          <td>${metrics.total > 0 ? Math.round((metrics.bySegment.DB / metrics.total) * 100) : 0}%</td>
        </tr>
        <tr>
          <td><span class="badge badge-success">APP</span> Aplicação</td>
          <td>${metrics.bySegment.APP}</td>
          <td>${metrics.total > 0 ? Math.round((metrics.bySegment.APP / metrics.total) * 100) : 0}%</td>
        </tr>
      </table>
      
      <table style="margin-top: 20px;">
        <tr>
          <th>Prioridade</th>
          <th>Quantidade</th>
          <th>%</th>
        </tr>
        <tr>
          <td><span class="badge badge-p1">P1</span> Crítico</td>
          <td>${metrics.byPriority.P1}</td>
          <td>${metrics.total > 0 ? Math.round((metrics.byPriority.P1 / metrics.total) * 100) : 0}%</td>
        </tr>
        <tr>
          <td><span class="badge badge-p2">P2</span> Alto</td>
          <td>${metrics.byPriority.P2}</td>
          <td>${metrics.total > 0 ? Math.round((metrics.byPriority.P2 / metrics.total) * 100) : 0}%</td>
        </tr>
        <tr>
          <td><span class="badge badge-p3">P3</span> Médio</td>
          <td>${metrics.byPriority.P3}</td>
          <td>${metrics.total > 0 ? Math.round((metrics.byPriority.P3 / metrics.total) * 100) : 0}%</td>
        </tr>
        <tr>
          <td><span class="badge badge-p4">P4</span> Baixo</td>
          <td>${metrics.byPriority.P4}</td>
          <td>${metrics.total > 0 ? Math.round((metrics.byPriority.P4 / metrics.total) * 100) : 0}%</td>
        </tr>
      </table>
    </div>
    
    <!-- Top Categorias -->
    ${metrics.topCategories.length > 0 ? `
    <div class="section">
      <div class="section-title">🏷️ Top 5 Categorias</div>
      <table>
        <tr>
          <th>Categoria</th>
          <th>Quantidade</th>
          <th>%</th>
        </tr>
        ${metrics.topCategories.map(([cat, count]) => `
        <tr>
          <td>${cat}</td>
          <td>${count}</td>
          <td>${Math.round((count / metrics.total) * 100)}%</td>
        </tr>
        `).join("")}
      </table>
    </div>
    ` : ""}
    
    <!-- Listagem de Tickets -->
    <div class="section">
      <div class="section-title">📋 Listagem de Tickets (${tickets.length})</div>
      ${tickets.length > 0 ? `
      <table>
        <tr>
          <th>Número</th>
          <th>Título</th>
          <th>Prioridade</th>
          <th>Status</th>
          <th>SLA</th>
          <th>Data</th>
        </tr>
        ${tickets.slice(0, 50).map(t => `
        <tr>
          <td><strong>${t.ticket_number}</strong></td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.title}</td>
          <td><span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span></td>
          <td>${STATUS_LABELS[t.status] || t.status}</td>
          <td><span class="badge ${t.sla_resolution_met === true ? 'badge-success' : t.sla_resolution_met === false ? 'badge-p1' : 'badge-warning'}">${t.sla_resolution_met === true ? '✓' : t.sla_resolution_met === false ? '✗' : '⏳'}</span></td>
          <td>${new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
        </tr>
        `).join("")}
      </table>
      ${tickets.length > 50 ? `<p style="text-align: center; color: #64748b; margin-top: 10px;">... e mais ${tickets.length - 50} tickets</p>` : ""}
      ` : `<p style="text-align: center; color: #64748b;">Nenhum ticket registrado neste período.</p>`}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>Este relatório foi gerado automaticamente pelo sistema Otimizzo.</p>
      <p><strong>Otimizzo</strong> - Excelência em Suporte</p>
    </div>
  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Check for manual trigger with specific client/month
    let requestBody: { clientId?: string; month?: number; year?: number } = {};
    try {
      requestBody = await req.json();
    } catch {
      // No body, use defaults
    }

    // Calculate report period (last month by default)
    const now = new Date();
    const targetMonth = requestBody.month || (now.getMonth() === 0 ? 12 : now.getMonth());
    const targetYear = requestBody.year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    console.log(`Generating reports for ${MONTH_NAMES[targetMonth - 1]}/${targetYear}`);
    console.log(`Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Build query for clients
    let clientsQuery = supabase
      .from("clients")
      .select(`
        id, name,
        client_contacts(name, email, is_primary)
      `)
      .eq("is_active", true);

    // If specific client requested, filter to that client
    if (requestBody.clientId) {
      clientsQuery = clientsQuery.eq("id", requestBody.clientId);
    } else {
      // Otherwise, get clients that should receive monthly reports
      clientsQuery = clientsQuery.eq("receive_monthly_report", true);
    }

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      throw clientsError;
    }

    console.log(`Found ${clients?.length || 0} clients to send reports`);

    const results: Array<{ client: string; status: string; error?: string; recipients?: string[] }> = [];

    for (const client of (clients as ClientWithContacts[]) || []) {
      try {
        // Fetch tickets for this client in the period
        const { data: tickets, error: ticketsError } = await supabase
          .from("tickets")
          .select(`
            id, ticket_number, title, priority, status, segment, category,
            created_at, resolved_at, sla_first_response_met, sla_resolution_met
          `)
          .eq("client_id", client.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: false });

        if (ticketsError) {
          console.error(`Error fetching tickets for ${client.name}:`, ticketsError);
          throw ticketsError;
        }

        console.log(`Client ${client.name}: ${tickets?.length || 0} tickets`);

        // Calculate metrics
        const metrics = calculateMetrics(tickets as TicketData[] || []);

        // Generate HTML report
        const htmlContent = generateReportHTML(
          client.name,
          targetMonth,
          targetYear,
          metrics,
          tickets as TicketData[] || []
        );

        // Get recipients
        const primaryContact = client.client_contacts?.find(c => c.is_primary);
        const ccContacts = client.client_contacts?.filter(c => !c.is_primary) || [];

        const toEmails = primaryContact?.email ? [primaryContact.email] : [];
        const ccEmails = ccContacts.map(c => c.email).filter(Boolean);

        if (toEmails.length === 0 && ccEmails.length === 0) {
          console.log(`No contacts found for ${client.name}, skipping`);
          results.push({ client: client.name, status: "skipped", error: "No contacts" });
          continue;
        }

        // Send email
        const monthName = MONTH_NAMES[targetMonth - 1];
        const { error: emailError } = await resend.emails.send({
          from: "Otimizzo Suporte <noreply@resend.otimizzo.com>",
          to: toEmails.length > 0 ? toEmails : ccEmails.slice(0, 1),
          cc: toEmails.length > 0 ? ccEmails : ccEmails.slice(1),
          subject: `Relatório Mensal de Suporte - ${monthName}/${targetYear}`,
          html: htmlContent,
        });

        if (emailError) {
          console.error(`Error sending email to ${client.name}:`, emailError);
          throw emailError;
        }

        const allRecipients = [...toEmails, ...ccEmails];

        // Log the send
        await supabase.from("report_send_logs").insert({
          client_id: client.id,
          report_type: "monthly",
          month: targetMonth,
          year: targetYear,
          recipients: allRecipients,
          status: "sent",
        });

        console.log(`Report sent to ${client.name}: ${allRecipients.join(", ")}`);
        results.push({ client: client.name, status: "sent", recipients: allRecipients });

      } catch (clientError: any) {
        console.error(`Error processing client ${client.name}:`, clientError);
        
        // Log the failure
        await supabase.from("report_send_logs").insert({
          client_id: client.id,
          report_type: "monthly",
          month: targetMonth,
          year: targetYear,
          recipients: [],
          status: "failed",
          error_message: clientError.message,
        });

        results.push({ client: client.name, status: "failed", error: clientError.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        period: `${MONTH_NAMES[targetMonth - 1]}/${targetYear}`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-monthly-report function:", error);
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
