import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Settings, Clock, Camera, Bell, ArrowLeft, ArrowRight } from 'lucide-react';

interface ConfigStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ConfigStep({ onNext, onBack }: ConfigStepProps) {
  const [config, setConfig] = useState({
    defaultCheckIn: '15:00',
    defaultCheckOut: '11:00',
    requirePhotoForIssues: true,
    requirePhotoPerCategory: false,
    enableNotifications: true,
    autoReleaseSchedules: true,
  });

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
                value={config.defaultCheckIn}
                onChange={(e) => setConfig(prev => ({ ...prev, defaultCheckIn: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-out">Check-out</Label>
              <Input
                id="check-out"
                type="time"
                value={config.defaultCheckOut}
                onChange={(e) => setConfig(prev => ({ ...prev, defaultCheckOut: e.target.value }))}
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
                checked={config.requirePhotoForIssues}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, requirePhotoForIssues: checked }))}
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
                checked={config.requirePhotoPerCategory}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, requirePhotoPerCategory: checked }))}
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
                checked={config.enableNotifications}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableNotifications: checked }))}
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
                checked={config.autoReleaseSchedules}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoReleaseSchedules: checked }))}
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
        <Button onClick={onNext}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
