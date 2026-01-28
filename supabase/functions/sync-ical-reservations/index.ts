import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ICalEvent {
  uid: string;
  dtstart: Date;
  dtend: Date;
  summary: string;
  description: string;
}

function parseICalDate(dateStr: string): Date {
  const cleanDate = dateStr.replace(/[^0-9TZ]/g, '');
  
  if (cleanDate.length === 8) {
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1;
    const day = parseInt(cleanDate.substring(6, 8));
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }
  
  const year = parseInt(cleanDate.substring(0, 4));
  const month = parseInt(cleanDate.substring(4, 6)) - 1;
  const day = parseInt(cleanDate.substring(6, 8));
  const hour = parseInt(cleanDate.substring(9, 11)) || 12;
  const minute = parseInt(cleanDate.substring(11, 13)) || 0;
  const second = parseInt(cleanDate.substring(13, 15)) || 0;
  
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function unfoldICalData(icalData: string): string {
  return icalData
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '');
}

function parseICalEvents(icalData: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const unfoldedData = unfoldICalData(icalData);
  
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  const uidRegex = /UID[^:]*:(.+)/;
  const dtstartRegex = /DTSTART[^:]*:(\d{8}(?:T\d{6}Z?)?)/;
  const dtendRegex = /DTEND[^:]*:(\d{8}(?:T\d{6}Z?)?)/;
  const summaryRegex = /SUMMARY[^:]*:(.+)/;
  const descriptionRegex = /DESCRIPTION[^:]*:(.+)/;
  
  let match;
  let totalEvents = 0;
  let skippedEvents = 0;
  
  while ((match = eventRegex.exec(unfoldedData)) !== null) {
    const eventBlock = match[1];
    totalEvents++;
    
    const summaryMatch = eventBlock.match(summaryRegex);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    const summaryLower = summary.toLowerCase();
    
    // ============================================================
    // UNIVERSAL BLOCK DETECTION - Works for all iCal sources
    // ============================================================
    // 
    // BLOCK PATTERNS (to IGNORE - these are NOT real reservations):
    // 
    // AIRBNB:
    //   - "Airbnb (Not available)" - Manual block by owner
    //   - "Not available" - Calendar block
    //   - "Blocked" - Owner/admin block
    //
    // BOOKING.COM:
    //   - "Not available" - Block
    //   - "Closed" - Property closed
    //   - "Closed - Not available" - Combined block
    //
    // VRBO / HOMEAWAY:
    //   - "Blocked" - Manual block
    //   - "Owner block" - Owner blocked dates
    //   - "Owner Hold" - Owner reservation
    //   - "Hold" - General hold
    //
    // GENERAL (Multi-platform):
    //   - "Unavailable" - Generic block
    //   - "Not available" - Generic block  
    //   - "Indisponível" - Portuguese block
    //   - "Bloqueado" - Portuguese block
    //   - "Bloqueado pelo proprietário" - PT owner block
    //   - "Maintenance" - Maintenance block
    //   - "Manutenção" - PT maintenance
    //   - "Blocked by" - Any "blocked by X" pattern
    //
    // ============================================================
    
    const blockPatterns = [
      // English blocks
      'not available',
      'unavailable', 
      'blocked',
      'owner block',
      'owner hold',
      'hold',
      'closed',
      'maintenance',
      // Portuguese blocks
      'indisponível',
      'bloqueado',
      'manutenção',
      // Partial matches (will match "Blocked by owner", "Airbnb (Not available)", etc.)
      'blocked by',
      '(not available)',
    ];
    
    const isBlock = blockPatterns.some(pattern => summaryLower.includes(pattern));
    
    if (isBlock) {
      skippedEvents++;
      console.log(`[BLOCK SKIPPED] "${summary}" - matches block pattern`);
      continue;
    }
    
    // ============================================================
    // RESERVATION DETECTION - Accept real bookings
    // ============================================================
    //
    // REAL RESERVATIONS (to IMPORT):
    //
    // AIRBNB:
    //   - "Reserved" - Confirmed reservation
    //   - "Reservado" - PT confirmed reservation
    //   - Events with DESCRIPTION containing guest info
    //
    // BOOKING.COM:
    //   - Usually shows guest name in SUMMARY
    //   - "Booking.com" prefix sometimes
    //
    // VRBO:
    //   - Usually shows guest name in SUMMARY
    //   - May have "VRBO" or confirmation number
    //
    // GENERAL:
    //   - Any event with non-empty summary that doesn't match block patterns
    //   - Events with description (contains booking details)
    //
    // ============================================================
    
    const reservationPatterns = ['reserved', 'reservado', 'booking', 'confirmed', 'confirmado'];
    const isExplicitReservation = reservationPatterns.some(pattern => summaryLower.includes(pattern));
    
    // Get description to check for guest info
    const descriptionMatch = eventBlock.match(descriptionRegex);
    const hasDescription = descriptionMatch && descriptionMatch[1].trim().length > 0;
    
    // Check if description contains explicit reservation data (Airbnb patterns)
    const descriptionContent = descriptionMatch ? descriptionMatch[1].trim() : '';
    const hasReservationData = descriptionContent.includes('Reservation URL') || 
                               descriptionContent.includes('Phone Number') ||
                               descriptionContent.includes('Código de acesso') ||
                               descriptionContent.includes('PIN:');
    
    // REGRA 1: Accept ONLY if:
    // 1. SUMMARY contains explicit reservation terms (reserved, booking, confirmed, etc.), OR
    // 2. DESCRIPTION contains explicit reservation data (URL, phone, PIN, etc.)
    // ❌ NOT accepting events just because SUMMARY is non-empty
    const isValidReservation = isExplicitReservation || hasReservationData;
    
    if (!isValidReservation) {
      skippedEvents++;
      console.log(`[EMPTY SKIPPED] Event with no summary or description`);
      continue;
    }
    
    console.log(`[RESERVATION] "${summary}" - importing as valid reservation`);
    
    const uidMatch = eventBlock.match(uidRegex);
    const uid = uidMatch ? uidMatch[1].trim() : null;
    
    const dtstartMatch = eventBlock.match(dtstartRegex);
    const dtstart = dtstartMatch ? parseICalDate(dtstartMatch[1]) : null;
    
    const dtendMatch = eventBlock.match(dtendRegex);
    const dtend = dtendMatch ? parseICalDate(dtendMatch[1]) : null;
    
    // descriptionMatch already extracted above for validation
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    if (uid && dtstart && dtend) {
      console.log(`Parsed event: UID=${uid.substring(0, 30)}..., start=${dtstart.toISOString()}, end=${dtend.toISOString()}, summary="${summary}"`);
      events.push({ uid, dtstart, dtend, summary, description });
    } else {
      console.log(`Skipping invalid event: uid=${!!uid}, dtstart=${!!dtstart}, dtend=${!!dtend}`);
    }
  }
  
  console.log(`iCal parsing complete: ${totalEvents} total events, ${events.length} valid reservations, ${skippedEvents} skipped`);
  
  return events;
}

