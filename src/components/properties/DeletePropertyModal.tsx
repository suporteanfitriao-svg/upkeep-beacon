import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeletePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  propertyName: string;
}

const CONFIRMATION_WORD = 'EXCLUIR';

export function DeletePropertyModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  propertyName 
}: DeletePropertyModalProps) {
  const [inputValue, setInputValue] = useState('');
  
  const isConfirmEnabled = inputValue.toUpperCase() === CONFIRMATION_WORD;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setInputValue('');
      onClose();
    }
  };

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center text-xl">Excluir propriedade?</DialogTitle>
          <DialogDescription className="text-center">
            Esta ação é <strong className="text-destructive">irreversível</strong>. Ao excluir a propriedade{' '}
            <strong className="text-foreground">"{propertyName}"</strong>, todas as reservas, agendamentos e 
            configurações associados serão permanentemente removidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-sm text-muted-foreground text-center">
              Para confirmar, digite <strong className="text-destructive font-mono">{CONFIRMATION_WORD}</strong> abaixo:
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation-input" className="sr-only">
              Digite {CONFIRMATION_WORD} para confirmar
            </Label>
            <Input
              id="confirmation-input"
              type="text"
              placeholder={`Digite ${CONFIRMATION_WORD}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="text-center font-mono uppercase tracking-widest"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
          >
            Excluir Permanentemente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
