import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Share, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AddToHomeScreenProps {
  variant?: 'card' | 'button' | 'inline';
  className?: string;
}

export function AddToHomeScreen({ variant = 'card', className = '' }: AddToHomeScreenProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For Android/Chrome, capture the beforeinstallprompt event
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
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  // Don't show on desktop or if already installed
  if (!isMobile || isInstalled) return null;

  // Don't show if not on iOS and no install prompt available
  if (!isIOS && !deferredPrompt) return null;

  if (variant === 'button') {
    return (
      <Button 
        onClick={handleInstall}
        variant="outline"
        size="sm"
        className={`gap-2 ${className}`}
      >
        <Download className="h-4 w-4" />
        Instalar App
      </Button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={handleInstall}
        className={`flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors ${className}`}
      >
        <Smartphone className="h-4 w-4" />
        <span>Adicionar à tela inicial</span>
      </button>
    );
  }

  // Card variant (default)
  return (
    <div className={`bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 ${className}`}>
      {showIOSInstructions && isIOS ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm">
              Como instalar no iPhone/iPad
            </h3>
          </div>
          
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
              <span className="flex items-center gap-1">
                Toque no ícone <Share className="h-3 w-3 inline" /> Compartilhar
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
              <span className="flex items-center gap-1">
                Role e toque em <Plus className="h-3 w-3 inline" /> "Adicionar à Tela de Início"
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
              <span>Toque em "Adicionar" no canto superior direito</span>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowIOSInstructions(false)}
            className="w-full mt-2 text-xs"
          >
            Entendi
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              Instalar na tela inicial
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesso rápido direto do seu celular
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleInstall}
            className="gap-1.5 flex-shrink-0"
          >
            <Download className="h-4 w-4" />
            Instalar
          </Button>
        </div>
      )}
    </div>
  );
}
