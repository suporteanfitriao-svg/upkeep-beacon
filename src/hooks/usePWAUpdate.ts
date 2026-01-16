import { useEffect, useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true, // Register immediately
    onRegisteredSW(swUrl, registration) {
      console.log('Service Worker registered:', swUrl);
      
      // Check for updates immediately on load
      if (registration) {
        registration.update();
        
        // Check for updates every 30 seconds for more aggressive updates
        setInterval(() => {
          console.log('Checking for SW updates...');
          registration.update();
        }, 30 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('New version available! Forcing update...');
      setUpdateAvailable(true);
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });

  // Force immediate update when new version is available
  useEffect(() => {
    if (needRefresh) {
      console.log('Auto-updating to new version immediately...');
      
      // Show brief toast and update immediately
      toast.info('Atualizando...', {
        duration: 1000,
      });
      
      // Update almost immediately
      setTimeout(() => {
        updateServiceWorker(true);
      }, 500);
    }
  }, [needRefresh, updateServiceWorker]);

  // Check for updates on visibility change (when user returns to the app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App became visible, checking for updates...');
        // Trigger a check by reloading if there's a pending update
        if (needRefresh) {
          updateServiceWorker(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [needRefresh, updateServiceWorker]);

  const forceUpdate = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  return {
    updateAvailable,
    forceUpdate,
    needRefresh,
  };
}
