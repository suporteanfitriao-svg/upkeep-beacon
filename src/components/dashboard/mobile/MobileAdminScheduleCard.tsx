import { memo, useState } from 'react';
import { format, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Check, ChevronRight, Building2, User, Play, MoreVertical, MapPin, Key, UserPlus, Eye } from 'lucide-react';
import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MobileAdminScheduleCardProps {
  schedule: Schedule;
  onScheduleClick: (schedule: Schedule) => void;
  onAssignCleaner?: (schedule: Schedule) => void;
  onViewAddress?: (schedule: Schedule) => void;
  onViewPassword?: (schedule: Schedule) => void;
  onRelease?: (schedule: Schedule) => void;
  isCompleted?: boolean;
}

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  waiting: { 
    label: 'Aguardando', 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    dotColor: 'bg-orange-500'
  },
  released: { 
    label: 'Liberado', 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    dotColor: 'bg-primary'
  },
  cleaning: { 
    label: 'Em Limpeza', 
    color: 'text-[#E0C051]',
    bgColor: 'bg-[#E0C051]/10',
    dotColor: 'bg-[#E0C051]'
  },
  completed: { 
    label: 'Finalizado', 
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    dotColor: 'bg-emerald-500'
  },
};

// Check if schedule is overdue
const isOverdue = (schedule: Schedule): boolean => {
  const today = startOfDay(new Date());
  const scheduleDate = startOfDay(schedule.checkOut);
  return isBefore(scheduleDate, today) && (schedule.status === 'waiting' || schedule.status === 'released');
};

export const MobileAdminScheduleCard = memo(function MobileAdminScheduleCard({
  schedule,
  onScheduleClick,
  onAssignCleaner,
  onViewAddress,
  onViewPassword,
  onRelease,
  isCompleted = false
}: MobileAdminScheduleCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[schedule.status];
  const taskOverdue = isOverdue(schedule);
  
  const handleQuickAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setMenuOpen(false);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft transition-all border",
        isCompleted && "opacity-60",
        taskOverdue 
          ? "border-red-300 dark:border-red-800 ring-1 ring-red-200 dark:ring-red-900/50" 
          : "border-slate-100 dark:border-slate-700"
      )}
    >
      {/* Main Content - Clickable */}
      <button
        onClick={() => onScheduleClick(schedule)}
        className="w-full text-left p-4"
      >
        <div className="flex gap-3">
          {/* Property Image */}
          {schedule.propertyImageUrl ? (
            <img 
              src={schedule.propertyImageUrl}
              alt={schedule.propertyName}
              className="w-16 h-16 shrink-0 rounded-xl object-cover border border-slate-100 dark:border-slate-700"
            />
          ) : (
            <div className="w-16 h-16 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
              <Building2 className="w-6 h-6 text-slate-400" />
            </div>
          )}
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Status Badge */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn("h-2 w-2 rounded-full animate-pulse", statusConfig.dotColor)} />
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", statusConfig.color)}>
                    {taskOverdue ? 'Atrasada' : statusConfig.label}
                  </span>
                  {taskOverdue && (
                    <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-[9px] font-bold text-red-600 dark:text-red-400">
                      ATRASADA
                    </span>
                  )}
                </div>
                
                {/* Property Name */}
                <h3 className={cn(
                  "font-bold text-sm truncate text-slate-900 dark:text-white",
                  isCompleted && "line-through decoration-slate-400/50"
                )}>
                  {schedule.propertyName}
                </h3>
              </div>
              
              {/* Quick Actions Menu */}
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => handleQuickAction(e as any, () => onScheduleClick(schedule))}>
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  {onViewAddress && (
                    <DropdownMenuItem onClick={(e) => handleQuickAction(e as any, () => onViewAddress(schedule))}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Ver Endereço
                    </DropdownMenuItem>
                  )}
                  {onViewPassword && (
                    <DropdownMenuItem onClick={(e) => handleQuickAction(e as any, () => onViewPassword(schedule))}>
                      <Key className="w-4 h-4 mr-2" />
                      Ver Senha
                    </DropdownMenuItem>
                  )}
                  {onAssignCleaner && schedule.status !== 'completed' && (
                    <DropdownMenuItem onClick={(e) => handleQuickAction(e as any, () => onAssignCleaner(schedule))}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Atribuir Responsável
                    </DropdownMenuItem>
                  )}
                  {onRelease && schedule.status === 'waiting' && (
                    <DropdownMenuItem onClick={(e) => handleQuickAction(e as any, () => onRelease(schedule))}>
                      <Play className="w-4 h-4 mr-2" />
                      Liberar para Limpeza
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Times */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">{format(schedule.checkOut, "HH:mm")}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-600">→</span>
              <span className="font-medium">{format(schedule.checkIn, "HH:mm")}</span>
            </div>
            
            {/* Cleaner */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                <span className="text-[9px] font-bold">
                  {schedule.cleanerName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'N'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {schedule.cleanerName || 'Sem responsável'}
              </span>
            </div>
          </div>
          
          {/* Chevron */}
          <ChevronRight className="w-5 h-5 text-muted-foreground self-center shrink-0" />
        </div>
      </button>
    </div>
  );
});