// Extract access password from iCal description
// Airbnb includes "Phone Number (Last 4 Digits): XXXX" in the description
function extractAccessPassword(description: string): string | null {
  if (!description) return null;
  
  // Pattern 1: "Phone Number (Last 4 Digits): XXXX"
  const phonePattern = /Phone Number \(Last 4 Digits\):\s*(\d{4})/i;
  const phoneMatch = description.match(phonePattern);
  if (phoneMatch) {
    console.log(`[PASSWORD] Extracted phone last 4 digits: ${phoneMatch[1]}`);
    return phoneMatch[1];
  }
  
  // Pattern 2: "Código de acesso: XXXX" or "Access code: XXXX"
  const codePattern = /(?:Código de acesso|Access code|Code|Código):\s*(\d{4,8})/i;
  const codeMatch = description.match(codePattern);
  if (codeMatch) {
    console.log(`[PASSWORD] Extracted access code: ${codeMatch[1]}`);
    return codeMatch[1];
  }
  
  // Pattern 3: "PIN: XXXX"
  const pinPattern = /PIN:\s*(\d{4,8})/i;
  const pinMatch = description.match(pinPattern);
  if (pinMatch) {
    console.log(`[PASSWORD] Extracted PIN: ${pinMatch[1]}`);
    return pinMatch[1];
  }
  
  return null;
}

