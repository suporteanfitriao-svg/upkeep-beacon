import { useEffect, useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('Service Worker registered:', swUrl);
      
      // Check for updates every 1 minute
      if (registration) {
        setInterval(() => {
          console.log('Checking for SW updates...');
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
    onNeedRefresh() {
      console.log('New version available!');
      setUpdateAvailable(true);
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });

  // Auto-update when new version is available
  useEffect(() => {
    if (needRefresh) {
      console.log('Auto-updating to new version...');
      
      // Show toast notification
      toast.info('Nova versão disponível! Atualizando...', {
        duration: 2000,
      });
      
      // Update after a short delay to let user see the notification
      setTimeout(() => {
        updateServiceWorker(true);
      }, 1500);
    }
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
