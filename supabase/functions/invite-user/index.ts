import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  email: string;
  full_name: string;
  tenant_id: string;
  role: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client with user's token for authorization checks
    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for user creation
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { email, full_name, tenant_id, role }: InviteUserRequest = await req.json();

    console.log('🔍 Invite user request:', { email, full_name, tenant_id, role });

    // Validate input
    if (!email || !full_name || !tenant_id || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Current user:', user.id);

    // Check if user is super_admin or tenant_admin of the specified tenant
    const { data: userRoles, error: rolesError } = await userClient
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = userRoles?.some(r => r.role === 'super_admin');
    const isTenantAdmin = userRoles?.some(r => r.role === 'tenant_admin' && r.tenant_id === tenant_id);

    if (!isSuperAdmin && !isTenantAdmin) {
      console.error('❌ User does not have permission to invite users for this tenant');
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Permission check passed');

    // Get tenant info to validate domain and max_users
    const { data: tenant, error: tenantError } = await adminClient
      .from('clients')
      .select('domain, max_users, is_active')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tenant.is_active) {
      return new Response(
        JSON.stringify({ error: 'Tenant is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email domain matches tenant domain
    const emailDomain = email.split('@')[1].toLowerCase();
    if (tenant.domain && emailDomain !== tenant.domain.toLowerCase()) {
      console.error('❌ Email domain mismatch:', { emailDomain, tenantDomain: tenant.domain });
      return new Response(
        JSON.stringify({ error: `Email domain must be @${tenant.domain}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max_users limit
    const { count: currentUsersCount, error: countError } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', tenant_id)
      .eq('is_active', true);

    if (countError) {
      console.error('❌ Error counting users:', countError);
      return new Response(
        JSON.stringify({ error: 'Error checking user limit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tenant.max_users && currentUsersCount !== null && currentUsersCount >= tenant.max_users) {
      console.error('❌ Max users limit reached:', { current: currentUsersCount, max: tenant.max_users });
      return new Response(
        JSON.stringify({ error: `Maximum number of users (${tenant.max_users}) reached for this tenant` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Validation passed, creating user...');

    // Create user with invite (sends email automatically)
    const { data: newUser, error: createError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name,
        tenant_id,
        role,
      },
      redirectTo: `${supabaseUrl}/auth/v1/verify`,
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User created:', newUser.user?.id);

    // Create profile entry
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: newUser.user!.id,
        full_name,
        client_id: tenant_id,
        is_active: true,
      });

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      // Note: User was already created in auth, but profile creation failed
      // This should be handled by the trigger, but log if it fails
    }

    // Create user_roles entry
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: newUser.user!.id,
        role,
        tenant_id,
      });

    if (roleError) {
      console.error('❌ Error creating user role:', roleError);
    }

    console.log('✅ User invitation completed successfully');

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error in invite-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