// Calculate priority based on check-in date proximity
function calculatePriority(checkInDate: Date): string {
  const now = new Date();
  const diffMs = checkInDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours <= 24) {
    return 'high'; // Within 24 hours
  } else if (diffHours <= 72) {
    return 'normal'; // Within 3 days (was 'medium' - constraint uses 'normal')
  }
  return 'low'; // More than 3 days
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    // Allow requests authenticated with service_role_key (for cron jobs and system calls)
    const isServiceRoleRequest = token === supabaseKey;
    
    // Allow requests with anon_key (for cron jobs that can only use anon key)
    const isCronRequest = token === anonKey;
    
    if (isServiceRoleRequest) {
      console.log('Service role authenticated - automatic/cron sync');
    } else if (isCronRequest) {
      console.log('Anon key authenticated - cron job sync');
    } else {
      // For user-initiated requests, verify authentication only (allow all authenticated users)
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Não autorizado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has any valid role (admin, manager, cleaner, or superadmin)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roleError || !roleData || roleData.length === 0) {
        console.log(`User ${user.id} attempted sync without any role`);
        return new Response(
          JSON.stringify({ error: 'Acesso negado - usuário não tem permissão' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const userRoles = roleData.map(r => r.role).join(', ');
      console.log(`User ${user.id} (${userRoles}) triggered manual sync`);
    }

    let sourceId: string | null = null;
    let propertyId: string | null = null;
    try {
      const body = await req.json();
      sourceId = body.sourceId || null;
      propertyId = body.propertyId || null;
    } catch {
      // No body
    }

    console.log(`Starting iCal sync${sourceId ? ` for source ${sourceId}` : propertyId ? ` for property ${propertyId}` : ' for all sources'}`);

    // Fetch iCal sources
    let query = supabase
      .from('property_ical_sources')
      .select(`
        id,
        property_id,
        ical_url,
        custom_name,
        properties (
          id,
          name,
          address,
          default_check_in_time,
          default_check_out_time
        )
      `);

    if (sourceId) {
      query = query.eq('id', sourceId);
    } else if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
      throw sourcesError;
    }

    if (!sources || sources.length === 0) {
      console.log('No iCal sources found');
      return new Response(
        JSON.stringify({ synced: 0, message: 'Nenhuma fonte iCal configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalSynced = 0;

    for (const source of sources) {
      const property = source.properties as any;
      if (!property) continue;

      // Validate mandatory default times - block sync if not configured
      if (!property.default_check_in_time || !property.default_check_out_time) {
        console.log(`Skipping source ${source.id}: Property ${property.name} missing default times`);
        
        await supabase
          .from('property_ical_sources')
          .update({
            last_sync_at: new Date().toISOString(),
            last_error: 'Horários padrão não configurados na propriedade',
            reservations_count: 0
          })
          .eq('id', source.id);
        
        continue;
      }

      console.log(`Syncing source: ${source.custom_name || source.id} for property ${property.name}`);

      let lastError: string | null = null;
      let reservationsCount = 0;

      try {
        const icalResponse = await fetch(source.ical_url);
        if (!icalResponse.ok) {
          lastError = `HTTP ${icalResponse.status}`;
          console.error(`Failed to fetch iCal for source ${source.id}: ${lastError}`);
        } else {
          const icalData = await icalResponse.text();
          const events = parseICalEvents(icalData);
          console.log(`Parsed ${events.length} reservations for ${source.custom_name || source.id}`);
          
          // Log full parsed events JSON for debugging (complete DESCRIPTION field)
          console.log(`[ICAL_RAW_DATA] ${property.name}:`, JSON.stringify(events.map(e => ({
            uid: e.uid,
            dtstart: e.dtstart.toISOString(),
            dtend: e.dtend.toISOString(),
            summary: e.summary,
            description_full: e.description || null,
            extracted_password: extractAccessPassword(e.description)
          })), null, 2));

          // Track UIDs from this sync to detect removed reservations
          const currentUIDs: string[] = [];

          for (const event of events) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (event.dtend < thirtyDaysAgo) {
              continue;
            }

            // Use original UID from Airbnb (consistent across syncs)
            const externalId = event.uid;
            currentUIDs.push(externalId);

            const { data: reservation, error: reservationError } = await supabase
              .from('reservations')
              .upsert({
                external_id: externalId,
                property_id: property.id,
                check_in: event.dtstart.toISOString(),
                check_out: event.dtend.toISOString(),
                status: 'confirmed',
                listing_name: source.custom_name || property.name,
                summary: event.summary,
                description: event.description,
                number_of_guests: 1,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'external_id',
                ignoreDuplicates: false
              })
              .select()
              .single();

            if (reservationError) {
              console.error(`Error upserting reservation:`, reservationError);
              continue;
            }

            // Apply default check-in/out times from property (in local time, not UTC)
            const checkInTime = property.default_check_in_time || '14:00:00';
            const checkOutTime = property.default_check_out_time || '11:00:00';

            // Parse the time strings
            const [checkInHour, checkInMin] = checkInTime.split(':').map(Number);
            const [checkOutHour, checkOutMin] = checkOutTime.split(':').map(Number);

            // Create dates with the correct local time (Brazil is UTC-3)
            const checkInDate = new Date(event.dtstart);
            // Set the hours directly without UTC conversion - add 3 hours to compensate for UTC-3
            checkInDate.setUTCHours(checkInHour + 3, checkInMin, 0, 0);

            const checkOutDate = new Date(event.dtend);
            checkOutDate.setUTCHours(checkOutHour + 3, checkOutMin, 0, 0);

            // Calculate priority based on check-in proximity
            const priority = calculatePriority(checkInDate);

            // Extract access password from reservation description
            const accessPassword = extractAccessPassword(event.description);

            // Check if schedule already exists
            const { data: existingSchedule } = await supabase
              .from('schedules')
              .select('id, status, check_in_time, check_out_time, access_password')
              .eq('reservation_id', reservation.id)
              .maybeSingle();

            // Only update priority if schedule is still in waiting status
            const shouldUpdatePriority = !existingSchedule || existingSchedule.status === 'waiting';

            const scheduleData: any = {
              reservation_id: reservation.id,
              property_id: property.id,
              property_name: property.name,
              property_address: property.address,
              listing_name: source.custom_name || property.name,
              number_of_guests: 1
            };

            // Set access_password if extracted and not already set (preserve manual passwords)
            if (accessPassword && (!existingSchedule || !existingSchedule.access_password)) {
              scheduleData.access_password = accessPassword;
              console.log(`[SCHEDULE] Setting access_password: ${accessPassword} for ${property.name}`);
            }

            // For NEW schedules: set all times and status
            // For EXISTING schedules in 'waiting' status: update times if reservation dates changed
            // For schedules in other statuses (released, cleaning, completed): skip update entirely
            if (!existingSchedule) {
              // New schedule - set everything
              scheduleData.check_in_time = checkInDate.toISOString();
              scheduleData.check_out_time = checkOutDate.toISOString();
              scheduleData.status = 'waiting';
              scheduleData.priority = priority;
              
              // Initialize history with schedule_created event using reservation date
              // This captures when the reservation was originally created in the iCal source
              scheduleData.history = [{
                timestamp: reservation.created_at || new Date().toISOString(),
                team_member_id: 'system',
                team_member_name: 'Sistema',
                role: 'system',
                action: 'schedule_created',
                from_status: null,
                to_status: 'waiting',
                payload: {
                  source: 'ical_sync',
                  reservation_check_in: event.dtstart.toISOString(),
                  reservation_check_out: event.dtend.toISOString(),
                  listing_name: source.custom_name || property.name,
                }
              }];

              const { error: scheduleError } = await supabase
                .from('schedules')
                .insert(scheduleData);

              if (scheduleError) {
                console.error(`Error inserting schedule:`, scheduleError);
                continue;
              }
            } else if (existingSchedule.status === 'waiting') {
              // Existing schedule in waiting status - update times if reservation dates changed
              // This handles cases where the reservation was modified in Airbnb
              const existingCheckIn = new Date(existingSchedule.check_in_time);
              const existingCheckOut = new Date(existingSchedule.check_out_time);
              
              // Check if dates are different (comparing only the date portion)
              const checkInChanged = existingCheckIn.toISOString().slice(0, 10) !== checkInDate.toISOString().slice(0, 10);
              const checkOutChanged = existingCheckOut.toISOString().slice(0, 10) !== checkOutDate.toISOString().slice(0, 10);
              
              if (checkInChanged || checkOutChanged) {
                console.log(`Updating schedule times for reservation ${reservation.id}: check_in changed=${checkInChanged}, check_out changed=${checkOutChanged}`);
                scheduleData.check_in_time = checkInDate.toISOString();
                scheduleData.check_out_time = checkOutDate.toISOString();
              } else {
                // No changes needed, keep existing times
                scheduleData.check_in_time = existingSchedule.check_in_time;
                scheduleData.check_out_time = existingSchedule.check_out_time;
              }
              
              scheduleData.priority = priority;

              const { error: scheduleError } = await supabase
                .from('schedules')
                .update(scheduleData)
                .eq('id', existingSchedule.id);

              if (scheduleError) {
                console.error(`Error updating schedule:`, scheduleError);
                continue;
              }
            }
            // For released/cleaning/completed: don't update at all (preserve everything)

            reservationsCount++;
            totalSynced++;
          }

          // ============================================================
          // CLEANUP: Remove reservations no longer in iCal
          // ============================================================
          // Find reservations from this source that are NOT in the current sync
          // Only delete if:
          // 1. The reservation was synced from iCal (has external_id)
          // 2. The schedule is still in 'waiting' status (don't delete active cleanings)
          
          if (currentUIDs.length > 0) {
            // Get all reservations for this property that have external_id (from iCal)
            const { data: existingReservations } = await supabase
              .from('reservations')
              .select('id, external_id, check_out')
              .eq('property_id', property.id)
              .not('external_id', 'is', null);

            if (existingReservations) {
              for (const existingRes of existingReservations) {
                // Skip if this reservation is in the current sync
                if (currentUIDs.includes(existingRes.external_id!)) {
                  continue;
                }

                // Check if schedule exists and its status
                const { data: schedule } = await supabase
                  .from('schedules')
                  .select('id, status')
                  .eq('reservation_id', existingRes.id)
                  .maybeSingle();

                // Only delete if schedule is in 'waiting' status or doesn't exist
                // Don't delete released/cleaning/completed schedules
                if (schedule && schedule.status !== 'waiting') {
                  console.log(`[CLEANUP SKIPPED] Reservation ${existingRes.external_id} - schedule in ${schedule.status} status`);
                  continue;
                }

                console.log(`[CLEANUP] Removing reservation ${existingRes.external_id} - no longer in iCal`);

                // Delete the schedule first (if exists)
                if (schedule) {
                  const { error: deleteScheduleError } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('id', schedule.id);

                  if (deleteScheduleError) {
                    console.error(`Error deleting schedule:`, deleteScheduleError);
                    continue;
                  }
                }

                // Delete the reservation
                const { error: deleteReservationError } = await supabase
                  .from('reservations')
                  .delete()
                  .eq('id', existingRes.id);

                if (deleteReservationError) {
                  console.error(`Error deleting reservation:`, deleteReservationError);
                }
              }
            }
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`Error processing source ${source.id}:`, error);
      }

      // Update source with sync status
      await supabase
        .from('property_ical_sources')
        .update({
          last_sync_at: new Date().toISOString(),
          last_error: lastError,
          reservations_count: reservationsCount
        })
        .eq('id', source.id);
    }

    // Update priorities for all waiting schedules based on current date
    const { data: waitingSchedules } = await supabase
      .from('schedules')
      .select('id, check_in_time')
      .eq('status', 'waiting');

    if (waitingSchedules) {
      for (const schedule of waitingSchedules) {
        const newPriority = calculatePriority(new Date(schedule.check_in_time));
        await supabase
          .from('schedules')
          .update({ priority: newPriority })
          .eq('id', schedule.id);
      }
    }

    console.log(`Sync completed. Total reservations synced: ${totalSynced}`);

    return new Response(
      JSON.stringify({ synced: totalSynced, message: 'Sincronização concluída' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in sync-ical-reservations:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
