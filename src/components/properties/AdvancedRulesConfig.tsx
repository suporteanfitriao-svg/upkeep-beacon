import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Camera, AlertTriangle, Loader2, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedRulesConfigProps {
  propertyId: string;
  propertyName: string;
}

interface PropertyRules {
  auto_release_on_checkout: boolean;
  auto_release_before_checkout_enabled: boolean;
  auto_release_before_checkout_minutes: number;
  require_checklist: boolean;
  require_photo_per_category: boolean;
  require_photo_for_issues: boolean;
  require_photo_for_inspections: boolean;
}

export function AdvancedRulesConfig({ propertyId, propertyName }: AdvancedRulesConfigProps) {
  const [rules, setRules] = useState<PropertyRules>({
    auto_release_on_checkout: false,
    auto_release_before_checkout_enabled: false,
    auto_release_before_checkout_minutes: 60,
    require_checklist: true,
    require_photo_per_category: false,
    require_photo_for_issues: false,
    require_photo_for_inspections: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, [propertyId]);

  const fetchRules = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('auto_release_on_checkout, auto_release_before_checkout_enabled, auto_release_before_checkout_minutes, require_checklist, require_photo_per_category, require_photo_for_issues, require_photo_for_inspections')
      .eq('id', propertyId)
      .single();

    if (error) {
      console.error('Error fetching property rules:', error);
      toast.error('Erro ao carregar configurações');
    } else if (data) {
      setRules({
        auto_release_on_checkout: data.auto_release_on_checkout ?? false,
        auto_release_before_checkout_enabled: data.auto_release_before_checkout_enabled ?? false,
        auto_release_before_checkout_minutes: data.auto_release_before_checkout_minutes ?? 60,
        require_checklist: data.require_checklist ?? true,
        require_photo_per_category: data.require_photo_per_category ?? false,
        require_photo_for_issues: data.require_photo_for_issues ?? false,
        require_photo_for_inspections: data.require_photo_for_inspections ?? false,
      });
    }
    setIsLoading(false);
  };

  const handleToggle = async (key: keyof PropertyRules, value: boolean) => {
    setIsSaving(key);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('team_member_id')
        .eq('id', user.id)
        .single();

      // If enabling auto_release_before_checkout, disable auto_release_on_checkout
      const updates: Record<string, boolean | number> = { [key]: value };
      if (key === 'auto_release_before_checkout_enabled' && value) {
        updates.auto_release_on_checkout = false;
      }
      // If enabling auto_release_on_checkout, disable auto_release_before_checkout
      if (key === 'auto_release_on_checkout' && value) {
        updates.auto_release_before_checkout_enabled = false;
      }

      const { error: updateError } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId);

      if (updateError) throw updateError;

      // Log audit entry
      const { error: auditError } = await supabase
        .from('property_config_audit_logs')
        .insert({
          property_id: propertyId,
          user_id: user.id,
          team_member_id: profile?.team_member_id || null,
          role: userRole?.role || 'unknown',
          config_key: key,
          previous_value: String(rules[key]),
          new_value: String(value),
        });

      if (auditError) {
        console.error('Audit log error:', auditError);
      }

      // Update local state
      setRules(prev => ({ 
        ...prev, 
        [key]: value,
        ...(key === 'auto_release_before_checkout_enabled' && value ? { auto_release_on_checkout: false } : {}),
        ...(key === 'auto_release_on_checkout' && value ? { auto_release_before_checkout_enabled: false } : {}),
      }));
      toast.success('Configuração atualizada');
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setIsSaving(null);
    }
  };

  const handleMinutesChange = async (minutes: number) => {
    if (minutes < 1 || minutes > 180) {
      toast.error('O valor deve estar entre 1 e 180 minutos');
      return;
    }

    setIsSaving('auto_release_before_checkout_minutes');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('team_member_id')
        .eq('id', user.id)
        .single();

      const { error: updateError } = await supabase
        .from('properties')
        .update({ auto_release_before_checkout_minutes: minutes })
        .eq('id', propertyId);

      if (updateError) throw updateError;

      // Log audit entry
      await supabase
        .from('property_config_audit_logs')
        .insert({
          property_id: propertyId,
          user_id: user.id,
          team_member_id: profile?.team_member_id || null,
          role: userRole?.role || 'unknown',
          config_key: 'auto_release_before_checkout_minutes',
          previous_value: String(rules.auto_release_before_checkout_minutes),
          new_value: String(minutes),
        });

      setRules(prev => ({ ...prev, auto_release_before_checkout_minutes: minutes }));
      toast.success('Tempo de antecipação atualizado');
    } catch (error) {
      console.error('Error updating minutes:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section: Fluxo de Liberação */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Fluxo de Liberação
          </h4>
          <p className="text-xs text-muted-foreground">
            Configure quando o sistema deve liberar automaticamente as limpezas.
          </p>
        </div>

        {/* Auto-release on checkout */}
        <div className={cn(
          "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
          rules.auto_release_on_checkout ? "bg-primary/5 border-primary/30" : "bg-muted/30"
        )}>
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label htmlFor="auto-release" className="text-sm font-medium cursor-pointer">
                Liberação no horário do checkout
              </Label>
              <p className="text-xs text-muted-foreground">
                Libera automaticamente no exato horário de checkout do schedule.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving === 'auto_release_on_checkout' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <Switch
              id="auto-release"
              checked={rules.auto_release_on_checkout}
              onCheckedChange={(checked) => handleToggle('auto_release_on_checkout', checked)}
              disabled={isSaving !== null}
            />
          </div>
        </div>

        {/* Auto-release BEFORE checkout */}
        <div className={cn(
          "p-4 rounded-lg border transition-colors",
          rules.auto_release_before_checkout_enabled ? "bg-primary/5 border-primary/30" : "bg-muted/30"
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="space-y-1">
                <Label htmlFor="auto-release-before" className="text-sm font-medium cursor-pointer">
                  Liberação antecipada (antes do checkout)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Libera automaticamente X minutos antes do horário de checkout.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSaving === 'auto_release_before_checkout_enabled' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <Switch
                id="auto-release-before"
                checked={rules.auto_release_before_checkout_enabled}
                onCheckedChange={(checked) => handleToggle('auto_release_before_checkout_enabled', checked)}
                disabled={isSaving !== null}
              />
            </div>
          </div>

          {/* Minutes input - only shown when enabled */}
          {rules.auto_release_before_checkout_enabled && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <Label htmlFor="minutes-before" className="text-sm whitespace-nowrap">
                  Liberar faltando
                </Label>
                <Input
                  id="minutes-before"
                  type="number"
                  min={1}
                  max={180}
                  value={rules.auto_release_before_checkout_minutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      setRules(prev => ({ ...prev, auto_release_before_checkout_minutes: val }));
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val !== rules.auto_release_before_checkout_minutes) {
                      handleMinutesChange(val);
                    }
                  }}
                  className="w-20 text-center"
                  disabled={isSaving !== null}
                />
                <span className="text-sm text-muted-foreground">minutos para o checkout</span>
                {isSaving === 'auto_release_before_checkout_minutes' && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Exemplo: Se o checkout é às 11:00 e você configurar 60 minutos, a liberação ocorrerá às 10:00.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section: Checklist */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Checklist de Limpeza
          </h4>
          <p className="text-xs text-muted-foreground">
            Configure se o checklist é obrigatório para esta propriedade.
          </p>
        </div>

        {/* Require checklist */}
        <div className={cn(
          "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
          rules.require_checklist ? "bg-primary/5 border-primary/30" : "bg-muted/30"
        )}>
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label htmlFor="require-checklist" className="text-sm font-medium cursor-pointer">
                Exigir checklist de limpeza
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando ativado, o cleaner deve preencher o checklist durante a limpeza.
                Quando desativado, o checklist não será exibido nos cards e detalhes da tarefa.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving === 'require_checklist' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <Switch
              id="require-checklist"
              checked={rules.require_checklist}
              onCheckedChange={(checked) => handleToggle('require_checklist', checked)}
              disabled={isSaving !== null}
            />
          </div>
        </div>
      </div>

      {/* Section: Fotos do Checklist - Only show if checklist is required */}
      {rules.require_checklist && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              Fotos do Checklist
            </h4>
            <p className="text-xs text-muted-foreground">
              Configure exigências de fotos durante a limpeza.
            </p>
          </div>

          {/* Require photo per category */}
          <div className={cn(
            "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
            rules.require_photo_per_category ? "bg-primary/5 border-primary/30" : "bg-muted/30"
          )}>
            <div className="flex gap-3">
              <div className="space-y-1">
                <Label htmlFor="require-photo" className="text-sm font-medium cursor-pointer">
                  Exigir foto por categoria do checklist
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cada categoria/cômodo exige pelo menos 1 foto para finalizar a limpeza. 
                  O botão "Finalizar" ficará bloqueado até todas as fotos serem anexadas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSaving === 'require_photo_per_category' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <Switch
                id="require-photo"
                checked={rules.require_photo_per_category}
                onCheckedChange={(checked) => handleToggle('require_photo_per_category', checked)}
                disabled={isSaving !== null}
              />
            </div>
          </div>
        </div>
      )}

      {/* Section: Fotos em Avarias */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Fotos em Avarias
          </h4>
          <p className="text-xs text-muted-foreground">
            Configure exigências de fotos ao registrar avarias/manutenção.
          </p>
        </div>

        {/* Require photo for issues */}
        <div className={cn(
          "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
          rules.require_photo_for_issues ? "bg-amber-500/5 border-amber-500/30" : "bg-muted/30"
        )}>
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label htmlFor="require-photo-issues" className="text-sm font-medium cursor-pointer">
                Exigir foto ao registrar avaria
              </Label>
              <p className="text-xs text-muted-foreground">
                Ao registrar uma avaria, o sistema exigirá pelo menos 1 foto. 
                Não será possível salvar a avaria sem anexar uma foto.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving === 'require_photo_for_issues' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <Switch
              id="require-photo-issues"
              checked={rules.require_photo_for_issues}
              onCheckedChange={(checked) => handleToggle('require_photo_for_issues', checked)}
              disabled={isSaving !== null}
            />
          </div>
        </div>
      </div>

      {/* Section: Fotos em Inspeções */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4 text-purple-500" />
            Fotos em Inspeções
          </h4>
          <p className="text-xs text-muted-foreground">
            Configure exigências de fotos ao realizar inspeções.
          </p>
        </div>

        {/* Require photo for inspections */}
        <div className={cn(
          "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
          rules.require_photo_for_inspections ? "bg-purple-500/5 border-purple-500/30" : "bg-muted/30"
        )}>
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label htmlFor="require-photo-inspections" className="text-sm font-medium cursor-pointer">
                Exigir foto para finalizar inspeção
              </Label>
              <p className="text-xs text-muted-foreground">
                Ao finalizar uma inspeção, o sistema exigirá pelo menos 1 foto. 
                Não será possível finalizar a inspeção sem anexar uma foto.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving === 'require_photo_for_inspections' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <Switch
              id="require-photo-inspections"
              checked={rules.require_photo_for_inspections}
              onCheckedChange={(checked) => handleToggle('require_photo_for_inspections', checked)}
              disabled={isSaving !== null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}