import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface InviteUserRequest {
  email: string;
  full_name: string;
  phone?: string;
  tenant_id: string;
  role: 'super_admin' | 'user';
}

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

    const { email, full_name, phone, tenant_id, role }: InviteUserRequest = await req.json();

    console.log("🔍 Invite user request:", { email, full_name, phone, tenant_id, role });

    // Validate input
    if (!email || !full_name || !tenant_id || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Create user with default password
    const DEFAULT_PASSWORD = "osh@123456";

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        tenant_id,
        role,
        must_change_password: true, // Flag to force password change on first login
      },
    });

    if (createError) {
      console.error("❌ Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ User created:", newUser.user?.id);

    // Create profile entry
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: newUser.user!.id,
      full_name,
      phone: phone || null,
      client_id: tenant_id,
      is_active: true,
    });

    if (profileError) {
      console.error("❌ Error creating profile:", profileError);
    }

    // Create user_roles entry
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: newUser.user!.id,
      role,
      tenant_id,
    });

    if (roleError) {
      console.error("❌ Error creating user role:", roleError);
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
          role: role,
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

    // Send custom email in Portuguese via Resend
    try {
      console.log("📧 Sending welcome email...");

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .credentials-box { background: white; border: 2px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
              .credential-row { margin: 10px 0; }
              .credential-label { font-weight: bold; color: #6b7280; }
              .credential-value { color: #111827; font-family: monospace; font-size: 16px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Bem-vindo à Plataforma de Atendimento</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${full_name}</strong>!</p>
                <p>Sua conta foi criada com sucesso no tenant <strong>${tenant.name}</strong>.</p>
                
                <div class="credentials-box">
                  <h3 style="margin-top: 0;">🔐 Suas Credenciais de Acesso</h3>
                  <div class="credential-row">
                    <span class="credential-label">Email:</span><br>
                    <span class="credential-value">${email}</span>
                  </div>
                  <div class="credential-row">
                    <span class="credential-label">Senha Temporária:</span><br>
                    <span class="credential-value">${DEFAULT_PASSWORD}</span>
                  </div>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong> Por motivos de segurança, você será obrigado a trocar sua senha no primeiro acesso. Esta senha temporária não poderá ser utilizada após a primeira troca.
                </div>
                
                <div style="text-align: center;">
                  <a href="https://ottimizzo-nexus.lovable.app/auth" class="button">
                    Acessar Plataforma
                  </a>
                </div>
                
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                  Se você não solicitou esta conta, por favor ignore este email.
                </p>
              </div>
              <div class="footer">
                <p>Otimizzo Service Hub - Service Desk Multi-tenant</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const { error: emailError } = await resend.emails.send({
        from: "Otimizzo Service Hub <noreply@otimizzo.com>",
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
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
