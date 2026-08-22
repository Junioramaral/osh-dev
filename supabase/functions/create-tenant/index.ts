import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lido no module scope, mas o SDK do Resend só é instanciado dentro do
// try/catch do envio de email (abaixo) — nunca aqui. Instanciar com uma
// key ausente/inválida no module scope derruba a function inteira no
// boot (WORKER_ERROR), mesmo pra requests que nem chegam a enviar email.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const CreateTenantSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long").trim(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and hyphens only"),
  owner_email: z.string().email("Invalid email format").max(255, "Email too long"),
  owner_name: z.string().min(1, "Owner name is required").max(255, "Owner name too long").trim(),
  owner_phone: z
    .string()
    .max(20, "Phone number too long")
    .regex(/^[0-9+() -]*$/, "Invalid phone format")
    .optional()
    .nullable(),
});

const generateTempPassword = (): string => {
  const lowercase = "abcdefghijkmnpqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = lowercase + uppercase + digits + symbols;

  const pick = (set: string) => {
    const arr = new Uint8Array(1);
    crypto.getRandomValues(arr);
    return set[arr[0] % set.length];
  };

  const required = [pick(lowercase), pick(uppercase), pick(digits), pick(symbols)];
  const remaining = Array.from({ length: 8 }, () => pick(all));
  const combined = [...required, ...remaining];

  for (let i = combined.length - 1; i > 0; i--) {
    const rand = new Uint8Array(1);
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const rawData = await req.json();
    const validationResult = CreateTenantSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { name, slug, owner_email, owner_name, owner_phone } = validationResult.data;

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforced via RLS: platform_admins only allows a row to be visible to
    // itself when is_platform_admin() is true for this user. Zero rows back
    // means either not an admin, or RLS blocked it — same outcome either way.
    const { data: adminRow } = await userClient
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Cria o tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({ name, slug, is_active: true, is_platform_owner: false })
      .select()
      .single();

    if (tenantError) {
      const safeMsg = tenantError.message?.includes("duplicate key")
        ? "A tenant with this slug already exists"
        : "Failed to create tenant";
      return new Response(JSON.stringify({ error: safeMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Cria o usuário owner
    const temporaryPassword = generateTempPassword();
    const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email: owner_email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: owner_name,
        tenant_id: tenant.id,
        must_change_password: true,
        phone: owner_phone || null,
      },
    });

    if (createUserError) {
      // Tenant já foi criado — não desfazemos automaticamente, o platform
      // admin pode convidar o owner depois pela tela de detalhe do tenant.
      const safeMsg = createUserError.message?.includes("already been registered")
        ? "A user with this email already exists"
        : "Failed to create owner user";
      return new Response(
        JSON.stringify({ error: safeMsg, tenant }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Vincula o owner ao tenant novo
    // tenant_users.role só aceita 'tenant_admin' | 'analyst_db' | 'analyst_app'
    // (CHECK constraint da migration 016) — não existe 'owner' nesse enum,
    // apesar do CLAUDE.md descrever owner/admin/viewer no design original.
    const { error: tenantUserError } = await adminClient.from("tenant_users").insert({
      tenant_id: tenant.id,
      user_id: newUser.user!.id,
      role: "tenant_admin",
    });

    if (tenantUserError) {
      return new Response(
        JSON.stringify({ error: "Tenant and user created, but failed to link owner role", tenant }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3b. Starter kit: copia a configuração operacional da Otimizzo (categorias,
    // subcategorias, segmentos, engines, configs de sistema, feriados) pro
    // tenant novo, pra ele não nascer com essas 6 tabelas vazias (quebrando
    // criação de ticket e cálculo de SLA no primeiro dia). Best-effort — não
    // bloqueia a criação do tenant se algo falhar aqui, só loga.
    // NÃO copia application_products: são produtos comerciais específicos da
    // Otimizzo (ContaDia, LexisFlow, Sec4File), o tenant novo cadastra os seus.
    try {
      const { data: otimizzoTenant } = await adminClient
        .from("tenants")
        .select("id")
        .eq("is_platform_owner", true)
        .single();
      const otimizzoTenantId = otimizzoTenant?.id;

      if (otimizzoTenantId) {
        const { data: categories } = await adminClient
          .from("ticket_categories")
          .select("id, name, segment, is_active, sort_order")
          .eq("tenant_id", otimizzoTenantId);

        const categoryIdMap = new Map<string, string>();
        for (const cat of categories || []) {
          const { data: newCat, error: catError } = await adminClient
            .from("ticket_categories")
            .insert({
              tenant_id: tenant.id,
              name: cat.name,
              segment: cat.segment,
              is_active: cat.is_active,
              sort_order: cat.sort_order,
            })
            .select("id")
            .single();
          if (!catError && newCat) categoryIdMap.set(cat.id, newCat.id);
        }

        const { data: subcategories } = await adminClient
          .from("ticket_subcategories")
          .select("category_id, name, is_active, sort_order")
          .in("category_id", (categories || []).map((c) => c.id));
        if (subcategories?.length) {
          await adminClient.from("ticket_subcategories").insert(
            subcategories
              .filter((sub) => categoryIdMap.has(sub.category_id))
              .map((sub) => ({
                category_id: categoryIdMap.get(sub.category_id)!,
                name: sub.name,
                is_active: sub.is_active,
                sort_order: sub.sort_order,
              })),
          );
        }

        const { data: segments } = await adminClient
          .from("segments")
          .select("code, display_name, description, icon, color, is_active, sort_order")
          .eq("tenant_id", otimizzoTenantId);
        if (segments?.length) {
          await adminClient.from("segments").insert(
            segments.map((s) => ({ ...s, tenant_id: tenant.id })),
          );
        }

        const { data: engines } = await adminClient
          .from("database_engines")
          .select("name, description, is_active, sort_order")
          .eq("tenant_id", otimizzoTenantId);
        if (engines?.length) {
          await adminClient.from("database_engines").insert(
            engines.map((e) => ({ ...e, tenant_id: tenant.id })),
          );
        }

        const { data: configs } = await adminClient
          .from("system_configs")
          .select("key, value, description")
          .eq("tenant_id", otimizzoTenantId);
        if (configs?.length) {
          await adminClient.from("system_configs").insert(
            configs.map((c) => ({ ...c, tenant_id: tenant.id })),
          );
        }

        const { data: holidays } = await adminClient
          .from("sla_holidays")
          .select("holiday_date, name, is_automatic")
          .eq("tenant_id", otimizzoTenantId);
        if (holidays?.length) {
          await adminClient.from("sla_holidays").insert(
            holidays.map((h) => ({ ...h, tenant_id: tenant.id })),
          );
        }
      }
    } catch (seedError) {
      console.error("Erro ao semear starter kit do tenant novo (não bloqueia a criação):", seedError);
    }

    // 4. Email de boas-vindas (best-effort, não bloqueia a criação)
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY não configurado — pulando email de boas-vindas");
    } else {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const appUrl = Deno.env.get("APP_URL") || "https://osh.tec.br";
        await resend.emails.send({
          from: "Otimizzo Service Hub <noreply@resend.otimizzo.com>",
          to: [owner_email],
          subject: "Bem-vindo à Plataforma - Suas Credenciais de Acesso",
          html: `<p>Olá, ${owner_name}!</p>
<p>Sua conta foi criada como owner do tenant <strong>${name}</strong>.</p>
<p>Email: <strong>${owner_email}</strong><br/>Senha temporária: <strong>${temporaryPassword}</strong></p>
<p>Você será obrigado a trocar a senha no primeiro acesso.</p>
<p><a href="${appUrl}/auth">Acessar Plataforma</a></p>`,
        });
      } catch (emailException) {
        console.error("Error sending welcome email:", emailException);
      }
    }

    return new Response(JSON.stringify({ success: true, tenant, owner_user_id: newUser.user!.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in create-tenant function:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
