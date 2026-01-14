import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Share, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const { user, loading } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Capture install prompt for Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mb-6 shadow-lg">
          <img 
            src="/icons/icon-192x192.png" 
            alt="CleanOps" 
            className="w-20 h-20 rounded-2xl"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">CleanOps</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Dashboard de Limpeza e Manutenção
        </p>

        {isInstalled ? (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">
            <p className="font-medium">✓ App já instalado!</p>
            <p className="text-sm mt-1">Abra o CleanOps na sua tela inicial.</p>
          </div>
        ) : (
          <>
            {/* Android Install */}
            {(isAndroid || deferredPrompt) && (
              <Button
                size="lg"
                onClick={handleInstall}
                disabled={!deferredPrompt}
                className="gap-2 mb-4 px-8"
              >
                <Download className="h-5 w-5" />
                Instalar App
              </Button>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <div className="bg-card rounded-2xl p-6 max-w-sm shadow-sm border border-border">
                <h2 className="font-semibold text-foreground mb-4">
                  Como instalar no iPhone/iPad:
                </h2>
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Share className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">1. Toque em Compartilhar</p>
                      <p className="text-sm text-muted-foreground">No Safari, toque no ícone de compartilhar</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">2. Adicionar à Tela de Início</p>
                      <p className="text-sm text-muted-foreground">Role para baixo e toque nesta opção</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">3. Confirme</p>
                      <p className="text-sm text-muted-foreground">Toque em "Adicionar" para instalar</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop/Other */}
            {!isIOS && !isAndroid && !deferredPrompt && (
              <div className="bg-card rounded-2xl p-6 max-w-sm shadow-sm border border-border">
                <h2 className="font-semibold text-foreground mb-2">
                  Instalação no Desktop
                </h2>
                <p className="text-sm text-muted-foreground">
                  No Chrome, clique no ícone de instalação na barra de endereço ou use o menu do navegador.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <a 
          href="/auth" 
          className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
        >
          Continuar no navegador
          <ChevronRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
