import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PropertyPasswordMode, usePropertyPassword } from '@/hooks/usePropertyPassword';

interface PasswordModeConfigProps {
  propertyId: string;
  propertyName: string;
}

export function PasswordModeConfig({ propertyId, propertyName }: PasswordModeConfigProps) {
  const { passwordMode, globalPassword, isLoading, updatePasswordMode, updateGlobalPassword } = usePropertyPassword({ propertyId });
  const [isUpdating, setIsUpdating] = useState(false);
  const [localGlobalPassword, setLocalGlobalPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setLocalGlobalPassword(globalPassword || '');
  }, [globalPassword]);

  const handleModeChange = async (value: string) => {
    setIsUpdating(true);
    const success = await updatePasswordMode(value as PropertyPasswordMode);
    setIsUpdating(false);

    if (success) {
      const modeLabels: Record<string, string> = {
        'ical': 'iCal (por reserva)',
        'manual': 'Manual (por limpeza)',
        'global': 'Global (senha fixa do imóvel)'
      };
      toast.success(`Modo de senha alterado para: ${modeLabels[value]}`);
    } else {
      toast.error('Erro ao alterar modo de senha');
    }
  };

  const handleSaveGlobalPassword = async () => {
    setIsSavingPassword(true);
    const success = await updateGlobalPassword(localGlobalPassword);
    setIsSavingPassword(false);

    if (success) {
      toast.success('Senha global salva com sucesso');
    } else {
      toast.error('Erro ao salvar senha global');
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

        <label 
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            passwordMode === 'global' 
              ? "border-primary bg-primary/5" 
              : "border-transparent bg-background hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value="global" id={`global-${propertyId}`} className="mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Modo C: Senha Global</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uma senha fixa para todas as tarefas deste imóvel.
            </p>
          </div>
        </label>
      </RadioGroup>

      {/* Global password input - only visible when global mode is selected */}
      {passwordMode === 'global' && (
        <div className="mt-4 p-3 bg-background rounded-lg border space-y-3">
          <Label htmlFor={`global-password-${propertyId}`} className="text-sm font-medium">
            Senha Global do Imóvel
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id={`global-password-${propertyId}`}
                type={showPassword ? 'text' : 'password'}
                value={localGlobalPassword}
                onChange={(e) => setLocalGlobalPassword(e.target.value)}
                placeholder="Digite a senha de acesso"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <Button
              onClick={handleSaveGlobalPassword}
              disabled={isSavingPassword || localGlobalPassword === (globalPassword || '')}
              size="sm"
            >
              {isSavingPassword ? (
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta senha será usada para todas as limpezas deste imóvel.
          </p>
        </div>
      )}

      {isUpdating && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          Salvando...
        </p>
      )}
    </div>
  );
}
