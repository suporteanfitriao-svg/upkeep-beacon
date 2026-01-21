import { memo, useCallback, useState } from 'react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, AlertCircle, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';

interface MobileOverdueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  overdueSchedules: Schedule[];
  onScheduleClick: (schedule: Schedule) => void;
}

const ITEMS_PER_PAGE = 5;

export const MobileOverdueDrawer = memo(function MobileOverdueDrawer({
  isOpen,
  onClose,
  overdueSchedules,
  onScheduleClick,
}: MobileOverdueDrawerProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Sort by most overdue first (oldest checkout date)
  const sortedSchedules = [...overdueSchedules].sort(
    (a, b) => a.checkOut.getTime() - b.checkOut.getTime()
  );

  const visibleSchedules = sortedSchedules.slice(0, visibleCount);
  const hasMore = visibleCount < sortedSchedules.length;
  const remainingCount = sortedSchedules.length - visibleCount;

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, sortedSchedules.length));
  }, [sortedSchedules.length]);

  const handleScheduleClick = useCallback((schedule: Schedule) => {
    onScheduleClick(schedule);
    onClose();
  }, [onScheduleClick, onClose]);

  const getDaysOverdue = (checkOut: Date) => {
    const today = startOfDay(new Date());
    const checkoutDay = startOfDay(checkOut);
    return differenceInDays(today, checkoutDay);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex flex-col bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Drawer content */}
      <div 
        className="mt-auto max-h-[85vh] flex flex-col bg-stone-50 dark:bg-[#22252a] rounded-t-3xl shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-5 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Tarefas Atrasadas</h2>
              <p className="text-xs text-muted-foreground">
                {overdueSchedules.length} {overdueSchedules.length === 1 ? 'tarefa pendente' : 'tarefas pendentes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </header>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visibleSchedules.map((schedule) => {
            const daysOverdue = getDaysOverdue(schedule.checkOut);
            
            return (
              <button
                key={schedule.id}
                onClick={() => handleScheduleClick(schedule)}
                className="w-full flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800/50 shadow-sm transition-all active:scale-[0.99] text-left"
              >
                {/* Days badge */}
                <div className="shrink-0 flex flex-col items-center justify-center h-14 w-14 rounded-xl bg-red-100 dark:bg-red-900/30">
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">{daysOverdue}</span>
                  <span className="text-[10px] font-medium text-red-500 dark:text-red-400/80 uppercase">
                    {daysOverdue === 1 ? 'dia' : 'dias'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">
                    {schedule.propertyName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      Check-out: {format(schedule.checkOut, "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {schedule.propertyAddress && (
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {schedule.propertyAddress}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <span className={cn(
                  "shrink-0 px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                  schedule.status === 'released' 
                    ? "bg-primary/10 text-primary" 
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                )}>
                  {schedule.status === 'released' ? 'Liberada' : 'Aguardando'}
                </span>
              </button>
            );
          })}

          {/* Load more button */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-muted-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <ChevronDown className="w-4 h-4" />
              <span>Ver mais {remainingCount} {remainingCount === 1 ? 'tarefa' : 'tarefas'}</span>
            </button>
          )}
        </div>

        {/* Footer with safe area */}
        <div className="shrink-0 p-4 pb-safe border-t border-slate-200 dark:border-slate-700 bg-stone-50 dark:bg-[#22252a]">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-bold text-foreground transition-colors hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
});
