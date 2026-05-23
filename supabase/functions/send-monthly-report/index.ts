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
  updated_at: string | null;
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

interface MonthlyVolumeRow {
  monthLabel: string;
  abertos: number;
  fechados: number;
}

function formatBR(date: string | null | undefined): string {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatBRStacked(date: string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = new Date(date);
    const day = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
    const time = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    return `${day}<br><span style="color:#64748b;">${time}</span>`;
  } catch {
    return "-";
  }
}

async function fetch6MonthVolume(
  supabase: any,
  clientId: string,
  targetMonth: number,
  targetYear: number,
): Promise<MonthlyVolumeRow[]> {
  const rows: MonthlyVolumeRow[] = [];
  // 6 months: from (target-5) to target inclusive
  for (let i = 5; i >= 0; i--) {
    const d = new Date(targetYear, targetMonth - 1 - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const start = new Date(y, m, 1).toISOString();
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString();

    const { count: abertosCount } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .neq("record_type", "rfc")
      .gte("created_at", start)
      .lte("created_at", end);

    const { count: fechadosCount } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .neq("record_type", "rfc")
      .gte("resolved_at", start)
      .lte("resolved_at", end);

    rows.push({
      monthLabel: `${MONTH_NAMES[m].slice(0, 3)}/${String(y).slice(-2)}`,
      abertos: abertosCount || 0,
      fechados: fechadosCount || 0,
    });
  }
  return rows;
}

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
  tickets: TicketData[],
  monthlyVolume: MonthlyVolumeRow[],
): string {
  const monthName = MONTH_NAMES[month - 1];
  const generationDate = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const badgeStyles: Record<string, string> = {
    p1: "background-color:#fee2e2;color:#dc2626;",
    p2: "background-color:#fef3c7;color:#d97706;",
    p3: "background-color:#dbeafe;color:#2563eb;",
    p4: "background-color:#f1f5f9;color:#64748b;",
    success: "background-color:#dcfce7;color:#16a34a;",
    warning: "background-color:#fef3c7;color:#d97706;",
    info: "background-color:#dbeafe;color:#2563eb;",
    danger: "background-color:#fee2e2;color:#dc2626;",
  };
  const badge = (key: string, text: string) =>
    `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:500;${badgeStyles[key] || ""}">${text}</span>`;

  const slaKey = metrics.slaMetRate >= 90 ? "success" : metrics.slaMetRate >= 70 ? "warning" : "danger";

  const metricCard = (value: string, label: string, variant: "default" | "success" | "warning" | "danger" = "default") => {
    const bg = variant === "success" ? "#dcfce7" : variant === "warning" ? "#fef3c7" : variant === "danger" ? "#fee2e2" : "#f8f9fa";
    const valColor = variant === "success" ? "#16a34a" : variant === "warning" ? "#d97706" : variant === "danger" ? "#dc2626" : "#1e293b";
    return `<td width="25%" valign="top" style="padding:5px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};">
        <tr><td align="center" style="padding:20px 10px;">
          <div style="font-size:26px;font-weight:bold;color:${valColor};line-height:1.1;">${value}</div>
          <div style="font-size:12px;color:#64748b;margin-top:5px;">${label}</div>
        </td></tr>
      </table>
    </td>`;
  };

  const sectionTitle = (txt: string) =>
    `<h2 style="font-size:18px;font-weight:bold;color:#1e3a8a;margin:0 0 20px;padding-bottom:10px;border-bottom:2px solid #3b82f6;">${txt}</h2>`;

  const slaBadgeFor = (t: TicketData) => {
    if (t.sla_resolution_met === true) return badge("success", "✓");
    if (t.sla_resolution_met === false) return badge("p1", "✗");
    return badge("warning", "⏳");
  };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;color:#333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table role="presentation" width="700" cellpadding="0" cellspacing="0" border="0" style="max-width:700px;width:100%;background-color:#ffffff;">
        <!-- Header -->
        <tr><td style="background-color:#1e3a8a;padding:40px;text-align:center;">
          <h1 style="color:#ffffff;font-size:32px;margin:0 0 10px;letter-spacing:2px;">OTIMIZZO</h1>
          <h2 style="color:#ffffff;font-size:18px;margin:0 0 20px;font-weight:normal;">Relatório Mensal de Suporte</h2>
          <p style="color:#ffffff;font-size:16px;margin:5px 0;"><strong>Cliente:</strong> ${clientName}</p>
          <p style="color:#e0e7ff;font-size:14px;margin:5px 0;">Competência: ${monthName}/${year}</p>
          <p style="color:#e0e7ff;font-size:14px;margin:5px 0;">Gerado em: ${generationDate}</p>
        </td></tr>

        <!-- Resumo Executivo -->
        <tr><td style="padding:30px;">
          ${sectionTitle("📊 Resumo Executivo")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
            <tr>
              ${metricCard(String(metrics.total), "Total de Tickets")}
              ${metricCard(String(metrics.resolved), "Resolvidos", "success")}
              ${metricCard(String(metrics.pending), "Em Aberto", "warning")}
              ${metricCard(`${metrics.slaMetRate}%`, "SLA Cumprido", slaKey as any)}
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${metricCard(`${metrics.avgResolutionHours}h`, "Tempo Médio Resolução")}
              ${metricCard(String(metrics.slaMetCount), "SLA Atendido", "success")}
              ${metricCard(String(metrics.slaNotMetCount), "SLA Não Atendido", "danger")}
              ${metricCard(String(metrics.slaInProgress), "Em Andamento")}
            </tr>
          </table>
        </td></tr>

        <!-- Distribuição -->
        <tr><td style="padding:0 30px 30px;">
          ${sectionTitle("📈 Distribuição de Tickets")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-collapse:collapse;">
            <tr>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Segmento</th>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Quantidade</th>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">%</th>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${badge("info", "DB")} Banco de Dados</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${metrics.bySegment.DB}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${metrics.total > 0 ? Math.round((metrics.bySegment.DB / metrics.total) * 100) : 0}%</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${badge("success", "APP")} Aplicação</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${metrics.bySegment.APP}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${metrics.total > 0 ? Math.round((metrics.bySegment.APP / metrics.total) * 100) : 0}%</td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-collapse:collapse;margin-top:20px;">
            <tr>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Prioridade</th>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Quantidade</th>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">%</th>
            </tr>
            ${(["P1","P2","P3","P4"] as const).map(p => {
              const count = metrics.byPriority[p];
              const label = p === "P1" ? "Crítico" : p === "P2" ? "Alto" : p === "P3" ? "Médio" : "Baixo";
              return `<tr>
                <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${badge(p.toLowerCase(), p)} ${label}</td>
                <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${count}</td>
                <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0}%</td>
              </tr>`;
            }).join("")}
          </table>
        </td></tr>

        ${metrics.topCategories.length > 0 ? `
        <tr><td style="padding:0 30px 30px;">
          ${sectionTitle("🏷️ Top 5 Categorias")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-collapse:collapse;">
            <tr>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Categoria</th>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Quantidade</th>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">%</th>
            </tr>
            ${metrics.topCategories.map(([cat, count]) => `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${cat}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${count}</td>
              <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${Math.round((count / metrics.total) * 100)}%</td>
            </tr>`).join("")}
          </table>
        </td></tr>` : ""}

        ${monthlyVolume.length > 0 ? `
        <tr><td style="padding:0 30px 30px;">
          ${sectionTitle("📅 Resumo Numérico - Últimos 6 Meses")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-collapse:collapse;">
            <tr>
              <th align="left" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Mês</th>
              <th align="center" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Abertos</th>
              <th align="center" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Fechados</th>
              <th align="center" style="background-color:#f1f5f9;padding:10px;border-bottom:2px solid #e2e8f0;">Saldo</th>
            </tr>
            ${monthlyVolume.map((m) => {
              const saldo = m.fechados - m.abertos;
              const saldoColor = saldo >= 0 ? "#16a34a" : "#dc2626";
              return `<tr>
                <td style="padding:10px;border-bottom:1px solid #e2e8f0;"><strong>${m.monthLabel}</strong></td>
                <td align="center" style="padding:10px;border-bottom:1px solid #e2e8f0;color:#d97706;font-weight:600;">${m.abertos}</td>
                <td align="center" style="padding:10px;border-bottom:1px solid #e2e8f0;color:#16a34a;font-weight:600;">${m.fechados}</td>
                <td align="center" style="padding:10px;border-bottom:1px solid #e2e8f0;color:${saldoColor};font-weight:600;">${saldo > 0 ? "+" : ""}${saldo}</td>
              </tr>`;
            }).join("")}
            ${(() => {
              const totA = monthlyVolume.reduce((s, m) => s + m.abertos, 0);
              const totF = monthlyVolume.reduce((s, m) => s + m.fechados, 0);
              const totS = totF - totA;
              return `<tr style="background-color:#f1f5f9;font-weight:bold;">
                <td style="padding:10px;">Total</td>
                <td align="center" style="padding:10px;color:#d97706;">${totA}</td>
                <td align="center" style="padding:10px;color:#16a34a;">${totF}</td>
                <td align="center" style="padding:10px;color:${totS >= 0 ? "#16a34a" : "#dc2626"};">${totS > 0 ? "+" : ""}${totS}</td>
              </tr>`;
            })()}
          </table>
        </td></tr>` : ""}

        <!-- Listagem -->
        <tr><td style="padding:0 30px 30px;">
          ${sectionTitle(`📋 Listagem de Tickets (${tickets.length})`)}
          ${tickets.length > 0 ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;font-size:11px;border-collapse:collapse;">
            <colgroup>
              <col style="width:10%;" /><col style="width:32%;" /><col style="width:10%;" />
              <col style="width:11%;" /><col style="width:14%;" /><col style="width:7%;" /><col style="width:16%;" />
            </colgroup>
            <tr>
              <th align="left" style="background-color:#f1f5f9;padding:6px 4px;border-bottom:2px solid #e2e8f0;">Número</th>
              <th align="left" style="background-color:#f1f5f9;padding:6px 4px;border-bottom:2px solid #e2e8f0;">Título</th>
              <th align="left" style="background-color:#f1f5f9;padding:6px 4px;border-bottom:2px solid #e2e8f0;">Segmento</th>
              <th align="left" style="background-color:#f1f5f9;padding:6px 4px;border-bottom:2px solid #e2e8f0;">Prioridade</th>
              <th align="left" style="background-color:#f1f5f9;padding:6px 4px;border-bottom:2px solid #e2e8f0;">Status</th>
              <th align="left" style="background-color:#f1f5f9;padding:6px 4px;border-bottom:2px solid #e2e8f0;">SLA</th>
              <th align="left" style="background-color:#f1f5f9;padding:6px 4px;border-bottom:2px solid #e2e8f0;">Abertura</th>
            </tr>
            ${tickets.slice(0, 50).map(t => `
            <tr>
              <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;"><strong>${t.ticket_number}</strong></td>
              <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">${badge(t.segment === "DB" ? "info" : "success", t.segment)}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">${badge(t.priority.toLowerCase(), t.priority)}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">${STATUS_LABELS[t.status] || t.status}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">${slaBadgeFor(t)}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;font-size:10px;line-height:1.3;">${formatBRStacked(t.created_at)}</td>
            </tr>`).join("")}
          </table>
          ${tickets.length > 50 ? `<p style="text-align:center;color:#64748b;margin-top:10px;">... e mais ${tickets.length - 50} tickets</p>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;background-color:#f8fafc;">
            <tr><td style="padding:10px;font-size:11px;color:#475569;">
              <strong>Legenda SLA:</strong> ${badge("success", "✓")} Cumprido &nbsp;•&nbsp; ${badge("p1", "✗")} Não Cumprido &nbsp;•&nbsp; ${badge("warning", "⏳")} Em Andamento
            </td></tr>
          </table>
          ` : `<p style="text-align:center;color:#64748b;">Nenhum ticket registrado neste período.</p>`}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#f8fafc;padding:20px;text-align:center;color:#64748b;font-size:12px;">
          <p style="margin:5px 0;">Este relatório foi gerado automaticamente pelo sistema Otimizzo.</p>
          <p style="margin:5px 0;"><strong>Otimizzo</strong> - Excelência em Suporte</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
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
            created_at, updated_at, resolved_at, sla_first_response_met, sla_resolution_met
          `)
          .eq("client_id", client.id)
          .neq("record_type", "rfc")
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

        // Fetch 6-month volume data
        const monthlyVolume = await fetch6MonthVolume(supabase, client.id, targetMonth, targetYear);

        // Generate HTML report
        const htmlContent = generateReportHTML(
          client.name,
          targetMonth,
          targetYear,
          metrics,
          tickets as TicketData[] || [],
          monthlyVolume,
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
