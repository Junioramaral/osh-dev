import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation schemas
const ManageUserSchema = z.object({
  action: z.enum(['update_email', 'delete', 'resend_invite', 'get_user', 'list_users']),
  userId: z.string().uuid().optional(),
  data: z.object({
    email: z.string().email().max(255).optional(),
  }).optional(),
});

// Verify JWT and extract claims without relying on session validation
async function verifyJwt(token: string): Promise<{ sub: string; email: string } | null> {
  try {
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET");
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.error("[manage-user] Token expired");
      return null;
    }

    // Check audience
    if (payload.aud !== 'authenticated') {
      console.error("[manage-user] Invalid audience");
      return null;
    }

    // If we have the JWT secret, verify signature
    if (jwtSecret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      
      const signatureInput = encoder.encode(`${parts[0]}.${parts[1]}`);
      const signature = new Uint8Array(decode(parts[2]));
      
      const valid = await crypto.subtle.verify("HMAC", key, signature, signatureInput);
      if (!valid) {
        console.error("[manage-user] Invalid JWT signature");
        return null;
      }
    }

    if (!payload.sub) return null;
    
    return { sub: payload.sub, email: payload.email };
  } catch (err) {
    console.error("[manage-user] JWT verification error:", err);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input using Zod schema
    const rawData = await req.json();
    const validationResult = ManageUserSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error('[manage-user] Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, userId, data } = validationResult.data;
    
    console.log(`[manage-user] Action: ${action}, UserId: ${userId}`);

    // Create admin client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get authenticated user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[manage-user] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const claims = await verifyJwt(token);
    
    if (!claims) {
      console.error("[manage-user] Invalid or expired token");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[manage-user] Authenticated user: ${claims.sub} (${claims.email})`);

    // Check if user has super_admin role (supports multi-role system)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.sub);

    const hasSuperAdmin = roleData?.some(r => r.role === "super_admin");
    
    if (roleError || !hasSuperAdmin) {
      console.error("[manage-user] User lacks super_admin role:", claims.sub);
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case "update_email":
        console.log(`[manage-user] Updating email for user ${userId} to ${data?.email}`);
        result = await supabaseAdmin.auth.admin.updateUserById(userId!, { 
          email: data?.email,
          email_confirm: true
        });
        break;

      case "delete":
        console.log(`[manage-user] Deleting user ${userId}`);
        result = await supabaseAdmin.auth.admin.deleteUser(userId!);
        break;

      case "resend_invite":
        console.log(`[manage-user] Resending invite to ${data?.email}`);
        result = await supabaseAdmin.auth.admin.inviteUserByEmail(data?.email!);
        break;

      case "get_user":
        console.log(`[manage-user] Getting user ${userId}`);
        result = await supabaseAdmin.auth.admin.getUserById(userId!);
        break;

      case "list_users":
        console.log(`[manage-user] Listing users`);
        result = await supabaseAdmin.auth.admin.listUsers();
        break;

      default:
        console.error(`[manage-user] Unknown action: ${action}`);
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result.error) {
      console.error(`[manage-user] Error in ${action}:`, result.error);
      return new Response(
        JSON.stringify({ error: `Failed to ${action.replace('_', ' ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[manage-user] Success for ${action}`);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[manage-user] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
