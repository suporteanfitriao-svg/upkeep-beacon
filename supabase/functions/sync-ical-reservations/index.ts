import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ICalEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: Date;
  dtend: Date;
}

function parseICalDate(dateStr: string): Date {
  // Handle both DATE and DATE-TIME formats
  // DATE format: YYYYMMDD
  // DATE-TIME format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const cleanDate = dateStr.replace(/[^0-9TZ]/g, '');
  
  if (cleanDate.length === 8) {
    // DATE only format
    const year = parseInt(cleanDate.substring(0, 4));
    const month = parseInt(cleanDate.substring(4, 6)) - 1;
    const day = parseInt(cleanDate.substring(6, 8));
    return new Date(Date.UTC(year, month, day, 12, 0, 0)); // Set to noon UTC
  }
  
  // DATE-TIME format
  const year = parseInt(cleanDate.substring(0, 4));
  const month = parseInt(cleanDate.substring(4, 6)) - 1;
  const day = parseInt(cleanDate.substring(6, 8));
  const hour = parseInt(cleanDate.substring(9, 11)) || 0;
  const minute = parseInt(cleanDate.substring(11, 13)) || 0;
  const second = parseInt(cleanDate.substring(13, 15)) || 0;
  
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function parseICalEvents(icalData: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalData.split(/\r?\n/);
  let currentEvent: Partial<ICalEvent> | null = null;
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    // Handle line folding (lines starting with space or tab are continuations)
    if (line.startsWith(' ') || line.startsWith('\t')) {
      currentValue += line.substring(1);
      continue;
    }

    // Process previous key-value if exists
    if (currentKey && currentEvent) {
      switch (currentKey) {
        case 'UID':
          currentEvent.uid = currentValue;
          break;
        case 'SUMMARY':
          currentEvent.summary = currentValue;
          break;
        case 'DESCRIPTION':
          currentEvent.description = currentValue;
          break;
        case 'DTSTART':
        case 'DTSTART;VALUE=DATE':
          currentEvent.dtstart = parseICalDate(currentValue);
          break;
        case 'DTEND':
        case 'DTEND;VALUE=DATE':
          currentEvent.dtend = parseICalDate(currentValue);
          break;
      }
    }

    // Parse new line
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    currentKey = line.substring(0, colonIndex);
    currentValue = line.substring(colonIndex + 1);

    // Handle key with parameters (e.g., DTSTART;VALUE=DATE)
    const semiIndex = currentKey.indexOf(';');
    if (semiIndex !== -1) {
      const baseKey = currentKey.substring(0, semiIndex);
      if (baseKey === 'DTSTART' || baseKey === 'DTEND') {
        currentKey = currentKey; // Keep the full key for date parsing
      }
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent as ICalEvent);
      }
      currentEvent = null;
    }
  }

  return events;
}

function extractGuestName(summary: string, description: string): string {
  // Common patterns in Airbnb iCal
  // Summary often contains: "Reserved - Guest Name" or just "Guest Name"
  // Sometimes it's "Blocked" for owner blocks
  
  if (summary.toLowerCase().includes('blocked') || summary.toLowerCase().includes('not available')) {
    return 'Bloqueado';
  }

  // Try to extract from summary
  const reservedMatch = summary.match(/Reserved\s*[-–]\s*(.+)/i);
  if (reservedMatch) {
    return reservedMatch[1].trim();
  }

  // Check if summary is just a name
  if (summary && !summary.toLowerCase().includes('reservation') && summary.length < 100) {
    return summary.trim();
  }

  return summary || 'Hóspede';
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
        const events = parseICalEvents(icalData);

        console.log(`Found ${events.length} events for ${property.name}`);

        for (const event of events) {
          // Skip past events (ended more than 30 days ago)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (event.dtend < thirtyDaysAgo) continue;

          const guestName = extractGuestName(event.summary, event.description);
          const externalId = `airbnb_${event.uid}`;

          // Upsert reservation
          const { data: reservation, error: reservationError } = await supabase
            .from('reservations')
            .upsert({
              external_id: externalId,
              property_id: property.id,
              guest_name: guestName,
              check_in: event.dtstart.toISOString(),
              check_out: event.dtend.toISOString(),
              summary: event.summary,
              description: event.description,
              status: 'confirmed'
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

          // Create or update schedule for this reservation
          const { error: scheduleError } = await supabase
            .from('schedules')
            .upsert({
              reservation_id: reservation.id,
              property_id: property.id,
              property_name: property.name,
              property_address: property.address,
              guest_name: guestName,
              check_in_time: event.dtstart.toISOString(),
              check_out_time: event.dtend.toISOString(),
              status: 'waiting',
              priority: 'normal'
            }, {
              onConflict: 'reservation_id',
              ignoreDuplicates: false
            });

          if (scheduleError) {
            console.error(`Error upserting schedule:`, scheduleError);
            continue;
          }

          totalSynced++;
        }
      } catch (error) {
        console.error(`Error processing property ${property.name}:`, error);
      }
    }

    console.log(`Sync completed. Total synced: ${totalSynced}`);

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
