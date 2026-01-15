import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeocodeResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  displayName?: string;
  error?: string;
}

/**
 * Hook for geocoding property addresses automatically
 */
export function usePropertyGeocoding() {
  /**
   * Geocode a single property by its ID
   * Will fetch the address from the database and update coordinates
   */
  const geocodeProperty = useCallback(async (propertyId: string): Promise<GeocodeResult> => {
    try {
      console.log('[usePropertyGeocoding] Geocoding property:', propertyId);
      
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          action: 'on_property_update',
          propertyId,
        },
      });

      if (error) {
        console.error('[usePropertyGeocoding] Function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.log('[usePropertyGeocoding] Geocoding failed:', data.message || data.error);
        return { success: false, error: data.message || data.error };
      }

      console.log('[usePropertyGeocoding] Geocoded successfully:', data);
      return {
        success: true,
        latitude: data.latitude,
        longitude: data.longitude,
        displayName: data.displayName,
      };
    } catch (error) {
      console.error('[usePropertyGeocoding] Error:', error);
      return { success: false, error: 'Erro ao geocodificar endereço' };
    }
  }, []);

  /**
   * Geocode an address directly (without property ID)
   */
  const geocodeAddress = useCallback(async (address: string): Promise<GeocodeResult> => {
    try {
      console.log('[usePropertyGeocoding] Geocoding address:', address);
      
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          action: 'geocode_single',
          address,
        },
      });

      if (error) {
        console.error('[usePropertyGeocoding] Function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Endereço não encontrado' };
      }

      return {
        success: true,
        latitude: data.latitude,
        longitude: data.longitude,
        displayName: data.displayName,
      };
    } catch (error) {
      console.error('[usePropertyGeocoding] Error:', error);
      return { success: false, error: 'Erro ao geocodificar endereço' };
    }
  }, []);

  /**
   * Geocode all properties that are missing coordinates
   */
  const geocodeAllMissing = useCallback(async (): Promise<{
    total: number;
    success: number;
    failed: number;
  }> => {
    try {
      console.log('[usePropertyGeocoding] Geocoding all missing...');
      
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          action: 'geocode_all_missing',
        },
      });

      if (error) {
        console.error('[usePropertyGeocoding] Function error:', error);
        toast.error('Erro ao geocodificar propriedades');
        return { total: 0, success: 0, failed: 0 };
      }

      if (data.success > 0) {
        toast.success(`${data.success} propriedade(s) geocodificada(s) com sucesso`);
      }
      if (data.failed > 0) {
        toast.warning(`${data.failed} propriedade(s) não puderam ser geocodificadas`);
      }

      return {
        total: data.total,
        success: data.success,
        failed: data.failed,
      };
    } catch (error) {
      console.error('[usePropertyGeocoding] Error:', error);
      toast.error('Erro ao geocodificar propriedades');
      return { total: 0, success: 0, failed: 0 };
    }
  }, []);

  return {
    geocodeProperty,
    geocodeAddress,
    geocodeAllMissing,
  };
}
