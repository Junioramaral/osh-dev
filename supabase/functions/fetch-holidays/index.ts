import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { year } = await req.json();
    if (!year || typeof year !== 'number') {
      return new Response(JSON.stringify({ error: "year is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/BR`);
    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `Nager API error: ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const holidays = await response.json();

    const formatted = holidays.map((h: any) => ({
      date: h.date,
      name: h.localName || h.name,
      fixed: h.fixed,
      type: h.types?.join(', ') || 'Public',
    }));

    return new Response(JSON.stringify({ holidays: formatted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
