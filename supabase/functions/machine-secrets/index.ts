import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const MachineSecretsSchema = z.object({
  action: z.enum(['create', 'decrypt', 'update']),
  password: z.string().min(1).max(500).optional(),
  secretId: z.string().uuid().optional(),
  name: z.string().min(1).max(100).optional(),
  machineId: z.string().uuid().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      console.error('❌ Invalid user token');
      throw new Error('Unauthorized');
    }

    // Get user's role and tenant information
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      console.error('❌ Could not fetch user role:', roleError?.message);
      throw new Error('Unauthorized - no role found');
    }

    const isSuperAdmin = userRole.role === 'super_admin';
    const isOtimizzoUser = userRole.tenant_id === '00000000-0000-0000-0000-000000000001';

    // Validate input using Zod schema
    const rawData = await req.json();
    const validationResult = MachineSecretsSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error('❌ Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, password, secretId, name, machineId } = validationResult.data;

    console.log(`🔐 Machine Secrets: Action=${action}, User=${user.email}, IsSuperAdmin=${isSuperAdmin}`);

    // SECURITY: Helper function to verify tenant access to a machine's secret
    async function verifySecretAccess(secretId: string): Promise<void> {
      // Super admins and Otimizzo users can access all secrets
      if (isSuperAdmin || isOtimizzoUser) {
        console.log('✅ Access granted: privileged user');
        return;
      }

      // Find the machine that owns this secret
      const { data: machine, error: machineError } = await supabaseAdmin
        .from('machines')
        .select('client_id')
        .eq('root_password_secret_id', secretId)
        .single();

      if (machineError || !machine) {
        console.error('❌ Machine not found for secret:', secretId);
        throw new Error('Secret not found or access denied');
      }

      // Verify user's tenant matches the machine's client
      if (machine.client_id !== userRole!.tenant_id) {
        console.error(`❌ Tenant mismatch: User tenant=${userRole!.tenant_id}, Machine client=${machine.client_id}`);
        throw new Error('Access denied - not authorized for this machine');
      }

      console.log('✅ Access granted: tenant match verified');
    }

    // SECURITY: Helper function to verify tenant access to a machine by ID
    async function verifyMachineAccess(machineId: string): Promise<void> {
      // Super admins and Otimizzo users can access all machines
      if (isSuperAdmin || isOtimizzoUser) {
        console.log('✅ Access granted: privileged user');
        return;
      }

      // Verify user's tenant matches the machine's client
      const { data: machine, error: machineError } = await supabaseAdmin
        .from('machines')
        .select('client_id')
        .eq('id', machineId)
        .single();

      if (machineError || !machine) {
        console.error('❌ Machine not found:', machineId);
        throw new Error('Machine not found');
      }

      if (machine.client_id !== userRole!.tenant_id) {
        console.error(`❌ Tenant mismatch: User tenant=${userRole!.tenant_id}, Machine client=${machine.client_id}`);
        throw new Error('Access denied - not authorized for this machine');
      }

      console.log('✅ Access granted: tenant match verified');
    }

    if (action === 'create') {
      // SECURITY: Verify user can create secrets for this machine
      if (machineId) {
        await verifyMachineAccess(machineId);
      } else if (!isSuperAdmin && !isOtimizzoUser) {
        // Non-privileged users must provide machineId for context
        throw new Error('Machine ID required for secret creation');
      }

      // Criar secret no Vault
      const { data, error } = await supabaseAdmin.rpc('create_machine_secret', {
        secret_value: password,
        secret_name: name
      });

      if (error) {
        console.error('❌ Error creating secret:', error);
        throw error;
      }

      console.log(`✅ Secret created: ${data}`);
      return new Response(
        JSON.stringify({ secretId: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'decrypt') {
      if (!secretId) {
        throw new Error('Secret ID required');
      }

      // SECURITY: Verify user has access to this secret's machine
      await verifySecretAccess(secretId);

      // Recuperar senha do Vault
      const { data, error } = await supabaseAdmin.rpc('decrypt_machine_secret', {
        secret_id: secretId
      });

      if (error) {
        console.error('❌ Error decrypting secret:', error);
        throw error;
      }

      console.log(`✅ Secret decrypted successfully`);
      return new Response(
        JSON.stringify({ password: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      if (!secretId) {
        throw new Error('Secret ID required');
      }

      // SECURITY: Verify user has access to this secret's machine
      await verifySecretAccess(secretId);

      // Atualizar secret existente
      const { error } = await supabaseAdmin.rpc('update_machine_secret', {
        secret_id: secretId,
        new_value: password
      });

      if (error) {
        console.error('❌ Error updating secret:', error);
        throw error;
      }

      console.log(`✅ Secret updated successfully`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('❌ Machine Secrets Error:', error.message);
    const safeMessages: Record<string, string> = {
      'Unauthorized': 'Unauthorized',
      'Unauthorized - no role found': 'Unauthorized',
      'Secret ID required': 'Secret ID required',
      'Machine ID required for secret creation': 'Machine ID required',
      'Invalid action': 'Invalid action',
    };
    const safeMsg = safeMessages[error.message] || 'An error occurred while processing your request';
    return new Response(
      JSON.stringify({ error: safeMsg }),
      { 
        status: error.message?.includes('Unauthorized') ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
