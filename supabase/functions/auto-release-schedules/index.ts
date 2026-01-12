import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// São Paulo timezone offset (UTC-3)
function getSaoPauloTime(): Date {
  const now = new Date();
  // Get UTC time
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // São Paulo is UTC-3
  return new Date(utcTime - (3 * 60 * 60 * 1000));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[auto-release-schedules] Starting auto-release check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const nowSP = getSaoPauloTime();
    console.log(`[auto-release-schedules] São Paulo time: ${nowSP.toISOString()}`);

    // Fetch all waiting schedules that are active
    const { data: waitingSchedules, error: fetchError } = await supabase
      .from('schedules')
      .select(`
        id,
        property_id,
        property_name,
        check_out_time,
        history
      `)
      .eq('status', 'waiting')
      .eq('is_active', true);

    if (fetchError) {
      console.error('[auto-release-schedules] Error fetching schedules:', fetchError);
      throw fetchError;
    }

    console.log(`[auto-release-schedules] Found ${waitingSchedules?.length || 0} waiting schedules`);

    if (!waitingSchedules || waitingSchedules.length === 0) {
      return new Response(
        JSON.stringify({ success: true, released: 0, message: 'No schedules to release' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all properties with auto-release settings
    const propertyIds = [...new Set(waitingSchedules.map(s => s.property_id).filter(Boolean))];
    
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, auto_release_on_checkout, auto_release_before_checkout_enabled, auto_release_before_checkout_minutes')
      .in('id', propertyIds);

    if (propError) {
      console.error('[auto-release-schedules] Error fetching properties:', propError);
      throw propError;
    }

    // Build property config map
    const propertyConfig = new Map<string, {
      onCheckout: boolean;
      beforeCheckout: boolean;
      minutesBefore: number;
    }>();

    properties?.forEach(p => {
      propertyConfig.set(p.id, {
        onCheckout: p.auto_release_on_checkout ?? false,
        beforeCheckout: p.auto_release_before_checkout_enabled ?? false,
        minutesBefore: p.auto_release_before_checkout_minutes ?? 60,
      });
    });

    let releasedCount = 0;
    const errors: string[] = [];
    const now = new Date();

    for (const schedule of waitingSchedules) {
      try {
        const config = propertyConfig.get(schedule.property_id);
        if (!config) continue;

        // Skip if no auto-release is enabled
        if (!config.onCheckout && !config.beforeCheckout) continue;

        const checkoutTime = new Date(schedule.check_out_time);
        let shouldRelease = false;
        let releaseAction = '';
        let minutesConfigured: number | null = null;

        // Check "before checkout" rule first (takes precedence)
        if (config.beforeCheckout) {
          const releaseTime = new Date(checkoutTime.getTime() - (config.minutesBefore * 60 * 1000));
          if (nowSP >= releaseTime) {
            shouldRelease = true;
            releaseAction = 'liberacao_automatica_antecipada';
            minutesConfigured = config.minutesBefore;
            console.log(`[auto-release-schedules] Schedule ${schedule.id}: Before checkout rule triggered (${config.minutesBefore}min before)`);
          }
        }
        // Check "on checkout" rule (only if before checkout is not enabled)
        else if (config.onCheckout) {
          if (nowSP >= checkoutTime) {
            shouldRelease = true;
            releaseAction = 'liberacao_automatica_checkout';
            console.log(`[auto-release-schedules] Schedule ${schedule.id}: On checkout rule triggered`);
          }
        }

        if (!shouldRelease) continue;

        // Build history event
        const existingHistory = Array.isArray(schedule.history) ? schedule.history : [];
        const historyEvent = {
          timestamp: now.toISOString(),
          team_member_id: null,
          team_member_name: 'Sistema',
          role: 'system',
          action: releaseAction,
          from_status: 'waiting',
          to_status: 'released',
          payload: {
            trigger: releaseAction,
            checkout_time: schedule.check_out_time,
            ...(minutesConfigured !== null && { minutes_configured: minutesConfigured }),
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
            action: releaseAction,
          });

        if (auditError) {
          console.error(`[auto-release-schedules] Error creating audit log for ${schedule.id}:`, auditError);
        }

        releasedCount++;
        console.log(`[auto-release-schedules] Released schedule ${schedule.id} (${schedule.property_name}) - Action: ${releaseAction}`);
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
        total_checked: waitingSchedules.length,
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