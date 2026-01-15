import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Share, Plus, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [showIOSDialog, setShowIOSDialog] = useState(false);
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
    // iOS - show minimal dialog with instructions
    if (isIOS) {
      setShowIOSDialog(true);
      return;
    }

    // Android/Chrome - direct install with one click
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

  const InstallButton = () => (
    <Button 
      onClick={handleInstall}
      size="sm"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Instalar App
    </Button>
  );

  if (variant === 'button') {
    return (
      <>
        <Button 
          onClick={handleInstall}
          variant="outline"
          size="sm"
          className={`gap-2 ${className}`}
        >
          <Download className="h-4 w-4" />
          Instalar
        </Button>
        
        {/* iOS Instructions Dialog */}
        <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
          <DialogContent className="max-w-xs rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center">Instalar no iPhone</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Toque em <Share className="h-4 w-4 inline mx-1" /> Compartilhar</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Selecione <Plus className="h-4 w-4 inline mx-1" /> Tela de Início</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowIOSDialog(false)} className="w-full">
              Entendi
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <button
          onClick={handleInstall}
          className={`flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors ${className}`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Adicionar à tela inicial</span>
        </button>
        
        {/* iOS Instructions Dialog */}
        <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
          <DialogContent className="max-w-xs rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center">Instalar no iPhone</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Toque em <Share className="h-4 w-4 inline mx-1" /> Compartilhar</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Selecione <Plus className="h-4 w-4 inline mx-1" /> Tela de Início</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowIOSDialog(false)} className="w-full">
              Entendi
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Card variant (default) - simplified
  return (
    <>
      <div className={`bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              Instalar na tela inicial
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesso rápido com um toque
            </p>
          </div>

          <InstallButton />
        </div>
      </div>

      {/* iOS Instructions Dialog */}
      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Instalar no iPhone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Toque em <Share className="h-4 w-4 inline mx-1" /> Compartilhar</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Selecione <Plus className="h-4 w-4 inline mx-1" /> Tela de Início</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowIOSDialog(false)} className="w-full">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
