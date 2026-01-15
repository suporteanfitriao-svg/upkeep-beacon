import { useState, useEffect, useCallback } from 'react';

export type LocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationState {
  position: GeolocationPosition | null;
  error: string | null;
  loading: boolean;
  permissionState: LocationPermissionState;
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Check if user is within a certain distance of a target location
 */
export function isWithinDistance(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  maxDistanceMeters: number
): { withinRange: boolean; distance: number } {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  return {
    withinRange: distance <= maxDistanceMeters,
    distance,
  };
}

/**
 * Check current permission state for geolocation
 */
async function checkPermissionState(): Promise<LocationPermissionState> {
  if (!navigator.geolocation) {
    return 'unavailable';
  }

  if (!navigator.permissions) {
    // Permissions API not supported, assume prompt
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state as LocationPermissionState;
  } catch {
    return 'prompt';
  }
}

/**
 * Hook to get user's current geolocation with permission state
 */
export function useGeolocation(options?: PositionOptions): GeolocationState & {
  refresh: () => void;
  requestPermission: () => void;
} {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
    permissionState: 'prompt',
  });

  // Check permission state on mount and when it changes
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    const updatePermissionState = async () => {
      const permState = await checkPermissionState();
      setState((prev) => ({ ...prev, permissionState: permState }));
    };

    const setupPermissionListener = async () => {
      if (!navigator.permissions) return;

      try {
        permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        
        const handleChange = () => {
          setState((prev) => ({ 
            ...prev, 
            permissionState: permissionStatus?.state as LocationPermissionState || 'prompt' 
          }));
        };

        permissionStatus.addEventListener('change', handleChange);
      } catch {
        // Permissions API not fully supported
      }
    };

    updatePermissionState();
    setupPermissionListener();

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', () => {});
      }
    };
  }, []);

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: 'Geolocalização não é suportada neste dispositivo',
        loading: false,
        permissionState: 'unavailable',
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
          error: null,
          loading: false,
          permissionState: 'granted',
        });
      },
      (error) => {
        let errorMessage = 'Erro ao obter localização';
        let permState: LocationPermissionState = 'prompt';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de localização negada';
            permState = 'denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível. Verifique se o GPS está ativado.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado ao obter localização. Tente novamente.';
            break;
        }
        setState((prev) => ({
          position: null,
          error: errorMessage,
          loading: false,
          permissionState: permState,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        ...options,
      }
    );
  }, [options]);

  const requestPermission = useCallback(() => {
    getPosition();
  }, [getPosition]);

  useEffect(() => {
    getPosition();
  }, [getPosition]);

  return {
    ...state,
    refresh: getPosition,
    requestPermission,
  };
}

/**
 * Hook to check if user is within distance of a property
 */
export function useProximityCheck(
  propertyLat: number | null | undefined,
  propertyLon: number | null | undefined,
  maxDistanceMeters: number = 500
) {
  const { position, error, loading, refresh, permissionState, requestPermission } = useGeolocation();

  const result = {
    isWithinRange: false,
    distance: null as number | null,
    canCheck: false,
    error: error,
    loading,
    refresh,
    permissionState,
    requestPermission,
    propertyHasCoordinates: propertyLat != null && propertyLon != null,
  };

  // If property doesn't have coordinates, allow by default (bypass check)
  if (propertyLat == null || propertyLon == null) {
    return {
      ...result,
      isWithinRange: true,
      canCheck: false,
      error: null,
    };
  }

  if (loading) {
    return result;
  }

  if (error || !position) {
    return {
      ...result,
      canCheck: false,
    };
  }

  const { withinRange, distance } = isWithinDistance(
    position.latitude,
    position.longitude,
    propertyLat,
    propertyLon,
    maxDistanceMeters
  );

  return {
    ...result,
    isWithinRange: withinRange,
    distance,
    canCheck: true,
    error: null,
  };
}
