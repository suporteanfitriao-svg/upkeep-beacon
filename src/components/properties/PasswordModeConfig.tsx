import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PropertyPasswordMode, usePropertyPassword } from '@/hooks/usePropertyPassword';

interface PasswordModeConfigProps {
  propertyId: string;
  propertyName: string;
}

export function PasswordModeConfig({ propertyId, propertyName }: PasswordModeConfigProps) {
  const { passwordMode, isLoading, updatePasswordMode } = usePropertyPassword({ propertyId });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleModeChange = async (value: string) => {
    setIsUpdating(true);
    const success = await updatePasswordMode(value as PropertyPasswordMode);
    setIsUpdating(false);

    if (success) {
      toast.success(`Modo de senha alterado para: ${value === 'ical' ? 'iCal (por reserva)' : 'Manual (por limpeza)'}`);
    } else {
      toast.error('Erro ao alterar modo de senha');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-32 mb-2"></div>
        <div className="h-8 bg-muted rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-lg">vpn_key</span>
        <Label className="text-sm font-semibold">Modo de Senha do Imóvel</Label>
      </div>
      
      <RadioGroup
        value={passwordMode}
        onValueChange={handleModeChange}
        disabled={isUpdating}
        className="space-y-2"
      >
        <label 
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            passwordMode === 'ical' 
              ? "border-primary bg-primary/5" 
              : "border-transparent bg-background hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value="ical" id={`ical-${propertyId}`} className="mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Modo A: Senha do iCal</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usa a senha vinda da reserva importada. Cada reserva pode ter senha diferente.
            </p>
          </div>
        </label>
        
        <label 
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            passwordMode === 'manual' 
              ? "border-primary bg-primary/5" 
              : "border-transparent bg-background hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value="manual" id={`manual-${propertyId}`} className="mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Modo B: Senha Manual</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Admin/gestor define manualmente a senha para cada tarefa de limpeza.
            </p>
          </div>
        </label>
      </RadioGroup>

      {isUpdating && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          Salvando...
        </p>
      )}
    </div>
  );
}
