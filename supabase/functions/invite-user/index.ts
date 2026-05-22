import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Input validation schema
const InviteUserSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  full_name: z.string().min(1, "Name is required").max(255, "Name too long").trim(),
  phone: z.string().max(20, "Phone number too long").regex(/^[0-9+() -]*$/, "Invalid phone format").optional().nullable(),
  tenant_id: z.string().uuid("Invalid tenant ID format"),
  roles: z.array(
    z.enum(['super_admin', 'tenant_admin', 'analyst_db', 'analyst_app', 'user'])
  ).min(1).max(5).optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'analyst_db', 'analyst_app', 'user']).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's token for authorization checks
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for user creation
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input using Zod schema
    const rawData = await req.json();
    const validationResult = InviteUserSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error("❌ Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, full_name, phone, tenant_id } = validationResult.data;
    
    // Support both 'roles' array and legacy 'role' string
    let roles: string[] = validationResult.data.roles || [];
    if (roles.length === 0 && validationResult.data.role) {
      roles = [validationResult.data.role];
    }
    if (roles.length === 0) {
      roles = ["user"];
    }

    console.log("🔍 Invite user request:", { email, full_name, phone, tenant_id, roles });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("❌ User authentication error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Current user:", user.id);

    // Check if user is super_admin
    const { data: userRoles, error: rolesError } = await userClient
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("❌ Error fetching user roles:", rolesError);
      return new Response(JSON.stringify({ error: "Error checking permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuperAdmin = userRoles?.some((r) => r.role === "super_admin");

    if (!isSuperAdmin) {
      console.error("❌ User does not have permission to invite users");
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Permission check passed");

    // Get tenant info to validate domain and max_users
    const { data: tenant, error: tenantError } = await adminClient
      .from("clients")
      .select("domain, max_users, is_active, name")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("❌ Tenant not found:", tenantError);
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tenant.is_active) {
      return new Response(JSON.stringify({ error: "Tenant is not active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email domain matches tenant domain (only for tenant_admins, super_admins can invite anyone)
    if (!isSuperAdmin && tenant.domain) {
      const emailDomain = email.split("@")[1].toLowerCase();
      const tenantDomain = tenant.domain.toLowerCase();

      // Check if email domain matches or is a subdomain of tenant domain
      if (emailDomain !== tenantDomain && !emailDomain.endsWith(`.${tenantDomain}`)) {
        console.error("❌ Email domain mismatch:", { emailDomain, tenantDomain: tenant.domain });
        return new Response(JSON.stringify({ error: `Email domain must be @${tenant.domain} or a subdomain` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check max_users limit
    const { count: currentUsersCount, error: countError } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("client_id", tenant_id)
      .eq("is_active", true);

    if (countError) {
      console.error("❌ Error counting users:", countError);
      return new Response(JSON.stringify({ error: "Error checking user limit" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tenant.max_users && currentUsersCount !== null && currentUsersCount >= tenant.max_users) {
      console.error("❌ Max users limit reached:", { current: currentUsersCount, max: tenant.max_users });
      return new Response(
        JSON.stringify({ error: `Maximum number of users (${tenant.max_users}) reached for this tenant` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("✅ Validation passed, creating user...");

    // Generate random temporary password without visually ambiguous characters
    // Excludes: l, I, 1, O, 0, o (avoid digitação errada na primeira tentativa)
    const generateTempPassword = (): string => {
      const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // sem l, o
      const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I, O
      const digits = '23456789';                    // sem 0, 1
      const symbols = '!@#$%^&*';
      const all = lowercase + uppercase + digits + symbols;

      const pick = (set: string) => {
        const arr = new Uint8Array(1);
        crypto.getRandomValues(arr);
        return set[arr[0] % set.length];
      };

      // Garantir 1 de cada categoria para passar na validação do ForcePasswordChange
      const required = [pick(lowercase), pick(uppercase), pick(digits), pick(symbols)];
      const remaining = Array.from({ length: 8 }, () => pick(all));
      const combined = [...required, ...remaining];

      // Shuffle (Fisher-Yates) usando crypto
      for (let i = combined.length - 1; i > 0; i--) {
        const rand = new Uint8Array(1);
        crypto.getRandomValues(rand);
        const j = rand[0] % (i + 1);
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }
      return combined.join('');
    };
    const temporaryPassword = generateTempPassword();

    // Validate and filter roles to only valid enum values
    const validRoles = ['super_admin', 'tenant_admin', 'analyst_db', 'analyst_app', 'user'];
    const validatedRoles = roles.filter(r => validRoles.includes(r));
    if (validatedRoles.length === 0) {
      validatedRoles.push('user');
    }
    
    console.log(`📝 Using roles: ${validatedRoles.join(', ')}`);

    // Use first role for user metadata (for backward compatibility)
    const primaryRole = validatedRoles[0];

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        tenant_id,
        role: primaryRole, // Store primary role in metadata
        roles: validatedRoles, // Store all roles
        must_change_password: true, // Flag to force password change on first login
      },
    });

    if (createError) {
      console.error("❌ Error creating user:", createError);
      const safeMsg = createError.message?.includes("already been registered")
        ? "A user with this email already exists"
        : "Failed to create user";
      return new Response(JSON.stringify({ error: safeMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ User created:", newUser.user?.id);

    // Upsert profile entry (the handle_new_user trigger may have already created a base row)
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: newUser.user!.id,
          full_name,
          phone: phone || null,
          client_id: tenant_id,
          is_active: true,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("❌ Error upserting profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to persist user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user_roles entries for each role
    const roleInserts = validatedRoles.map(role => ({
      user_id: newUser.user!.id,
      role: role,
      tenant_id,
    }));

    const { error: roleError } = await adminClient.from("user_roles").insert(roleInserts);

    if (roleError) {
      console.error("❌ Error creating user roles:", roleError);
    }

    // Create contact entry automatically
    console.log("📇 Creating contact entry for user");

    // Check if this is the first contact for the tenant
    const { count: contactCount, error: contactCountError } = await adminClient
      .from("client_contacts")
      .select("*", { count: "exact", head: true })
      .eq("client_id", tenant_id);

    const isPrimaryContact = !contactCountError && (contactCount === 0);

    // Check if contact already exists
    const { data: existingContact } = await adminClient
      .from("client_contacts")
      .select("id")
      .eq("client_id", tenant_id)
      .eq("email", email)
      .maybeSingle();

    if (!existingContact) {
      const { error: contactError } = await adminClient
        .from("client_contacts")
        .insert({
          client_id: tenant_id,
          name: full_name,
          email: email,
          phone: phone || null,
          role: validatedRoles.join(", "), // Store all roles as comma-separated
          is_primary: isPrimaryContact,
        });

      if (contactError) {
        console.error("⚠️ Error creating contact (non-critical):", contactError);
        // Don't block user creation if contact fails
      } else {
        console.log("✅ Contact entry created successfully");
      }
    } else {
      console.log("ℹ️ Contact already exists, skipping creation");
    }

    // Format roles for email display
    const roleLabels: Record<string, string> = {
      super_admin: "Super Admin",
      tenant_admin: "Tenant Admin",
      analyst_db: "Analista DB",
      analyst_app: "Analista APP",
      user: "Usuário",
    };
    const rolesDisplay = validatedRoles.map(r => roleLabels[r] || r).join(", ");
    
    // Get APP_URL for email links
    const appUrl = Deno.env.get("APP_URL") || "https://osh.tec.br";

    // Send custom email in Portuguese via Resend
    try {
      console.log("📧 Sending welcome email...");

      // Bulletproof email HTML - table-based, inline styles, no gradients
      // Compatible with Outlook desktop, Gmail, Apple Mail, mobile clients
      const emailHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo à Plataforma</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; background-color:#ffffff; border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td align="center" bgcolor="#667eea" style="background-color:#667eea; padding:30px 20px; color:#ffffff;">
              <h1 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:24px; font-weight:bold; color:#ffffff; line-height:1.3;">
                Bem-vindo à Plataforma de Atendimento
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:30px 30px 10px 30px; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#333333; line-height:1.6;">
              <p style="margin:0 0 15px 0;">Olá, <strong>${full_name}</strong>!</p>
              <p style="margin:0 0 15px 0;">Sua conta foi criada com sucesso no tenant <strong>${tenant.name}</strong>.</p>
              <p style="margin:0 0 20px 0;">Suas funções: <strong style="color:#3730a3;">${rolesDisplay}</strong></p>
            </td>
          </tr>
          <!-- Credentials box -->
          <tr>
            <td style="padding:0 30px 20px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb; border:2px solid #e5e7eb;">
                <tr>
                  <td style="padding:20px; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#333333;">
                    <h3 style="margin:0 0 15px 0; font-size:16px; color:#111827;">Suas Credenciais de Acesso</h3>
                    <p style="margin:0 0 5px 0; font-weight:bold; color:#6b7280; font-size:13px;">Email:</p>
                    <p style="margin:0 0 15px 0; font-family:'Courier New', monospace; font-size:15px; color:#111827; word-break:break-all;">${email}</p>
                    <p style="margin:0 0 5px 0; font-weight:bold; color:#6b7280; font-size:13px;">Senha Temporária:</p>
                    <p style="margin:0 0 10px 0; font-family:'Courier New', monospace; font-size:18px; font-weight:bold; color:#111827; word-break:break-all; -webkit-user-select:all; user-select:all; background-color:#ffffff; padding:8px 12px; border:1px dashed #c7d2fe; letter-spacing:0.5px;">${temporaryPassword}</p>
                    <p style="margin:0; font-size:12px; color:#6b7280; font-style:italic;">💡 Dica: selecione e copie a senha acima (Ctrl+C / Cmd+C) para evitar erros de digitação.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Warning -->
          <tr>
            <td style="padding:0 30px 20px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fef3c7; border-left:4px solid #f59e0b;">
                <tr>
                  <td style="padding:15px; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#78350f; line-height:1.5;">
                    <strong>Importante:</strong> Por motivos de segurança, você será obrigado a trocar sua senha no primeiro acesso. Esta senha temporária não poderá ser utilizada após a primeira troca.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Bulletproof Button -->
          <tr>
            <td align="center" style="padding:10px 30px 30px 30px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appUrl}/auth" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="10%" stroke="f" fillcolor="#667eea">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Acessar Plataforma</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${appUrl}/auth" target="_blank" style="background-color:#667eea; border:1px solid #667eea; color:#ffffff; display:inline-block; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; line-height:48px; text-align:center; text-decoration:none; width:240px; -webkit-text-size-adjust:none; mso-hide:all;">Acessar Plataforma</a>
              <!--<![endif]-->
            </td>
          </tr>
          <!-- Fallback link -->
          <tr>
            <td align="center" style="padding:0 30px 20px 30px; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#6b7280;">
              Ou copie e cole este link no navegador:<br/>
              <a href="${appUrl}/auth" style="color:#667eea; word-break:break-all;">${appUrl}/auth</a>
            </td>
          </tr>
          <!-- Footer note -->
          <tr>
            <td style="padding:0 30px 20px 30px; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#9ca3af; line-height:1.5;">
              Se você não solicitou esta conta, por favor ignore este email.
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" bgcolor="#f9fafb" style="background-color:#f9fafb; padding:20px; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb;">
              Otimizzo Service Hub &mdash; Service Desk Multi-tenant
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const { error: emailError } = await resend.emails.send({
        from: "Otimizzo Service Hub <noreply@resend.otimizzo.com>",
        to: [email],
        subject: "Bem-vindo à Plataforma - Suas Credenciais de Acesso",
        html: emailHtml,
      });

      if (emailError) {
        console.error("❌ Error sending email:", emailError);
        // Don't throw - user is created, just email failed
      } else {
        console.log("✅ Welcome email sent successfully");
      }
    } catch (emailException) {
      console.error("❌ Exception sending email:", emailException);
      // Don't throw - user is created, just email failed
    }

    console.log("✅ User creation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user!.id,
          email: newUser.user!.email,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("❌ Unexpected error in invite-user function:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
