import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench,
  ChevronRight,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface ScheduleCardProps {
  schedule: Schedule;
  onClick: () => void;
}

const statusConfig: Record<ScheduleStatus, { label: string; className: string }> = {
  waiting: { 
    label: 'Aguardando', 
    className: 'bg-status-waiting-bg text-status-waiting border-status-waiting/30' 
  },
  released: { 
    label: 'Liberado', 
    className: 'bg-status-released-bg text-status-released border-status-released/30' 
  },
  cleaning: { 
    label: 'Em Limpeza', 
    className: 'bg-status-progress-bg text-status-progress border-status-progress/30' 
  },
  completed: { 
    label: 'Finalizado', 
    className: 'bg-status-completed-bg text-status-completed border-status-completed/30' 
  },
};

const priorityConfig = {
  high: { label: 'Alta', className: 'bg-priority-high/10 text-priority-high' },
  medium: { label: 'Média', className: 'bg-priority-medium/10 text-priority-medium' },
  low: { label: 'Baixa', className: 'bg-priority-low/10 text-priority-low' },
};

const maintenanceIcons = {
  ok: <CheckCircle2 className="w-5 h-5 text-status-completed" />,
  needs_maintenance: <AlertTriangle className="w-5 h-5 text-status-alert animate-pulse-soft" />,
  in_progress: <Wrench className="w-5 h-5 text-status-progress" />,
};

export function ScheduleCard({ schedule, onClick }: ScheduleCardProps) {
  const statusStyle = statusConfig[schedule.status];
  const priorityStyle = priorityConfig[schedule.priority];
  const completedTasks = schedule.checklist.filter(item => item.completed).length;
  const totalTasks = schedule.checklist.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full bg-card rounded-xl border p-4 transition-all duration-200',
        'hover:shadow-lg hover:border-primary/30 cursor-pointer text-left',
        'animate-slide-in'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Property Image */}
        {schedule.propertyImageUrl && (
          <div className="shrink-0">
            <img 
              src={schedule.propertyImageUrl} 
              alt={schedule.propertyName}
              className="w-16 h-16 rounded-lg object-cover border border-border"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-foreground truncate">{schedule.propertyName}</h3>
              {maintenanceIcons[schedule.maintenanceStatus]}
            </div>

            {/* Address */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{schedule.propertyAddress}</span>
            </div>

          {/* Times */}
          <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Check-in:</span>
              <span className="font-medium text-foreground">
                {format(schedule.checkIn, "HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Est.:</span>
              <span className="font-medium text-foreground">
                {schedule.estimatedDuration} min
              </span>
            </div>
          </div>

          {/* Cleaner */}
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Responsável:</span>
            <span className="font-medium text-foreground">{schedule.cleanerName}</span>
          </div>

          {/* Progress bar */}
          {schedule.status === 'cleaning' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progresso</span>
                <span>{completedTasks}/{totalTasks} tarefas</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-status-progress rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Alerts */}
          {schedule.maintenanceIssues.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-status-alert">
              <AlertTriangle className="w-4 h-4" />
              <span>{schedule.maintenanceIssues.length} problema(s) reportado(s)</span>
            </div>
          )}

          {schedule.missingMaterials.length > 0 && (
            <div className="mt-2 text-sm text-status-progress">
              <span className="font-medium">Materiais faltando: </span>
              {schedule.missingMaterials.join(', ')}
            </div>
          )}
        </div>

          {/* Right side - Status & Priority */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={cn('border', statusStyle.className)}>
              {statusStyle.label}
            </Badge>
            <Badge variant="outline" className={cn(priorityStyle.className)}>
              Prioridade {priorityStyle.label}
            </Badge>
            <ChevronRight className="w-5 h-5 text-muted-foreground mt-2" />
          </div>
        </div>
      </div>
    </button>
  );
}
