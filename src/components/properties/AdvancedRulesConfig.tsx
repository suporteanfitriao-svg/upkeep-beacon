import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Camera, Loader2 } from 'lucide-react';

interface AdvancedRulesConfigProps {
  propertyId: string;
  propertyName: string;
}

interface PropertyRules {
  auto_release_on_checkout: boolean;
  require_photo_per_category: boolean;
}

export function AdvancedRulesConfig({ propertyId, propertyName }: AdvancedRulesConfigProps) {
  const [rules, setRules] = useState<PropertyRules>({
    auto_release_on_checkout: false,
    require_photo_per_category: false,
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
      .select('auto_release_on_checkout, require_photo_per_category')
      .eq('id', propertyId)
      .single();

    if (error) {
      console.error('Error fetching property rules:', error);
      toast.error('Erro ao carregar configurações');
    } else if (data) {
      setRules({
        auto_release_on_checkout: data.auto_release_on_checkout ?? false,
        require_photo_per_category: data.require_photo_per_category ?? false,
      });
    }
    setIsLoading(false);
  };

  const handleToggle = async (key: keyof PropertyRules, value: boolean) => {
    setIsSaving(key);

    try {
      // Get current user info for audit
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

      // Update property
      const { error: updateError } = await supabase
        .from('properties')
        .update({ [key]: value })
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
      setRules(prev => ({ ...prev, [key]: value }));
      toast.success('Configuração atualizada');
    } catch (error) {
      console.error('Error updating rule:', error);
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">Regras Operacionais Avançadas</h4>
        <p className="text-xs text-muted-foreground">
          Configure regras automáticas específicas para este imóvel.
        </p>
      </div>

      {/* Auto-release on checkout */}
      <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex gap-3">
          <div className="p-2 rounded-lg bg-primary/10 h-fit">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="auto-release" className="text-sm font-medium cursor-pointer">
              Liberação automática no checkout
            </Label>
            <p className="text-xs text-muted-foreground">
              O status será alterado automaticamente de "Aguardando Liberação" para "Liberado" 
              no exato horário de checkout do schedule.
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

      {/* Require photo per category */}
      <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex gap-3">
          <div className="p-2 rounded-lg bg-primary/10 h-fit">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="require-photo" className="text-sm font-medium cursor-pointer">
              Exigir foto por categoria do checklist
            </Label>
            <p className="text-xs text-muted-foreground">
              Cada categoria/cômodo do checklist exigirá pelo menos 1 foto obrigatória para 
              finalizar a limpeza. O botão "Finalizar" ficará bloqueado até que todas as fotos sejam anexadas.
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
  );
}
