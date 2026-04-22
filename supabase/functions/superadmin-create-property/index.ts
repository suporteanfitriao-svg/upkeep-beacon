import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PropertyPayload {
  owner_user_id: string;
  name: string;
  address?: string;
  default_check_in_time?: string;
  default_check_out_time?: string;
  max_guests?: number;
  default_guests?: number;
  airbnb_ical_url?: string;
  ical_sync_start_date?: string; // YYYY-MM-DD
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate caller is superadmin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'superadmin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden: superadmin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as PropertyPayload;
    if (!payload?.owner_user_id || !payload?.name) {
      return new Response(JSON.stringify({ error: 'owner_user_id and name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify owner exists
    const { data: ownerCheck } = await admin
      .from('owner_profiles')
      .select('user_id')
      .eq('user_id', payload.owner_user_id)
      .maybeSingle();
    if (!ownerCheck) {
      return new Response(JSON.stringify({ error: 'Owner profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: created, error: insertErr } = await admin
      .from('properties')
      .insert({
        owner_user_id: payload.owner_user_id,
        name: payload.name.trim(),
        address: payload.address?.trim() || null,
        default_check_in_time: payload.default_check_in_time || '14:00:00',
        default_check_out_time: payload.default_check_out_time || '11:00:00',
        max_guests: payload.max_guests ?? 10,
        default_guests: payload.default_guests ?? 1,
        airbnb_ical_url: payload.airbnb_ical_url?.trim() || null,
      })
      .select('id, name, property_code')
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If iCal URL provided, also create a property_ical_sources row so sync picks it up
    const trimmedIcal = payload.airbnb_ical_url?.trim();
    if (trimmedIcal && created?.id) {
      const { error: icalErr } = await admin.from('property_ical_sources').insert({
        property_id: created.id,
        ical_url: trimmedIcal,
        sync_start_date: payload.ical_sync_start_date || null,
      });
      if (icalErr) {
        console.error('Failed to create ical source:', icalErr.message);
      }
    }

    return new Response(JSON.stringify({ success: true, property: created }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
