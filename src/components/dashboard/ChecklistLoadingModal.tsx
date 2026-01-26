import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ChecklistLoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export function ChecklistLoadingModal({ 
  isOpen, 
  message = 'Carregando checklist...' 
}: ChecklistLoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-sm border-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Carregando</DialogTitle>
        <DialogDescription className="sr-only">Aguarde enquanto o checklist é carregado</DialogDescription>
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {message}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aguarde um momento...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
