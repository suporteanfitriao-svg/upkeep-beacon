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
  
  while ((match = eventRegex.exec(unfoldedData)) !== null) {
    const eventBlock = match[1];
    
    const summaryMatch = eventBlock.match(summaryRegex);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    
    if (summary !== 'Reserved') {
      continue;
    }
    
    const uidMatch = eventBlock.match(uidRegex);
    const uid = uidMatch ? uidMatch[1].trim() : null;
    
    const dtstartMatch = eventBlock.match(dtstartRegex);
    const dtstart = dtstartMatch ? parseICalDate(dtstartMatch[1]) : null;
    
    const dtendMatch = eventBlock.match(dtendRegex);
    const dtend = dtendMatch ? parseICalDate(dtendMatch[1]) : null;
    
    const descriptionMatch = eventBlock.match(descriptionRegex);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    if (uid && dtstart && dtend) {
      events.push({ uid, dtstart, dtend, summary, description });
    }
  }
  
  return events;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

          for (const event of events) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (event.dtend < thirtyDaysAgo) {
              continue;
            }

            // Use source id + uid to ensure uniqueness across sources
            const externalId = `${source.id}_${event.uid}`;

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

            // Apply default check-in/out times from property
            const checkInTime = property.default_check_in_time || '14:00:00';
            const checkOutTime = property.default_check_out_time || '11:00:00';

            // Combine date with time
            const checkInDate = new Date(event.dtstart);
            const [checkInHour, checkInMin] = checkInTime.split(':').map(Number);
            checkInDate.setUTCHours(checkInHour, checkInMin, 0, 0);

            const checkOutDate = new Date(event.dtend);
            const [checkOutHour, checkOutMin] = checkOutTime.split(':').map(Number);
            checkOutDate.setUTCHours(checkOutHour, checkOutMin, 0, 0);

            const { error: scheduleError } = await supabase
              .from('schedules')
              .upsert({
                reservation_id: reservation.id,
                property_id: property.id,
                property_name: property.name,
                property_address: property.address,
                check_in_time: checkInDate.toISOString(),
                check_out_time: checkOutDate.toISOString(),
                status: 'waiting',
                priority: 'normal',
                listing_name: source.custom_name || property.name,
                number_of_guests: 1
              }, {
                onConflict: 'reservation_id',
                ignoreDuplicates: false
              });

            if (scheduleError) {
              console.error(`Error upserting schedule:`, scheduleError);
              continue;
            }

            reservationsCount++;
            totalSynced++;
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
