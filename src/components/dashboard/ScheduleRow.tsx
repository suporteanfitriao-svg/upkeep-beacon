import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface ScheduleRowProps {
  schedule: Schedule;
  onClick: () => void;
}

const statusConfig: Record<ScheduleStatus, { label: string; className: string }> = {
  waiting: { 
    label: 'Aguardando', 
    className: 'bg-status-waiting-bg text-status-waiting border-status-waiting/30' 
  },
  cleaning: { 
    label: 'Em Limpeza', 
    className: 'bg-status-progress-bg text-status-progress border-status-progress/30' 
  },
  inspection: { 
    label: 'Inspeção', 
    className: 'bg-status-inspection-bg text-status-inspection border-status-inspection/30' 
  },
  completed: { 
    label: 'Finalizado', 
    className: 'bg-status-completed-bg text-status-completed border-status-completed/30' 
  },
};

const priorityConfig = {
  high: { label: 'Alta', className: 'bg-priority-high/10 text-priority-high border-priority-high/30' },
  medium: { label: 'Média', className: 'bg-priority-medium/10 text-priority-medium border-priority-medium/30' },
  low: { label: 'Baixa', className: 'bg-priority-low/10 text-priority-low border-priority-low/30' },
};

const maintenanceIcons = {
  ok: <CheckCircle2 className="w-4 h-4 text-status-completed" />,
  needs_maintenance: <AlertTriangle className="w-4 h-4 text-status-alert animate-pulse-soft" />,
  in_progress: <Wrench className="w-4 h-4 text-status-progress" />,
};

export function ScheduleRow({ schedule, onClick }: ScheduleRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusStyle = statusConfig[schedule.status];
  const priorityStyle = priorityConfig[schedule.priority];
  const completedTasks = schedule.checklist.filter(item => item.completed).length;
  const totalTasks = schedule.checklist.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Collapsed Row - Always Visible */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onClick}
      >
        {/* Expand Button */}
        <button
          onClick={handleExpand}
          className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* Maintenance Icon */}
        <div className="shrink-0">
          {maintenanceIcons[schedule.maintenanceStatus]}
        </div>

        {/* Property Name */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate text-sm sm:text-base">
            {schedule.propertyName}
          </h3>
        </div>

        {/* Checkout Time */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{format(schedule.checkOut, "HH:mm", { locale: ptBR })}</span>
        </div>

        {/* Cleaner Name */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground max-w-[120px] truncate">{schedule.cleanerName}</span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={cn('text-xs border hidden sm:inline-flex', statusStyle.className)}>
            {statusStyle.label}
          </Badge>
          <Badge variant="outline" className={cn('text-xs border hidden lg:inline-flex', priorityStyle.className)}>
            {priorityStyle.label}
          </Badge>
          {schedule.maintenanceStatus !== 'ok' && (
            <Badge className="text-xs bg-status-alert-bg text-status-alert border border-status-alert/30">
              Manutenção
            </Badge>
          )}
        </div>

        {/* Mobile: Show minimal tags */}
        <div className="flex sm:hidden items-center gap-1">
          <Badge className={cn('text-[10px] px-1.5 py-0.5 border', statusStyle.className)}>
            {statusStyle.label.substring(0, 3)}
          </Badge>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t bg-muted/30 animate-slide-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {/* Check-in */}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Check-in</p>
              <p className="font-medium">{format(schedule.checkIn, "dd/MM HH:mm", { locale: ptBR })}</p>
            </div>

            {/* Check-out */}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Check-out</p>
              <p className="font-medium">{format(schedule.checkOut, "HH:mm", { locale: ptBR })}</p>
            </div>

            {/* Duration */}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Tempo Estimado</p>
              <p className="font-medium">{schedule.estimatedDuration} min</p>
            </div>

            {/* Progress */}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Progresso</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-status-completed rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{completedTasks}/{totalTasks}</span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mt-3 text-sm">
            <p className="text-muted-foreground text-xs mb-1">Endereço</p>
            <p className="text-foreground">{schedule.propertyAddress}</p>
          </div>

          {/* Issues & Materials */}
          {(schedule.maintenanceIssues.length > 0 || schedule.missingMaterials.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {schedule.maintenanceIssues.map(issue => (
                <Badge 
                  key={issue.id} 
                  variant="outline" 
                  className="bg-status-alert-bg text-status-alert border-status-alert/30 text-xs"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {issue.description}
                </Badge>
              ))}
              {schedule.missingMaterials.map(material => (
                <Badge 
                  key={material} 
                  variant="outline" 
                  className="bg-status-progress-bg text-status-progress border-status-progress/30 text-xs"
                >
                  {material}
                </Badge>
              ))}
            </div>
          )}

          {/* Notes */}
          {schedule.notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-sm text-muted-foreground">
              <span className="font-medium">Obs:</span> {schedule.notes}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onClick}
            className="mt-4 w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver Detalhes Completos
          </button>
        </div>
      )}
    </div>
  );
}
