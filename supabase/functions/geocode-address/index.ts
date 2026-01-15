import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Geocode an address using OpenStreetMap Nominatim API (free)
 */
async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  console.log(`[geocode] Geocoding address: ${address}`);
  
  // Clean and encode the address
  const cleanAddress = address.trim();
  if (!cleanAddress) {
    console.log('[geocode] Empty address provided');
    return null;
  }

  const encodedAddress = encodeURIComponent(cleanAddress);
  
  // Use Nominatim API (OpenStreetMap) - free and no API key required
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=br`;
  
  console.log(`[geocode] Calling Nominatim API: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'UpkeepBeacon/1.0 (property-management-app)',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });

  if (!response.ok) {
    console.error(`[geocode] Nominatim API error: ${response.status}`);
    return null;
  }

  const results = await response.json();
  console.log(`[geocode] Nominatim results:`, JSON.stringify(results));

  if (!results || results.length === 0) {
    console.log('[geocode] No results found for address');
    return null;
  }

  const result = results[0];
  return {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    displayName: result.display_name,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, propertyId, address } = await req.json();

    console.log(`[geocode] Action: ${action}, PropertyId: ${propertyId}, Address: ${address}`);

    if (action === 'geocode_single') {
      // Geocode a single address (can be called from frontend or after property update)
      if (!address) {
        return new Response(
          JSON.stringify({ error: 'Address is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await geocodeAddress(address);
      
      if (!result) {
        return new Response(
          JSON.stringify({ error: 'Could not geocode address', success: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If propertyId is provided, update the property directly
      if (propertyId) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({
            latitude: result.latitude,
            longitude: result.longitude,
          })
          .eq('id', propertyId);

        if (updateError) {
          console.error('[geocode] Error updating property:', updateError);
          return new Response(
            JSON.stringify({ error: 'Error updating property coordinates' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[geocode] Updated property ${propertyId} with coordinates: ${result.latitude}, ${result.longitude}`);
      }

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'geocode_all_missing') {
      // Geocode all properties that have an address but no coordinates
      const { data: properties, error: fetchError } = await supabase
        .from('properties')
        .select('id, address, name')
        .not('address', 'is', null)
        .or('latitude.is.null,longitude.is.null');

      if (fetchError) {
        console.error('[geocode] Error fetching properties:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Error fetching properties' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[geocode] Found ${properties?.length || 0} properties to geocode`);

      const results = {
        total: properties?.length || 0,
        success: 0,
        failed: 0,
        details: [] as Array<{ id: string; name: string; success: boolean; error?: string }>,
      };

      for (const property of properties || []) {
        if (!property.address) {
          results.failed++;
          results.details.push({ 
            id: property.id, 
            name: property.name, 
            success: false, 
            error: 'No address' 
          });
          continue;
        }

        // Respect rate limiting - Nominatim asks for max 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1100));

        const geocodeResult = await geocodeAddress(property.address);
        
        if (!geocodeResult) {
          results.failed++;
          results.details.push({ 
            id: property.id, 
            name: property.name, 
            success: false, 
            error: 'Geocoding failed' 
          });
          continue;
        }

        const { error: updateError } = await supabase
          .from('properties')
          .update({
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude,
          })
          .eq('id', property.id);

        if (updateError) {
          results.failed++;
          results.details.push({ 
            id: property.id, 
            name: property.name, 
            success: false, 
            error: 'Database update failed' 
          });
        } else {
          results.success++;
          results.details.push({ 
            id: property.id, 
            name: property.name, 
            success: true 
          });
          console.log(`[geocode] Successfully geocoded: ${property.name}`);
        }
      }

      return new Response(
        JSON.stringify(results),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle property update trigger - geocode when address changes
    if (action === 'on_property_update') {
      if (!propertyId) {
        return new Response(
          JSON.stringify({ error: 'Property ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch the property's current address
      const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('address, name')
        .eq('id', propertyId)
        .single();

      if (fetchError || !property) {
        console.error('[geocode] Error fetching property:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Property not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!property.address) {
        return new Response(
          JSON.stringify({ success: false, message: 'No address to geocode' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const geocodeResult = await geocodeAddress(property.address);

      if (!geocodeResult) {
        return new Response(
          JSON.stringify({ success: false, message: 'Could not geocode address' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase
        .from('properties')
        .update({
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
        })
        .eq('id', propertyId);

      if (updateError) {
        console.error('[geocode] Error updating property:', updateError);
        return new Response(
          JSON.stringify({ error: 'Error updating coordinates' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[geocode] Updated ${property.name} coordinates: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);

      return new Response(
        JSON.stringify({ success: true, ...geocodeResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[geocode] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});