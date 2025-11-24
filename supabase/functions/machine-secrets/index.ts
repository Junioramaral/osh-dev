import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, password, secretId, name } = await req.json();

    console.log(`🔐 Machine Secrets: Action=${action}, User=${user.email}`);

    if (action === 'create') {
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
