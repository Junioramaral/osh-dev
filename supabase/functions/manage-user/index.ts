import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, data } = await req.json();
    
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
    if (!authHeader) {
      console.error("[manage-user] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[manage-user] Invalid token:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has super_admin role (supports multi-role system)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasSuperAdmin = roleData?.some(r => r.role === "super_admin");
    
    if (roleError || !hasSuperAdmin) {
      console.error("[manage-user] User lacks super_admin role:", user.id);
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case "update_email":
        console.log(`[manage-user] Updating email for user ${userId} to ${data.email}`);
        result = await supabaseAdmin.auth.admin.updateUserById(userId, { 
          email: data.email,
          email_confirm: true
        });
        break;

      case "delete":
        console.log(`[manage-user] Deleting user ${userId}`);
        result = await supabaseAdmin.auth.admin.deleteUser(userId);
        break;

      case "resend_invite":
        console.log(`[manage-user] Resending invite to ${data.email}`);
        result = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
        break;

      case "get_user":
        console.log(`[manage-user] Getting user ${userId}`);
        result = await supabaseAdmin.auth.admin.getUserById(userId);
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
        JSON.stringify({ error: result.error.message }),
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
