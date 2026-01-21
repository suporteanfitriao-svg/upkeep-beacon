import React, { memo } from 'react';
import { MapPin, Settings, X, AlertTriangle, Navigation, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocationPermissionState } from '@/hooks/useGeolocation';

interface LocationRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionState: LocationPermissionState;
  onRequestPermission: () => void;
  distance?: number | null;
  isLoading?: boolean;
  onRetry?: () => void;
  error?: string | null;
}

/**
 * Modal that FORCES location permission before allowing cleaning to start.
 * No option to continue without location - it's mandatory.
 */
const LocationRequiredModal = memo(
  React.forwardRef<HTMLDivElement, LocationRequiredModalProps>(function LocationRequiredModal(
    {
      isOpen,
      onClose,
      permissionState,
      onRequestPermission,
      distance,
      isLoading,
      onRetry,
      error,
    },
    ref,
  ) {
  const isDenied = permissionState === 'denied';
  const isUnavailable = permissionState === 'unavailable';
  const isPrompt = permissionState === 'prompt';

  const getInstructionsForDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      return {
        title: 'Como ativar no iPhone/iPad',
        steps: [
          'Abra o app "Ajustes" do seu dispositivo',
          'Role para baixo e toque em "Privacidade e Segurança"',
          'Toque em "Serviços de Localização"',
          'Certifique-se de que está ativado',
          'Encontre o navegador (Safari/Chrome) na lista',
          'Selecione "Durante o Uso" ou "Sempre"',
          'Volte ao app e atualize a página',
        ],
      };
    }

    if (isAndroid) {
      return {
        title: 'Como ativar no Android',
        steps: [
          'Abra as "Configurações" do seu dispositivo',
          'Toque em "Apps" ou "Aplicativos"',
          'Encontre e toque no navegador que está usando',
          'Toque em "Permissões"',
          'Toque em "Localização"',
          'Selecione "Permitir apenas durante uso do app"',
          'Volte ao app e atualize a página',
        ],
      };
    }

    return {
      title: 'Como ativar a localização',
      steps: [
        'Acesse as configurações do seu navegador',
        'Procure por "Configurações do site" ou "Permissões"',
        'Encontre a opção "Localização"',
        'Permita o acesso para este site',
        'Atualize a página',
      ],
    };
  };

  const instructions = getInstructionsForDevice();

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent ref={ref} className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Navigation className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div>
                <DialogTitle>Verificando Localização</DialogTitle>
                <DialogDescription>
                  Aguarde enquanto verificamos sua posição...
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="mt-4 text-sm text-muted-foreground">Obtendo sua localização...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Too far from property
  if (distance !== null && distance !== undefined && distance > 500) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent ref={ref} className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10">
                <ShieldAlert className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <DialogTitle>Você está longe do imóvel</DialogTitle>
                <DialogDescription>
                  Aproxime-se para iniciar a limpeza
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-4xl font-bold text-red-600">{formatDistance(distance)}</span>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Você precisa estar a no máximo <strong>500 metros</strong> do imóvel para iniciar a limpeza.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Por que precisamos verificar sua localização?
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    A verificação de proximidade garante a segurança do processo, 
                    confirmando que você está no local correto antes de iniciar a limpeza.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              {onRetry && (
                <Button onClick={onRetry} className="w-full gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Verificar Novamente
                </Button>
              )}
              <Button onClick={onClose} variant="outline" className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent ref={ref} className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <DialogTitle>Erro de Localização</DialogTitle>
                <DialogDescription>
                  Não foi possível obter sua localização
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={onRequestPermission} className="w-full gap-2">
                <Navigation className="h-4 w-4" />
                Tentar Novamente
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Unavailable state
  if (isUnavailable) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <DialogTitle>Localização Indisponível</DialogTitle>
                <DialogDescription>
                  Seu dispositivo não suporta geolocalização
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Localização é obrigatória para iniciar limpeza
                  </p>
                  <p className="text-red-700 dark:text-red-300 mt-1">
                    Este dispositivo ou navegador não possui suporte à geolocalização. 
                    Para iniciar limpezas, use um dispositivo com GPS ativado.
                  </p>
                </div>
              </div>
            </div>
            
            <Button onClick={onClose} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Denied state - show instructions
  if (isDenied) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/10">
                <ShieldAlert className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <DialogTitle>Localização Obrigatória</DialogTitle>
                <DialogDescription>
                  Habilite a localização para continuar
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200">
                    A localização foi bloqueada
                  </p>
                  <p className="text-red-700 dark:text-red-300 mt-1">
                    Você <strong>não pode iniciar a limpeza</strong> sem permitir o acesso à sua localização. 
                    Isso é necessário para confirmar que você está no imóvel correto.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {instructions.title}
              </h4>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={onRequestPermission} className="w-full gap-2">
                <Navigation className="h-4 w-4" />
                Já Habilitei - Verificar Novamente
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Prompt state - asking for permission (mandatory)
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Localização Obrigatória</DialogTitle>
              <DialogDescription>
                Permita o acesso à localização para iniciar a limpeza
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Por que é obrigatório?
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  A verificação de proximidade garante que você está no local correto 
                  (máximo 500m do imóvel) antes de iniciar a limpeza. 
                  Sua localização <strong>não é armazenada</strong>.
                </p>
              </div>
            </div>
          </div>
          
          <Button onClick={onRequestPermission} className="w-full gap-2" size="lg">
            <Navigation className="h-5 w-5" />
            Permitir Localização
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Clique no botão acima e <strong>permita</strong> quando o navegador solicitar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
  })
);

export default LocationRequiredModal;
