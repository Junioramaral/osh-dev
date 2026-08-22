import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ver create-tenant/index.ts — instanciar o Resend no module scope com uma
// key ausente derruba a function inteira no boot (WORKER_ERROR).
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const InviteTenantUserSchema = z.object({
  tenant_id: z.string().uuid("Invalid tenant_id"),
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  full_name: z.string().min(1, "Full name is required").max(255, "Full name too long").trim(),
  phone: z
    .string()
    .max(20, "Phone number too long")
    .regex(/^[0-9+() -]*$/, "Invalid phone format")
    .optional()
    .nullable(),
  role: z.enum(["tenant_admin", "analyst_db", "analyst_app"]),
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

const roleLabels: Record<string, string> = {
  tenant_admin: "Admin do Tenant",
  analyst_db: "Analista DB",
  analyst_app: "Analista APP",
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
    const validationResult = InviteTenantUserSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { tenant_id, email, full_name, phone, role } = validationResult.data;

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

    // Platform admin pode convidar pra qualquer tenant. Um tenant_admin só
    // pode convidar pro próprio tenant (autoatendimento de equipe — sem
    // isso, um tenant novo depende da Otimizzo pra cada analista contratado).
    const { data: adminRow } = await userClient
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const isPlatformAdmin = !!adminRow;

    let isSelfServiceTenantAdmin = false;
    if (!isPlatformAdmin) {
      const { data: callerTenantUser } = await userClient
        .from("tenant_users")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .maybeSingle();
      isSelfServiceTenantAdmin =
        callerTenantUser?.role === "tenant_admin" && callerTenantUser?.tenant_id === tenant_id;
    }

    if (!isPlatformAdmin && !isSelfServiceTenantAdmin) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id, name")
      .eq("id", tenant_id)
      .maybeSingle();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Cria o usuário
    const temporaryPassword = generateTempPassword();
    const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        tenant_id: tenant.id,
        must_change_password: true,
        phone: phone || null,
      },
    });

    if (createUserError) {
      const safeMsg = createUserError.message?.includes("already been registered")
        ? "A user with this email already exists"
        : "Failed to create user";
      return new Response(JSON.stringify({ error: safeMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Vincula ao tenant com o papel escolhido
    const { error: tenantUserError } = await adminClient.from("tenant_users").insert({
      tenant_id: tenant.id,
      user_id: newUser.user!.id,
      role,
    });

    if (tenantUserError) {
      return new Response(
        JSON.stringify({ error: "User created, but failed to link to tenant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Email de boas-vindas (best-effort, não bloqueia)
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY não configurado — pulando email de boas-vindas");
    } else {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const appUrl = Deno.env.get("APP_URL") || "https://osh.tec.br";
        await resend.emails.send({
          from: "Otimizzo Service Hub <noreply@resend.otimizzo.com>",
          to: [email],
          subject: "Bem-vindo à Plataforma - Suas Credenciais de Acesso",
          html: `<p>Olá, ${full_name}!</p>
<p>Sua conta foi criada como <strong>${roleLabels[role]}</strong> do tenant <strong>${tenant.name}</strong>.</p>
<p>Email: <strong>${email}</strong><br/>Senha temporária: <strong>${temporaryPassword}</strong></p>
<p>Você será obrigado a trocar a senha no primeiro acesso.</p>
<p><a href="${appUrl}/auth">Acessar Plataforma</a></p>`,
        });
      } catch (emailException) {
        console.error("Error sending welcome email:", emailException);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user!.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in invite-tenant-user function:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
