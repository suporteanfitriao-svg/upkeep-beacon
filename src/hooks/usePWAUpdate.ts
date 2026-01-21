import { useEffect, useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePWAUpdate() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service Worker registered:', swUrl);
      
      // Check for updates immediately on load
      if (registration) {
        registration.update();
        
        // Check for updates every 60 seconds
        setInterval(() => {
          console.log('[PWA] Checking for SW updates...');
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('[PWA] New version available!');
      setShowUpdateModal(true);
    },
    onOfflineReady() {
      console.log('[PWA] App ready for offline use');
    },
  });

  // Show modal when refresh is needed
  useEffect(() => {
    if (needRefresh && !showUpdateModal) {
      console.log('[PWA] Triggering update modal...');
      setShowUpdateModal(true);
    }
  }, [needRefresh, showUpdateModal]);

  // Check for updates on visibility change (when user returns to the app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && needRefresh) {
        console.log('[PWA] App became visible with pending update');
        setShowUpdateModal(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [needRefresh]);

  const performUpdate = useCallback(async () => {
    console.log('[PWA] Performing update...');
    setIsUpdating(true);
    
    try {
      await updateServiceWorker(true);
      // The page will reload automatically
    } catch (error) {
      console.error('[PWA] Update failed:', error);
      setIsUpdating(false);
      // Force reload as fallback
      window.location.reload();
    }
  }, [updateServiceWorker]);

  const closeModal = useCallback(() => {
    setShowUpdateModal(false);
  }, []);

  return {
    showUpdateModal,
    isUpdating,
    needRefresh,
    performUpdate,
    closeModal,
  };
}
