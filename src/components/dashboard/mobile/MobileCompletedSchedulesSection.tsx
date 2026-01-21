import { useMemo, useState } from 'react';
import { format, differenceInMinutes, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, ChevronRight, Clock, MapPin, AlertTriangle, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';

interface MobileCompletedSchedulesSectionProps {
  schedules: Schedule[];
  onScheduleClick: (schedule: Schedule) => void;
}

function formatDuration(startAt: Date | undefined, endAt: Date | undefined): string {
  if (!startAt || !endAt) return '--';
  const minutes = differenceInMinutes(endAt, startAt);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
}

export function MobileCompletedSchedulesSection({ schedules, onScheduleClick }: MobileCompletedSchedulesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get completed schedules from current month
  const completedSchedules = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    return schedules
      .filter(s => 
        s.status === 'completed' &&
        isWithinInterval(s.checkOut, { start: monthStart, end: monthEnd })
      )
      .sort((a, b) => {
        const dateA = a.endAt || a.checkOut;
        const dateB = b.endAt || b.checkOut;
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
  }, [schedules]);

  const displayedSchedules = isExpanded ? completedSchedules : completedSchedules.slice(0, 3);

  if (completedSchedules.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          Limpezas Finalizadas
        </h4>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
          {completedSchedules.length} no mês
        </span>
      </div>
      
      <div className="space-y-2">
        {displayedSchedules.map((schedule) => {
          const completedDate = schedule.endAt || schedule.checkOut;
          const duration = formatDuration(schedule.startAt, schedule.endAt);
          const hasIssues = schedule.maintenanceIssues.length > 0;
          const photosCount = Object.values(schedule.categoryPhotos || {}).reduce((acc, photos) => acc + photos.length, 0);

          return (
            <button
              key={schedule.id}
              onClick={() => onScheduleClick(schedule)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-all text-left active:scale-[0.99]"
            >
              {/* Status Indicator */}
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-foreground truncate">{schedule.propertyName}</h3>
                  {hasIssues && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {schedule.maintenanceIssues.length}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                    {format(completedDate, "dd/MM", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {duration}
                  </span>
                  {photosCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {photosCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Expand/Collapse button */}
      {completedSchedules.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <span>Ver menos</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Ver todas ({completedSchedules.length})</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
