import React, { memo } from 'react';
import { MapPin, Settings, X, AlertTriangle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocationPermissionState } from '@/hooks/useGeolocation';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionState: LocationPermissionState;
  onRequestPermission: () => void;
  onContinueWithoutLocation?: () => void;
}

const LocationPermissionModal = memo(function LocationPermissionModal({
  isOpen,
  onClose,
  permissionState,
  onRequestPermission,
  onContinueWithoutLocation,
}: LocationPermissionModalProps) {
  const isDenied = permissionState === 'denied';
  const isUnavailable = permissionState === 'unavailable';

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
            <p className="text-sm text-muted-foreground">
              Este dispositivo ou navegador não possui suporte à geolocalização. 
              Para usar os recursos de proximidade, tente acessar de outro dispositivo 
              ou navegador mais recente.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Fechar
              </Button>
              {onContinueWithoutLocation && (
                <Button onClick={onContinueWithoutLocation} className="flex-1">
                  Continuar sem localização
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isDenied) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/10">
                <MapPin className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <DialogTitle>Permissão de Localização Necessária</DialogTitle>
                <DialogDescription>
                  A localização foi bloqueada nas configurações
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
                    Por que precisamos da sua localização?
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    A verificação de proximidade garante que você está no local 
                    correto antes de iniciar ou finalizar uma limpeza.
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

  // Prompt state - asking for permission
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Permitir Acesso à Localização</DialogTitle>
              <DialogDescription>
                Precisamos da sua localização para verificar proximidade
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Para iniciar ou finalizar limpezas, precisamos verificar se você 
              está próximo do imóvel. Sua localização é usada apenas para esta 
              verificação e não é armazenada.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={onRequestPermission} className="w-full gap-2">
              <Navigation className="h-4 w-4" />
              Permitir Localização
            </Button>
            <Button onClick={onClose} variant="ghost" className="w-full">
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default LocationPermissionModal;
