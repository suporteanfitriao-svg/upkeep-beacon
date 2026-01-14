import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Play,
  AlertTriangle,
  Wrench,
  Eye,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStayStatus } from '@/hooks/useStayStatus';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleCardProps {
  schedule: Schedule;
  onClick: () => void;
  isLoading?: boolean;
}

const statusConfig: Record<ScheduleStatus, { label: string; dotClass: string; textClass: string }> = {
  waiting: { 
    label: 'PENDENTE', 
    dotClass: 'bg-status-waiting',
    textClass: 'text-status-waiting'
  },
  released: { 
    label: 'LIBERADO', 
    dotClass: 'bg-status-released',
    textClass: 'text-status-released'
  },
  cleaning: { 
    label: 'EM LIMPEZA', 
    dotClass: 'bg-status-progress',
    textClass: 'text-status-progress'
  },
  completed: { 
    label: 'FINALIZADO', 
    dotClass: 'bg-status-completed',
    textClass: 'text-status-completed'
  },
};

const buttonConfig: Record<ScheduleStatus, { label: string; icon: React.ReactNode }> = {
  waiting: { label: 'Ver Detalhes', icon: <Eye className="w-4 h-4" /> },
  released: { label: 'Iniciar Limpeza', icon: <Play className="w-4 h-4" /> },
  cleaning: { label: 'Continuar', icon: <Play className="w-4 h-4" /> },
  completed: { label: 'Ver Detalhes', icon: <Eye className="w-4 h-4" /> },
};

export function ScheduleCard({ schedule, onClick, isLoading = false }: ScheduleCardProps) {
  const statusStyle = statusConfig[schedule.status];
  const buttonStyle = buttonConfig[schedule.status];
  const stayStatus = useStayStatus(schedule);
  const completedTasks = schedule.checklist.filter(item => item.completed).length;
  const totalTasks = schedule.checklist.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Fetch require_checklist from property
  const [requireChecklist, setRequireChecklist] = useState(true);
  
  useEffect(() => {
    const fetchPropertyConfig = async () => {
      if (!schedule.propertyId) return;
      const { data } = await supabase
        .from('properties')
        .select('require_checklist')
        .eq('id', schedule.propertyId)
        .maybeSingle();
      if (data) {
        setRequireChecklist(data.require_checklist ?? true);
      }
    };
    fetchPropertyConfig();
  }, [schedule.propertyId]);

  // Determine context message based on status
  const getContextMessage = () => {
    if (schedule.status === 'cleaning' && requireChecklist) {
      return `${completedTasks}/${totalTasks} tarefas concluídas`;
    }
    if (schedule.status === 'cleaning' && !requireChecklist) {
      return 'Limpeza em andamento';
    }
    if (schedule.status === 'completed') {
      return 'Limpeza finalizada';
    }
    return `${schedule.cleanerName !== 'Não atribuído' ? schedule.cleanerName : ''}`;
  };

  return (
    <div
      className={cn(
        'w-full bg-card rounded-2xl border overflow-hidden transition-all duration-200',
        'hover:shadow-lg hover:border-primary/30 cursor-pointer',
        'animate-slide-in'
      )}
    >
      <div className="flex">
        {/* Left Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('w-2 h-2 rounded-full', statusStyle.dotClass)} />
            <span className={cn('text-xs font-semibold uppercase tracking-wide', statusStyle.textClass)}>
              {statusStyle.label}
            </span>
            {schedule.maintenanceStatus === 'needs_maintenance' && (
              <AlertTriangle className="w-4 h-4 text-status-alert animate-pulse-soft" />
            )}
            {schedule.maintenanceStatus === 'in_progress' && (
              <Wrench className="w-4 h-4 text-status-progress" />
            )}
          </div>

          {/* Stay Status Indicator - Only for waiting status */}
          {stayStatus && (
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide mb-2 w-fit',
              stayStatus.bgClass,
              stayStatus.colorClass
            )}>
              {stayStatus.type === 'stay_ending' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
              {stayStatus.type === 'near_release' && (
                <Clock className="w-3 h-3" />
              )}
              {stayStatus.label}
            </div>
          )}

          {/* Property Name */}
          <h3 className="font-bold text-lg text-foreground truncate mb-2">
            {schedule.propertyName}
          </h3>

          {/* Liberado a partir de */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="w-4 h-4" />
            <span className="uppercase text-xs font-medium">Liberado a partir de</span>
            <span className="font-semibold text-foreground">
              {format(schedule.checkOut, "HH:mm", { locale: ptBR })}
            </span>
          </div>

          {/* Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isLoading) onClick();
            }}
            disabled={isLoading}
            className={cn(
              'flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4',
              'text-sm font-bold transition-all active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              schedule.status === 'completed' 
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              buttonStyle.icon
            )}
            {isLoading ? 'Carregando...' : buttonStyle.label}
          </button>

          {/* Context Info */}
          <div className="flex items-center gap-2 mt-3">
            {/* Cleaner Avatar Placeholder */}
            <div className="flex -space-x-2">
              {schedule.cleanerName !== 'Não atribuído' && (
                <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">
                    {schedule.cleanerName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {getContextMessage()}
            </span>
          </div>

          {/* Progress bar for cleaning status - only show if checklist is required */}
          {schedule.status === 'cleaning' && requireChecklist && (
            <div className="mt-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Maintenance Issues Alert */}
          {schedule.maintenanceIssues.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-status-alert">
              <AlertTriangle className="w-3 h-3" />
              <span>{schedule.maintenanceIssues.length} avaria(s)</span>
            </div>
          )}
        </div>

        {/* Right Image */}
        <div className="w-32 sm:w-40 shrink-0" onClick={onClick}>
          {schedule.propertyImageUrl ? (
            <img 
              src={schedule.propertyImageUrl} 
              alt={schedule.propertyName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="material-symbols-outlined text-muted-foreground text-[40px]">home</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
