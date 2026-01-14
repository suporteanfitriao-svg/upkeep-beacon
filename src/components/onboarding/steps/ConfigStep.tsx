import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Settings, Clock, Camera, Bell, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConfigStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface OnboardingConfig {
  default_check_in_time: string;
  default_check_out_time: string;
  require_photo_for_issues: boolean;
  require_photo_per_category: boolean;
  enable_notifications: boolean;
  auto_release_schedules: boolean;
}

export function ConfigStep({ onNext, onBack }: ConfigStepProps) {
  const [config, setConfig] = useState<OnboardingConfig>({
    default_check_in_time: '15:00',
    default_check_out_time: '11:00',
    require_photo_for_issues: true,
    require_photo_per_category: false,
    enable_notifications: true,
    auto_release_schedules: true,
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
          require_photo_for_issues: data.require_photo_for_issues,
          require_photo_per_category: data.require_photo_per_category,
          enable_notifications: data.enable_notifications,
          auto_release_schedules: data.auto_release_schedules,
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
          Defina as configurações padrão para todas as suas propriedades.
        </p>
      </div>

      <div className="space-y-6 mb-8">
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
            <div className="flex items-center justify-between">
              <div>
                <Label>Exigir foto ao reportar problemas</Label>
                <p className="text-xs text-muted-foreground">
                  Responsáveis devem anexar foto ao criar chamados de manutenção
                </p>
              </div>
              <Switch
                checked={config.require_photo_for_issues}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_photo_for_issues: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Exigir foto por categoria do checklist</Label>
                <p className="text-xs text-muted-foreground">
                  Uma foto deve ser tirada para cada categoria completada
                </p>
              </div>
              <Switch
                checked={config.require_photo_per_category}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_photo_per_category: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações e Automações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Ativar notificações</Label>
                <p className="text-xs text-muted-foreground">
                  Receba alertas sobre novas limpezas e problemas
                </p>
              </div>
              <Switch
                checked={config.enable_notifications}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enable_notifications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Liberar limpezas automaticamente</Label>
                <p className="text-xs text-muted-foreground">
                  Liberar agendamentos para limpeza no horário do checkout
                </p>
              </div>
              <Switch
                checked={config.auto_release_schedules}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_release_schedules: checked }))}
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