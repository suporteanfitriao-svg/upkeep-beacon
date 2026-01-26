import { memo } from 'react';
import { format, startOfDay, isBefore } from 'date-fns';
import { Clock, Play, Check, ChevronRight, Building2, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { useStayStatus } from '@/hooks/useStayStatus';
import { useCleaningDelay } from '@/hooks/useCleaningDelay';

interface MobileScheduleCardProps {
  schedule: Schedule;
  onScheduleClick: (schedule: Schedule) => void;
  loadingScheduleId?: string | null;
  variant: 'pending' | 'inProgress' | 'completed' | 'tomorrow' | 'calendar';
}

// Check if schedule is overdue (past date and still pending)
const isOverdue = (schedule: Schedule): boolean => {
  const today = startOfDay(new Date());
  const scheduleDate = startOfDay(schedule.checkOut);
  return isBefore(scheduleDate, today) && (schedule.status === 'waiting' || schedule.status === 'released');
};

// Footer for pending cards with stay status
const PendingCardFooter = memo(function PendingCardFooter({ schedule }: { schedule: Schedule }) {
  const stayStatus = useStayStatus(schedule);
  
  return (
    <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex justify-between items-center">
      <div className="flex -space-x-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold ring-2 ring-white dark:ring-[#2d3138]">
          {schedule.cleanerName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'N'}
        </span>
      </div>
      {stayStatus ? (
        <span className={cn("text-xs font-medium", stayStatus.colorClass)}>
          {stayStatus.label}
        </span>
      ) : (
        <span className="text-xs font-medium text-[#8A8B88]">Aguardando liberação</span>
      )}
    </div>
  );
});

const formatTime = (date: Date) => format(date, 'HH:mm');

export const MobileScheduleCard = memo(function MobileScheduleCard({
  schedule,
  onScheduleClick,
  loadingScheduleId,
  variant
}: MobileScheduleCardProps) {
  // Real-time delay tracking - must be called unconditionally
  const { isDelayed, formattedDelay } = useCleaningDelay(schedule);
  
  if (variant === 'completed') {
    return (
      <button
        onClick={() => onScheduleClick(schedule)}
        className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-[#2d3138]/60 px-4 py-3 opacity-70 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <Check className="w-[18px] h-[18px]" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-bold text-slate-900 dark:text-white line-through decoration-[#8A8B88]/30">{schedule.propertyName}</p>
            <div className="mt-1 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88]">Liberado para Limpeza</span>
              <p className="text-xs font-bold text-[#8A8B88]">{formatTime(schedule.checkOut)}</p>
            </div>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Concluído</span>
      </button>
    );
  }

  if (variant === 'tomorrow') {
    return (
      <button
        onClick={() => onScheduleClick(schedule)}
        className="overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft transition-all border border-slate-100 dark:border-slate-700 text-left"
      >
        <div className="flex flex-row p-4 gap-4">
          {schedule.propertyImageUrl ? (
            <img 
              src={schedule.propertyImageUrl}
              alt={schedule.propertyName}
              className="w-20 h-20 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
          )}
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1">{schedule.propertyName}</h3>
            <div className="mt-1 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88] mb-0.5">Liberado para Limpeza</span>
              <div className="flex items-center gap-1 text-[#8A8B88]">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-bold">{formatTime(schedule.checkOut)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-[#8A8B88]">Agendado</span>
          </div>
        </div>
      </button>
    );
  }

  if (variant === 'calendar') {
    return (
      <button
        onClick={() => onScheduleClick(schedule)}
        className="overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft border border-slate-100 dark:border-slate-700 transition-transform active:scale-[0.98] text-left w-full"
      >
        <div className="flex flex-col">
          {/* Image and status row */}
          <div className="flex flex-row p-3 pb-2 gap-3">
            {schedule.propertyImageUrl ? (
              <img 
                src={schedule.propertyImageUrl} 
                alt={schedule.propertyName}
                className="w-16 h-16 shrink-0 rounded-xl object-cover border border-slate-100 dark:border-slate-700"
              />
            ) : (
              <div className="w-16 h-16 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-slate-400 text-[28px]">apartment</span>
              </div>
            )}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              {/* Status indicator */}
              <div className="flex items-center gap-1.5 mb-1">
                {schedule.status === 'completed' ? (
                  <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                ) : schedule.status === 'cleaning' ? (
                  <div className="h-2 w-2 rounded-full bg-[#E0C051] ring-2 ring-[#E0C051]/30" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/30" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88]">
                  {schedule.status === 'completed' ? 'Finalizado' : schedule.status === 'cleaning' ? 'Em limpeza' : 'Aguardando'}
                </span>
              </div>
              {/* Property name - full width */}
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {schedule.propertyName}
              </h3>
            </div>
          </div>
          {/* Time and type row */}
          <div className="px-3 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#8A8B88] dark:text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold">{formatTime(schedule.checkOut)}</span>
              <span className="text-xs">→</span>
              <span className="text-xs font-bold">{schedule.checkIn ? format(schedule.checkIn, 'HH:mm') : '--:--'}</span>
            </div>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Limpeza
            </span>
          </div>
        </div>
      </button>
    );
  }

  const isPending = variant === 'pending';
  const isInProgress = variant === 'inProgress';
  const isTaskOverdue = isOverdue(schedule);
  
  const statusColor = isDelayed ? 'red' : isTaskOverdue ? 'red' : isPending ? 'primary' : '#E0C051';
  const statusLabel = isDelayed ? 'Em Atraso' : isTaskOverdue ? 'Atrasada' : isPending ? 'Pendente' : 'Em Limpeza';
  const buttonLabel = isPending ? 'Iniciar Limpeza' : 'Continuar Limpeza';

  // Check if schedule has important info that requires reading
  const hasImportantInfo = Boolean(schedule.importantInfo && schedule.importantInfo.trim().length > 0);

  return (
    <div 
      className={cn(
        "overflow-hidden rounded-2xl shadow-soft transition-all hover:shadow-md border",
        // Live delay alert state - highest priority
        isDelayed
          ? "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-700 ring-2 ring-red-300 dark:ring-red-800/50"
          : "bg-white dark:bg-[#2d3138]",
        // Overdue state (past checkout date, waiting/released)
        !isDelayed && isTaskOverdue 
          ? "border-red-300 dark:border-red-800 ring-1 ring-red-200 dark:ring-red-900/50" 
          : !isDelayed && "border-slate-100 dark:border-slate-700"
      )}
    >
      {/* Live Delay Alert Banner */}
      {isDelayed && (
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">LIMPEZA EM ATRASO</span>
          </div>
          <span className="text-sm font-bold">Atraso: {formattedDelay}</span>
        </div>
      )}
      
      <div className="flex flex-row p-4 gap-4">
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="mb-1 flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                "inline-flex h-2 w-2 rounded-full animate-pulse", 
                isTaskOverdue ? "bg-red-500" : isPending ? "bg-primary" : "bg-[#E0C051]"
              )} />
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider", 
                isTaskOverdue ? "text-red-600 dark:text-red-400" : isPending ? "text-primary" : "text-[#E0C051]"
              )}>{statusLabel}</span>
              {/* Overdue badge */}
              {isTaskOverdue && (
                <div className="flex items-center gap-1 ml-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400">Atrasada</span>
                </div>
              )}
              {/* Important info indicator */}
              {hasImportantInfo && isPending && !isTaskOverdue && (
                <div className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Ler obs.</span>
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2">{schedule.propertyName}</h3>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88] mb-0.5">Liberado para Limpeza</span>
              <div className="flex items-center gap-1 text-[#8A8B88]">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-bold">{formatTime(schedule.checkOut)}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!loadingScheduleId) onScheduleClick(schedule);
            }}
            disabled={loadingScheduleId === schedule.id}
            className={cn(
              "mt-4 flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isTaskOverdue
                ? "bg-red-500 hover:bg-red-600 active:bg-red-600"
                : isPending 
                  ? "bg-primary hover:bg-[#267373] active:bg-[#267373]" 
                  : "bg-[#E0C051] hover:bg-[#c9a844] active:bg-[#c9a844]"
            )}
          >
            {loadingScheduleId === schedule.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {loadingScheduleId === schedule.id ? 'Carregando...' : buttonLabel}
          </button>
        </div>
        {schedule.propertyImageUrl ? (
          <img 
            src={schedule.propertyImageUrl} 
            alt={schedule.propertyName}
            className="w-28 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div 
            className="w-28 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-slate-400 text-[32px]">apartment</span>
          </div>
        )}
      </div>
      {isPending ? (
        <PendingCardFooter schedule={schedule} />
      ) : (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex justify-between items-center">
          <div className="flex -space-x-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E0C051]/20 text-[#E0C051] text-[10px] font-bold ring-2 ring-white dark:ring-[#2d3138]">
              {schedule.cleanerName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'N'}
            </span>
          </div>
          <span className="text-xs font-medium text-[#E0C051]">Limpeza em andamento</span>
        </div>
      )}
    </div>
  );
});
