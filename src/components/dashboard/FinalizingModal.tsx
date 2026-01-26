import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinalizingModalProps {
  isOpen: boolean;
  isComplete?: boolean;
}

export function FinalizingModal({ isOpen, isComplete = false }: FinalizingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-sm border-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Finalizando</DialogTitle>
        <DialogDescription className="sr-only">Aguarde enquanto a limpeza é finalizada</DialogDescription>
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="relative">
            <div className={cn(
              "absolute inset-0 rounded-full blur-xl animate-pulse",
              isComplete ? "bg-emerald-500/20" : "bg-primary/20"
            )} />
            <div className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-full",
              isComplete ? "bg-emerald-500/10" : "bg-primary/10"
            )}>
              {isComplete ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              ) : (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className={cn(
              "text-base font-bold",
              isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
            )}>
              {isComplete ? 'Limpeza Finalizada!' : 'Finalizando...'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isComplete ? 'Todos os dados foram salvos com sucesso.' : 'Salvando checklist e observações...'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
