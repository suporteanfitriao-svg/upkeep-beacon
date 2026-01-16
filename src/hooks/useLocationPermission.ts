import { useState, useEffect, useCallback } from 'react';
import { LocationPermissionState } from './useGeolocation';

const LOCATION_PERMISSION_KEY = 'location_permission_granted';
const LOCATION_PROMPT_DISMISSED_KEY = 'location_prompt_dismissed';

interface UseLocationPermissionOptions {
  autoPrompt?: boolean;
  promptDelay?: number;
}

export function useLocationPermission(options: UseLocationPermissionOptions = {}) {
  const { autoPrompt = true, promptDelay = 1000 } = options;
  
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('prompt');
  const [showModal, setShowModal] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  // Check initial permission state and stored preference
  useEffect(() => {
    const checkPermission = async () => {
      if (!navigator.geolocation) {
        setPermissionState('unavailable');
        return;
      }

      // Check if user previously granted permission (stored in localStorage)
      const storedPermission = localStorage.getItem(LOCATION_PERMISSION_KEY);
      const promptDismissed = localStorage.getItem(LOCATION_PROMPT_DISMISSED_KEY);

      if (!navigator.permissions) {
        // If permissions API not available, check localStorage
        if (storedPermission === 'granted') {
          setPermissionState('granted');
          setHasPrompted(true);
        }
        return;
      }

      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        const currentState = result.state as LocationPermissionState;
        setPermissionState(currentState);

        // If permission was granted before but now revoked, clear storage
        if (storedPermission === 'granted' && currentState === 'denied') {
          localStorage.removeItem(LOCATION_PERMISSION_KEY);
        }

        // If permission is granted, store it
        if (currentState === 'granted') {
          localStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
          setHasPrompted(true);
        }

        // If user previously dismissed prompt and permission is still prompt, don't show again
        if (promptDismissed === 'true' && currentState === 'prompt') {
          setHasPrompted(true);
        }

        // Listen for permission changes (e.g., user revokes in settings)
        result.addEventListener('change', () => {
          const newState = result.state as LocationPermissionState;
          setPermissionState(newState);
          
          if (newState === 'granted') {
            localStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
          } else if (newState === 'denied') {
            // User revoked permission - clear storage so we can prompt again
            localStorage.removeItem(LOCATION_PERMISSION_KEY);
            localStorage.removeItem(LOCATION_PROMPT_DISMISSED_KEY);
          }
        });
      } catch {
        // Fallback to localStorage if permissions API fails
        if (storedPermission === 'granted') {
          setPermissionState('granted');
          setHasPrompted(true);
        } else {
          setPermissionState('prompt');
        }
      }
    };

    checkPermission();
  }, []);

  // Auto-prompt if permission is not granted and autoPrompt is enabled
  useEffect(() => {
    if (!autoPrompt || hasPrompted) return;
    
    // Only prompt if not previously granted or dismissed
    const storedPermission = localStorage.getItem(LOCATION_PERMISSION_KEY);
    if (storedPermission === 'granted') return;
    
    if (permissionState === 'prompt' || permissionState === 'denied') {
      const timer = setTimeout(() => {
        setShowModal(true);
        setHasPrompted(true);
      }, promptDelay);
      
      return () => clearTimeout(timer);
    }
  }, [permissionState, autoPrompt, promptDelay, hasPrompted]);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionState('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionState('granted');
        // Persist permission granted
        localStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
        localStorage.removeItem(LOCATION_PROMPT_DISMISSED_KEY);
        setShowModal(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
          localStorage.removeItem(LOCATION_PERMISSION_KEY);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const dismissAndContinue = useCallback(() => {
    setShowModal(false);
    setHasPrompted(true);
    // Store that user dismissed the prompt (won't ask again unless revoked)
    localStorage.setItem(LOCATION_PROMPT_DISMISSED_KEY, 'true');
  }, []);

  return {
    permissionState,
    showModal,
    openModal,
    closeModal,
    requestPermission,
    dismissAndContinue,
    isGranted: permissionState === 'granted',
    isDenied: permissionState === 'denied',
    isUnavailable: permissionState === 'unavailable',
  };
}
