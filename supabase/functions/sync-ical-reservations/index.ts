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
  // Handle both DATE (YYYYMMDD) and DATE-TIME (YYYYMMDDTHHMMSSZ) formats
  const cleanDate = dateStr.replace(/[^0-9TZ]/g, '');
  
  if (cleanDate.length === 8) {
    // DATE only format - set to noon UTC
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1;
    const day = parseInt(cleanDate.substring(6, 8));
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }
  
  // DATE-TIME format
  const year = parseInt(cleanDate.substring(0, 4));
  const month = parseInt(cleanDate.substring(4, 6)) - 1;
  const day = parseInt(cleanDate.substring(6, 8));
  const hour = parseInt(cleanDate.substring(9, 11)) || 12;
  const minute = parseInt(cleanDate.substring(11, 13)) || 0;
  const second = parseInt(cleanDate.substring(13, 15)) || 0;
  
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function unfoldICalData(icalData: string): string {
  // iCal uses line folding: long lines are split with CRLF followed by a space/tab
  // We need to unfold these lines first
  return icalData
    .replace(/\r\n[ \t]/g, '')  // CRLF + space/tab
    .replace(/\n[ \t]/g, '');    // LF + space/tab (in case of non-standard line endings)
}

function parseICalEvents(icalData: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  
  // First, unfold the iCal data
  const unfoldedData = unfoldICalData(icalData);
  console.log(`Unfolded iCal data sample (first 500 chars): ${unfoldedData.substring(0, 500)}`);
  
  // Regex to find all VEVENT blocks
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  
  // Regex for specific fields
  const uidRegex = /UID[^:]*:(.+)/;
  const dtstartRegex = /DTSTART[^:]*:(\d{8}(?:T\d{6}Z?)?)/;
  const dtendRegex = /DTEND[^:]*:(\d{8}(?:T\d{6}Z?)?)/;
  const summaryRegex = /SUMMARY[^:]*:(.+)/;
  const descriptionRegex = /DESCRIPTION[^:]*:(.+)/;
  
  let match;
  let eventCount = 0;
  let reservedCount = 0;
  let blockedCount = 0;
  
  while ((match = eventRegex.exec(unfoldedData)) !== null) {
    eventCount++;
    const eventBlock = match[1];
    
    // Extract SUMMARY first to filter
    const summaryMatch = eventBlock.match(summaryRegex);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    
    // FILTER: Only process "Reserved" events, ignore blocked events
    if (summary !== 'Reserved') {
      blockedCount++;
      console.log(`Skipping blocked event ${eventCount}: SUMMARY = "${summary}"`);
      continue;
    }
    
    reservedCount++;
    console.log(`Processing reserved event ${eventCount}: ${eventBlock.substring(0, 150)}...`);
    
    // Extract UID
    const uidMatch = eventBlock.match(uidRegex);
    const uid = uidMatch ? uidMatch[1].trim() : null;
    
    // Extract DTSTART (check-in)
    const dtstartMatch = eventBlock.match(dtstartRegex);
    const dtstart = dtstartMatch ? parseICalDate(dtstartMatch[1]) : null;
    
    // Extract DTEND (check-out)
    const dtendMatch = eventBlock.match(dtendRegex);
    const dtend = dtendMatch ? parseICalDate(dtendMatch[1]) : null;
    
    // Extract DESCRIPTION (informational only)
    const descriptionMatch = eventBlock.match(descriptionRegex);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    console.log(`Event ${eventCount} - UID: ${uid}, DTSTART: ${dtstartMatch?.[1]}, DTEND: ${dtendMatch?.[1]}`);
    
    // Only add if we have all required fields
    if (uid && dtstart && dtend) {
      events.push({ uid, dtstart, dtend, summary, description });
      console.log(`Added reservation - UID: ${uid}, Check-in: ${dtstart.toISOString()}, Check-out: ${dtend.toISOString()}`);
    } else {
      console.log(`Skipped event ${eventCount} - missing fields. UID: ${!!uid}, DTSTART: ${!!dtstart}, DTEND: ${!!dtend}`);
    }
  }
  
  console.log(`Total events: ${eventCount}, Reserved: ${reservedCount}, Blocked/Ignored: ${blockedCount}, Valid reservations: ${events.length}`);
  
  return events;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    // Get request body (optional propertyId for single property sync)
    let propertyId: string | null = null;
    try {
      const body = await req.json();
      propertyId = body.propertyId || null;
    } catch {
      // No body or invalid JSON, sync all
    }

    console.log(`Starting iCal sync${propertyId ? ` for property ${propertyId}` : ' for all properties'}`);

    // Fetch properties with iCal URLs
    let query = supabase
      .from('properties')
      .select('id, name, address, airbnb_ical_url')
      .not('airbnb_ical_url', 'is', null);

    if (propertyId) {
      query = query.eq('id', propertyId);
    }

    const { data: properties, error: propertiesError } = await query;

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      throw propertiesError;
    }

    if (!properties || properties.length === 0) {
      console.log('No properties with iCal URLs found');
      return new Response(
        JSON.stringify({ synced: 0, message: 'Nenhuma propriedade com iCal configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalSynced = 0;
    let totalBlocked = 0;

    for (const property of properties) {
      if (!property.airbnb_ical_url) continue;

      console.log(`Syncing property: ${property.name} (${property.id})`);

      try {
        // Fetch iCal data
        const icalResponse = await fetch(property.airbnb_ical_url);
        if (!icalResponse.ok) {
          console.error(`Failed to fetch iCal for ${property.name}: ${icalResponse.status}`);
          continue;
        }

        const icalData = await icalResponse.text();
        console.log(`Fetched iCal data for ${property.name}, length: ${icalData.length}`);
        
        const events = parseICalEvents(icalData);
        console.log(`Parsed ${events.length} reservations for ${property.name}`);

        for (const event of events) {
          // Skip past events (ended more than 30 days ago)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (event.dtend < thirtyDaysAgo) {
            console.log(`Skipping past event: ${event.uid}`);
            continue;
          }

          // Upsert reservation with summary and description
          const { data: reservation, error: reservationError } = await supabase
            .from('reservations')
            .upsert({
              external_id: event.uid,
              property_id: property.id,
              check_in: event.dtstart.toISOString(),
              check_out: event.dtend.toISOString(),
              status: 'confirmed',
              listing_name: property.name,
              summary: event.summary,
              description: event.description,
              number_of_guests: 1
            }, {
              onConflict: 'external_id',
              ignoreDuplicates: false
            })
            .select()
            .single();

          if (reservationError) {
            console.error(`Error upserting reservation for ${event.uid}:`, reservationError);
            continue;
          }

          console.log(`Upserted reservation: ${reservation.id} for UID: ${event.uid}`);

          // Create or update schedule for this reservation
          const { error: scheduleError } = await supabase
            .from('schedules')
            .upsert({
              reservation_id: reservation.id,
              property_id: property.id,
              property_name: property.name,
              property_address: property.address,
              check_in_time: event.dtstart.toISOString(),
              check_out_time: event.dtend.toISOString(),
              status: 'waiting',
              priority: 'normal',
              listing_name: property.name,
              number_of_guests: 1
            }, {
              onConflict: 'reservation_id',
              ignoreDuplicates: false
            });

          if (scheduleError) {
            console.error(`Error upserting schedule for reservation ${reservation.id}:`, scheduleError);
            continue;
          }

          console.log(`Upserted schedule for reservation: ${reservation.id}`);
          totalSynced++;
        }
      } catch (error) {
        console.error(`Error processing property ${property.name}:`, error);
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
