import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, 
  Clock, 
  Play, 
  CheckSquare, 
  Camera, 
  AlertTriangle, 
  CheckCircle2,
  Smartphone
} from 'lucide-react';

interface CleanerWorkflowPreviewProps {
  config: {
    auto_release_schedules: boolean;
    auto_release_before_checkout_enabled: boolean;
    auto_release_before_checkout_minutes: number;
    require_checklist: boolean;
    require_photo_per_category: boolean;
    require_photo_for_issues: boolean;
  };
}

export function CleanerWorkflowPreview({ config }: CleanerWorkflowPreviewProps) {
  const steps = [
    {
      id: 'notification',
      icon: Smartphone,
      title: 'Recebe Notificação',
      description: 'Cleaner é notificado sobre nova tarefa',
      always: true,
    },
    {
      id: 'release',
      icon: Clock,
      title: 'Aguarda Liberação',
      description: config.auto_release_before_checkout_enabled
        ? `Liberado automaticamente ${config.auto_release_before_checkout_minutes} min antes do check-out`
        : config.auto_release_schedules
        ? 'Liberado automaticamente no horário do check-out'
        : 'Aguarda liberação manual do gestor',
      always: true,
      highlight: config.auto_release_schedules || config.auto_release_before_checkout_enabled,
    },
    {
      id: 'start',
      icon: Play,
      title: 'Inicia Limpeza',
      description: 'Cleaner confirma início da tarefa',
      always: true,
    },
    {
      id: 'checklist',
      icon: CheckSquare,
      title: 'Executa Checklist',
      description: config.require_checklist 
        ? 'Marca cada item como OK ou NOK' 
        : 'Checklist opcional - pode pular',
      always: true,
      enabled: config.require_checklist,
      optional: !config.require_checklist,
    },
    {
      id: 'photos_category',
      icon: Camera,
      title: 'Fotos por Categoria',
      description: 'Tira foto de cada categoria do checklist',
      always: false,
      enabled: config.require_photo_per_category && config.require_checklist,
      conditional: true,
    },
    {
      id: 'issues',
      icon: AlertTriangle,
      title: 'Reporta Avarias',
      description: config.require_photo_for_issues
        ? 'Registra problemas com foto obrigatória'
        : 'Registra problemas (foto opcional)',
      always: true,
      highlight: config.require_photo_for_issues,
    },
    {
      id: 'complete',
      icon: CheckCircle2,
      title: 'Finaliza Tarefa',
      description: 'Confirma conclusão da limpeza',
      always: true,
      success: true,
    },
  ];

  const visibleSteps = steps.filter(step => step.always || step.enabled);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Preview do Fluxo do Cleaner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {visibleSteps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connection Line */}
              {index < visibleSteps.length - 1 && (
                <div className="absolute left-5 top-12 w-0.5 h-8 bg-border" />
              )}
              
              {/* Step */}
              <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                step.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20' 
                  : step.optional
                  ? 'bg-muted/30'
                  : 'bg-muted/50'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  step.success 
                    ? 'bg-emerald-500 text-white'
                    : step.enabled === false && step.conditional
                    ? 'bg-muted text-muted-foreground'
                    : step.highlight
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border-2 border-border text-foreground'
                }`}>
                  <step.icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium text-sm ${
                      step.optional ? 'text-muted-foreground' : ''
                    }`}>
                      {step.title}
                    </p>
                    {step.optional && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Opcional
                      </Badge>
                    )}
                    {step.highlight && !step.success && (
                      <Badge className="text-[10px] px-1.5 py-0">
                        Automático
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              {index < visibleSteps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Legenda:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Automático</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Conclusão</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2 border-border bg-background" />
              <span className="text-muted-foreground">Manual</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
