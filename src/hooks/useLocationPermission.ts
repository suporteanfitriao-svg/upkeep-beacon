import { useState, useEffect, useCallback } from 'react';
import { LocationPermissionState } from './useGeolocation';

interface UseLocationPermissionOptions {
  autoPrompt?: boolean;
  promptDelay?: number;
}

export function useLocationPermission(options: UseLocationPermissionOptions = {}) {
  const { autoPrompt = true, promptDelay = 1000 } = options;
  
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('prompt');
  const [showModal, setShowModal] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  // Check initial permission state
  useEffect(() => {
    const checkPermission = async () => {
      if (!navigator.geolocation) {
        setPermissionState('unavailable');
        return;
      }

      if (!navigator.permissions) {
        setPermissionState('prompt');
        return;
      }

      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(result.state as LocationPermissionState);

        // Listen for permission changes
        result.addEventListener('change', () => {
          setPermissionState(result.state as LocationPermissionState);
        });
      } catch {
        setPermissionState('prompt');
      }
    };

    checkPermission();
  }, []);

  // Auto-prompt if permission is not granted and autoPrompt is enabled
  useEffect(() => {
    if (!autoPrompt || hasPrompted) return;
    
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
        setShowModal(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
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
