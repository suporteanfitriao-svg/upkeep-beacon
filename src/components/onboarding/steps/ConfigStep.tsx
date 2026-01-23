import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Settings, Clock, Camera, Bell, ArrowLeft, ArrowRight, Loader2, ClipboardList, AlertTriangle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConfigStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface OnboardingConfig {
  // Horários
  default_check_in_time: string;
  default_check_out_time: string;
  // Notificações
  enable_notifications: boolean;
  // Liberação automática
  auto_release_schedules: boolean;
  auto_release_before_checkout_enabled: boolean;
  auto_release_before_checkout_minutes: number;
  // Checklist
  require_checklist: boolean;
  // Fotos
  require_photo_per_category: boolean;
  require_photo_for_issues: boolean;
  require_photo_for_inspections: boolean;
}

export function ConfigStep({ onNext, onBack }: ConfigStepProps) {
  const [config, setConfig] = useState<OnboardingConfig>({
    default_check_in_time: '15:00',
    default_check_out_time: '11:00',
    enable_notifications: true,
    auto_release_schedules: true,
    auto_release_before_checkout_enabled: false,
    auto_release_before_checkout_minutes: 60,
    require_checklist: true,
    require_photo_per_category: false,
    require_photo_for_issues: true,
    require_photo_for_inspections: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('onboarding_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          default_check_in_time: data.default_check_in_time?.slice(0, 5) || '15:00',
          default_check_out_time: data.default_check_out_time?.slice(0, 5) || '11:00',
          enable_notifications: data.enable_notifications,
          auto_release_schedules: data.auto_release_schedules,
          auto_release_before_checkout_enabled: false,
          auto_release_before_checkout_minutes: 60,
          require_checklist: true,
          require_photo_per_category: data.require_photo_per_category,
          require_photo_for_issues: data.require_photo_for_issues,
          require_photo_for_inspections: false,
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndNext = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { error } = await supabase
        .from('onboarding_settings')
        .upsert({
          user_id: user.id,
          default_check_in_time: config.default_check_in_time,
          default_check_out_time: config.default_check_out_time,
          require_photo_for_issues: config.require_photo_for_issues,
          require_photo_per_category: config.require_photo_per_category,
          enable_notifications: config.enable_notifications,
          auto_release_schedules: config.auto_release_schedules,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast.success('Configurações salvas!');
      onNext();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Handle auto-release toggle logic (mutual exclusion)
  const handleAutoReleaseToggle = (key: 'auto_release_schedules' | 'auto_release_before_checkout_enabled', value: boolean) => {
    if (key === 'auto_release_schedules' && value) {
      setConfig(prev => ({ 
        ...prev, 
        auto_release_schedules: true,
        auto_release_before_checkout_enabled: false 
      }));
    } else if (key === 'auto_release_before_checkout_enabled' && value) {
      setConfig(prev => ({ 
        ...prev, 
        auto_release_before_checkout_enabled: true,
        auto_release_schedules: false 
      }));
    } else {
      setConfig(prev => ({ ...prev, [key]: value }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl w-full flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Settings className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Configurações Gerais</h2>
        <p className="text-muted-foreground">
          Defina as configurações padrão para todas as suas propriedades. Você poderá personalizar cada propriedade individualmente depois.
        </p>
      </div>

      <div className="space-y-6 mb-8">
        {/* Horários Padrão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários Padrão
            </CardTitle>
            <CardDescription>
              Configure os horários de check-in e check-out padrão
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check-in">Check-in</Label>
              <Input
                id="check-in"
                type="time"
                value={config.default_check_in_time}
                onChange={(e) => setConfig(prev => ({ ...prev, default_check_in_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-out">Check-out</Label>
              <Input
                id="check-out"
                type="time"
                value={config.default_check_out_time}
                onChange={(e) => setConfig(prev => ({ ...prev, default_check_out_time: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fluxo de Liberação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Fluxo de Liberação
            </CardTitle>
            <CardDescription>
              Configure quando o sistema deve liberar automaticamente as limpezas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Liberação no checkout */}
            <div className={cn(
              "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
              config.auto_release_schedules ? "bg-primary/5 border-primary/30" : "bg-muted/30"
            )}>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Liberação no horário do checkout</Label>
                <p className="text-xs text-muted-foreground">
                  Libera automaticamente no exato horário de checkout do schedule
                </p>
              </div>
              <Switch
                checked={config.auto_release_schedules}
                onCheckedChange={(checked) => handleAutoReleaseToggle('auto_release_schedules', checked)}
              />
            </div>

            {/* Liberação antecipada */}
            <div className={cn(
              "p-4 rounded-lg border transition-colors",
              config.auto_release_before_checkout_enabled ? "bg-primary/5 border-primary/30" : "bg-muted/30"
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Liberação antecipada (antes do checkout)</Label>
                  <p className="text-xs text-muted-foreground">
                    Libera automaticamente X minutos antes do horário de checkout
                  </p>
                </div>
                <Switch
                  checked={config.auto_release_before_checkout_enabled}
                  onCheckedChange={(checked) => handleAutoReleaseToggle('auto_release_before_checkout_enabled', checked)}
                />
              </div>

              {config.auto_release_before_checkout_enabled && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm whitespace-nowrap">Liberar faltando</Label>
                    <Input
                      type="number"
                      min={1}
                      max={180}
                      value={config.auto_release_before_checkout_minutes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= 180) {
                          setConfig(prev => ({ ...prev, auto_release_before_checkout_minutes: val }));
                        }
                      }}
                      className="w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">minutos para o checkout</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exemplo: Se o checkout é às 11:00 e você configurar 60 minutos, a liberação ocorrerá às 10:00.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checklist de Limpeza */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Checklist de Limpeza
            </CardTitle>
            <CardDescription>
              Configure se o checklist é obrigatório para as limpezas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
              config.require_checklist ? "bg-primary/5 border-primary/30" : "bg-muted/30"
            )}>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Exigir checklist de limpeza</Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativado, o cleaner deve preencher o checklist durante a limpeza.
                  Quando desativado, o checklist não será exibido.
                </p>
              </div>
              <Switch
                checked={config.require_checklist}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_checklist: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fotos e Documentação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos e Documentação
            </CardTitle>
            <CardDescription>
              Configure as regras de documentação fotográfica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Foto por categoria - só mostra se checklist está ativo */}
            {config.require_checklist && (
              <div className={cn(
                "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
                config.require_photo_per_category ? "bg-primary/5 border-primary/30" : "bg-muted/30"
              )}>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Exigir foto por categoria do checklist</Label>
                  <p className="text-xs text-muted-foreground">
                    Cada categoria/cômodo exige pelo menos 1 foto para finalizar a limpeza.
                    O botão "Finalizar" ficará bloqueado até todas as fotos serem anexadas.
                  </p>
                </div>
                <Switch
                  checked={config.require_photo_per_category}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_photo_per_category: checked }))}
                />
              </div>
            )}

            {/* Foto ao reportar avarias */}
            <div className={cn(
              "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
              config.require_photo_for_issues ? "bg-amber-500/5 border-amber-500/30" : "bg-muted/30"
            )}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Exigir foto ao registrar avaria</Label>
                  <p className="text-xs text-muted-foreground">
                    Ao registrar uma avaria, o sistema exigirá pelo menos 1 foto.
                    Não será possível salvar a avaria sem anexar uma foto.
                  </p>
                </div>
              </div>
              <Switch
                checked={config.require_photo_for_issues}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_photo_for_issues: checked }))}
              />
            </div>

            {/* Foto em inspeções */}
            <div className={cn(
              "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
              config.require_photo_for_inspections ? "bg-purple-500/5 border-purple-500/30" : "bg-muted/30"
            )}>
              <div className="flex items-start gap-3">
                <Search className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Exigir foto ao realizar inspeção</Label>
                  <p className="text-xs text-muted-foreground">
                    Ao realizar uma inspeção, o sistema exigirá pelo menos 1 foto.
                    Não será possível finalizar a inspeção sem anexar uma foto.
                  </p>
                </div>
              </div>
              <Switch
                checked={config.require_photo_for_inspections}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_photo_for_inspections: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure as preferências de notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              "flex items-start justify-between gap-4 p-4 rounded-lg border transition-colors",
              config.enable_notifications ? "bg-primary/5 border-primary/30" : "bg-muted/30"
            )}>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Ativar notificações</Label>
                <p className="text-xs text-muted-foreground">
                  Receba alertas sobre novas limpezas e problemas
                </p>
              </div>
              <Switch
                checked={config.enable_notifications}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enable_notifications: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleSaveAndNext} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
