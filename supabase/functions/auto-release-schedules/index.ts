import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[auto-release-schedules] Starting auto-release check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`[auto-release-schedules] Current time: ${now.toISOString()}`);

    // Find all schedules that:
    // 1. Are in 'waiting' status
    // 2. Are active
    // 3. Have checkout time <= now
    // 4. Belong to properties with auto_release_on_checkout enabled
    const { data: eligibleSchedules, error: fetchError } = await supabase
      .from('schedules')
      .select(`
        id,
        property_id,
        property_name,
        check_out_time,
        history
      `)
      .eq('status', 'waiting')
      .eq('is_active', true)
      .lte('check_out_time', now.toISOString());

    if (fetchError) {
      console.error('[auto-release-schedules] Error fetching schedules:', fetchError);
      throw fetchError;
    }

    console.log(`[auto-release-schedules] Found ${eligibleSchedules?.length || 0} schedules with passed checkout time`);

    if (!eligibleSchedules || eligibleSchedules.length === 0) {
      return new Response(
        JSON.stringify({ success: true, released: 0, message: 'No schedules to release' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get property IDs to check which ones have auto-release enabled
    const propertyIds = [...new Set(eligibleSchedules.map(s => s.property_id).filter(Boolean))];
    
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, auto_release_on_checkout')
      .in('id', propertyIds)
      .eq('auto_release_on_checkout', true);

    if (propError) {
      console.error('[auto-release-schedules] Error fetching properties:', propError);
      throw propError;
    }

    const autoReleasePropertyIds = new Set(properties?.map(p => p.id) || []);
    console.log(`[auto-release-schedules] Properties with auto-release enabled: ${autoReleasePropertyIds.size}`);

    // Filter schedules to only those belonging to auto-release properties
    const schedulesToRelease = eligibleSchedules.filter(
      s => s.property_id && autoReleasePropertyIds.has(s.property_id)
    );

    console.log(`[auto-release-schedules] Schedules to auto-release: ${schedulesToRelease.length}`);

    let releasedCount = 0;
    const errors: string[] = [];

    for (const schedule of schedulesToRelease) {
      try {
        // Build history event
        const existingHistory = Array.isArray(schedule.history) ? schedule.history : [];
        const historyEvent = {
          timestamp: now.toISOString(),
          team_member_id: null,
          team_member_name: 'Sistema',
          role: 'system',
          action: 'auto_release',
          from_status: 'waiting',
          to_status: 'released',
          payload: {
            trigger: 'auto_release_on_checkout',
            checkout_time: schedule.check_out_time,
          },
        };

        // Update schedule status
        const { error: updateError } = await supabase
          .from('schedules')
          .update({
            status: 'released',
            history: [...existingHistory, historyEvent],
            updated_at: now.toISOString(),
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`[auto-release-schedules] Error releasing schedule ${schedule.id}:`, updateError);
          errors.push(`Schedule ${schedule.id}: ${updateError.message}`);
          continue;
        }

        // Insert audit log
        const { error: auditError } = await supabase
          .from('auto_release_logs')
          .insert({
            schedule_id: schedule.id,
            property_id: schedule.property_id,
            action: 'liberacao_automatica_checkout',
          });

        if (auditError) {
          console.error(`[auto-release-schedules] Error creating audit log for ${schedule.id}:`, auditError);
          // Don't fail the whole operation for audit log errors
        }

        releasedCount++;
        console.log(`[auto-release-schedules] Released schedule ${schedule.id} (${schedule.property_name})`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[auto-release-schedules] Unexpected error for schedule ${schedule.id}:`, err);
        errors.push(`Schedule ${schedule.id}: ${errorMessage}`);
      }
    }
    console.log(`[auto-release-schedules] Completed. Released: ${releasedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        released: releasedCount,
        total_checked: schedulesToRelease.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[auto-release-schedules] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
