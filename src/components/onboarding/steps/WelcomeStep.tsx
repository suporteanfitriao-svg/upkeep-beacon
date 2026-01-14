import { Button } from '@/components/ui/button';
import { RefreshCw, ClipboardList, Package, Timer, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="max-w-2xl w-full text-center">
      <div className="mb-8 flex justify-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
          <Sparkles className="h-8 w-8" />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">
        Bem-vindo! Vamos configurar sua operação.
      </h2>
      <p className="text-muted-foreground text-lg mb-12 max-w-lg mx-auto leading-relaxed">
        Siga os passos abaixo para preparar suas propriedades para gestão em poucos minutos.
      </p>

      <div className="bg-muted/30 border border-border rounded-2xl p-8 mb-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="flex flex-col gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground text-sm">Sincronização Ágil</h4>
          <p className="text-xs text-muted-foreground leading-normal">
            Importe seus anúncios e calendários automaticamente.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-border md:border-l md:pl-6">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground text-sm">Gestão de Checklists</h4>
          <p className="text-xs text-muted-foreground leading-normal">
            Defina processos claros para sua equipe de limpeza.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-border md:border-l md:pl-6">
          <Package className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground text-sm">Controle de Inventário</h4>
          <p className="text-xs text-muted-foreground leading-normal">
            Tenha visibilidade total dos itens de cada propriedade.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button 
          onClick={onNext}
          size="lg"
          className="px-10 py-6 text-lg font-bold shadow-lg shadow-primary/20"
        >
          Iniciar Configuração
        </Button>
        <p className="text-muted-foreground text-xs flex items-center gap-1.5">
          <Timer className="h-4 w-4" />
          Leva aproximadamente 10 minutos
        </p>
      </div>
    </div>
  );
}
