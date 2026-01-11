import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { format, isSameDay, addDays, startOfWeek, getWeek, isAfter, startOfDay, isToday as checkIsToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Play, Clock, Check, ChevronRight, LayoutGrid, MessageSquare, Menu, RefreshCw } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MobileDashboardProps {
  schedules: Schedule[];
  onScheduleClick: (schedule: Schedule) => void;
  onStartCleaning: (scheduleId: string) => void;
  onRefresh?: () => Promise<{ synced: number } | null>;
}

const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const AUTO_SYNC_INTERVAL = 60000; // 1 minute
const PULL_THRESHOLD = 80; // pixels to trigger refresh

// Vibrate helper function
const vibrate = (pattern: number | number[] = 50) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export function MobileDashboard({ schedules, onScheduleClick, onStartCleaning, onRefresh }: MobileDashboardProps) {
  // Always initialize with the current date from the device
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [activeTab, setActiveTab] = useState<'inicio' | 'agenda' | 'msgs' | 'menu'>('inicio');
  const [viewMode, setViewMode] = useState<'dia' | 'calendario'>('dia');
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isAutoSyncRef = useRef(false);

  // Handle manual refresh
  const handleRefresh = useCallback(async (isAutoSync = false) => {
    if (isSyncing || !onRefresh) return;
    isAutoSyncRef.current = isAutoSync;
    setIsSyncing(true);
    try {
      const result = await onRefresh();
      setLastSyncTime(new Date());
      
      // Show toast with sync count
      if (isAutoSync) {
        if (result?.synced && result.synced > 0) {
          toast.success(`${result.synced} reserva${result.synced > 1 ? 's' : ''} sincronizada${result.synced > 1 ? 's' : ''}!`, {
            duration: 3000,
            position: 'top-center',
          });
        } else {
          toast.success('Sincronização automática concluída', {
            duration: 2000,
            position: 'top-center',
          });
        }
      }
      
      // Vibrate on successful refresh (manual pull-to-refresh)
      if (!isAutoSync) {
        vibrate([50, 30, 50]); // Double vibration pattern
        
        // Show toast for manual refresh
        if (result?.synced !== undefined) {
          if (result.synced > 0) {
            toast.success(`${result.synced} reserva${result.synced > 1 ? 's' : ''} sincronizada${result.synced > 1 ? 's' : ''}!`);
          } else {
            toast.success('Nenhuma nova reserva');
          }
        }
      }
    } finally {
      setIsSyncing(false);
      isAutoSyncRef.current = false;
    }
  }, [onRefresh, isSyncing]);

  // Auto-sync every minute
  useEffect(() => {
    if (!onRefresh) return;

    const interval = setInterval(() => {
      handleRefresh(true); // Pass true to indicate auto-sync
    }, AUTO_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [handleRefresh, onRefresh]);

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isSyncing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
      
      // Light vibration when reaching threshold
      if (diff * 0.5 >= PULL_THRESHOLD && diff * 0.5 < PULL_THRESHOLD + 5) {
        vibrate(20);
      }
    }
  }, [isPulling, isSyncing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isSyncing) {
      await handleRefresh(false); // Manual refresh
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, isSyncing, handleRefresh]);

  // Format last sync time
  const lastSyncText = useMemo(() => {
    if (!lastSyncTime) return null;
    return formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ptBR });
  }, [lastSyncTime]);

  // Generate week days for the calendar strip (Dia view)
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Generate month days for calendar view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days from previous month
    const startDayOfWeek = getDay(start);
    const paddingBefore = Array.from({ length: startDayOfWeek }, (_, i) => 
      addDays(start, -(startDayOfWeek - i))
    );
    
    return [...paddingBefore, ...days];
  }, [currentMonth]);

  // Filter schedules for selected date
  const selectedDaySchedules = useMemo(() => {
    return schedules.filter(s => isSameDay(s.checkOut, selectedDate))
      .sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime());
  }, [schedules, selectedDate]);

  // Get next day with schedules after selected date
  const nextDaySchedules = useMemo(() => {
    const tomorrow = addDays(selectedDate, 1);
    return schedules.filter(s => isSameDay(s.checkOut, tomorrow))
      .sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime());
  }, [schedules, selectedDate]);

  // Count tasks with indicators for each day
  const dayIndicators = useMemo(() => {
    const indicators: Record<string, { pending: number; completed: number; gold: number }> = {};
    schedules.forEach(s => {
      const dateKey = format(s.checkOut, 'yyyy-MM-dd');
      if (!indicators[dateKey]) {
        indicators[dateKey] = { pending: 0, completed: 0, gold: 0 };
      }
      if (s.status === 'completed') {
        indicators[dateKey].completed++;
      } else if (s.status === 'waiting' || s.status === 'released') {
        indicators[dateKey].pending++;
      } else {
        indicators[dateKey].gold++;
      }
    });
    return indicators;
  }, [schedules]);

  // Separate schedules by status
  const pendingSchedules = selectedDaySchedules.filter(s => s.status === 'waiting' || s.status === 'released');
  const inProgressSchedules = selectedDaySchedules.filter(s => s.status === 'cleaning');
  const completedSchedules = selectedDaySchedules.filter(s => s.status === 'completed');

  // Find next checkout
  const nextCheckout = useMemo(() => {
    return selectedDaySchedules.find(s => 
      s.status !== 'completed' && 
      s.status !== 'cleaning' &&
      !pendingSchedules.slice(0, 1).includes(s)
    );
  }, [selectedDaySchedules, pendingSchedules]);

  const formatTime = (date: Date) => format(date, 'HH:mm');
  const monthName = format(viewMode === 'calendario' ? currentMonth : selectedDate, "MMMM", { locale: ptBR });
  const yearNumber = format(viewMode === 'calendario' ? currentMonth : selectedDate, "yyyy");
  const weekNumber = getWeek(selectedDate, { weekStartsOn: 0 });
  const isSelectedToday = isSameDay(selectedDate, new Date());

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-stone-50 dark:bg-[#22252a] font-display text-slate-800 dark:text-slate-100 antialiased touch-pan-y"
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-all duration-200 z-30",
          pullDistance > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          top: Math.min(pullDistance - 40, 60),
          transform: `scale(${Math.min(pullDistance / PULL_THRESHOLD, 1)})`
        }}
      >
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700",
          pullDistance >= PULL_THRESHOLD && "bg-primary text-white border-primary"
        )}>
          <RefreshCw className={cn(
            "w-4 h-4",
            isSyncing && "animate-spin",
            pullDistance >= PULL_THRESHOLD ? "text-white" : "text-primary"
          )} />
          <span className={cn(
            "text-xs font-medium",
            pullDistance >= PULL_THRESHOLD ? "text-white" : "text-slate-600 dark:text-slate-300"
          )}>
            {pullDistance >= PULL_THRESHOLD ? "Solte para atualizar" : "Puxe para atualizar"}
          </span>
        </div>
      </div>

      {/* Header */}
      <header 
        className="sticky top-0 z-20 flex items-center justify-between bg-stone-50/90 dark:bg-[#22252a]/90 px-6 py-4 backdrop-blur-md transition-all"
        style={{ transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined }}
      >
        {viewMode === 'calendario' ? (
          <>
            <button className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
              <span className="material-symbols-outlined text-[#8A8B88] dark:text-slate-400">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="flex items-center justify-center rounded-full w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <div className="flex flex-col items-center">
                <h2 className="text-lg font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
                  <span className="capitalize">{monthName}</span> <span className="text-primary">{yearNumber}</span>
                </h2>
              </div>
              <button 
                onClick={handleNextMonth}
                className="flex items-center justify-center rounded-full w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <button 
              onClick={() => setSelectedDate(prev => addDays(prev, -7))}
              className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-muted"
            >
              <span className="material-symbols-outlined text-muted-foreground text-[20px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-3">
              <button className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-muted">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </button>
              <div className="flex flex-col">
                <h2 className="text-xl font-extrabold leading-none tracking-tight text-foreground">
                  <span className="capitalize">{monthName}</span> <span className="text-primary">{yearNumber}</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Semana {weekNumber}</span>
                  {lastSyncText && (
                    <span className="text-[10px] text-muted-foreground/70">• Sync {lastSyncText}</span>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSelectedDate(prev => addDays(prev, 7))}
              className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-muted"
            >
              <span className="material-symbols-outlined text-muted-foreground text-[20px]">chevron_right</span>
            </button>
          </>
        )}
        <div className="flex items-center gap-2">
          {/* Sync Button */}
          {onRefresh && (
            <button 
              onClick={() => handleRefresh(false)}
              disabled={isSyncing}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5 text-muted-foreground", isSyncing && "animate-spin")} />
              {lastSyncTime && !isSyncing && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-stone-50 dark:border-[#22252a]" />
              )}
            </button>
          )}
          <button className="relative flex h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm dark:border-slate-600">
            <img 
              alt="Profile" 
              className="h-full w-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCp65lGt4lxJFFm-TGO-aIzx2sbcbs3rx9y7l4YFYJ3H4XYtGxLsjG-HTXQ1vYcnIvJibtUKZFMVCRYmEHabCfeC1YblSD4Mh_Naf4Pshd0mXFz0I3iBc07YtELAj5xOZO9NIkMVQycxZHlzhXHFnf95lrmJuG6cQVXr7ifsokiBBbLd9F5hh7uHa765-m2naizne6TJbvT_CeV1dmJCmyrDm42szalavocy6zqBJNWiMam9g3DWEKmAn7eJxQHww-n9ndHlQjpCEUl"
            />
          </button>
        </div>
      </header>

      {/* View Toggle + Today Button */}
      <div className="px-6 pt-2 flex items-center gap-2">
        <div className="relative flex h-10 flex-1 items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          <button 
            onClick={() => setViewMode('dia')}
            className={cn(
              "flex h-full flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all",
              viewMode === 'dia' 
                ? "bg-white dark:bg-[#2d3138] text-slate-900 dark:text-white shadow-sm" 
                : "text-[#8A8B88] hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Dia
          </button>
          <button 
            onClick={() => setViewMode('calendario')}
            className={cn(
              "flex h-full flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all",
              viewMode === 'calendario' 
                ? "bg-white dark:bg-[#2d3138] text-slate-900 dark:text-white shadow-sm" 
                : "text-[#8A8B88] hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Calendário
          </button>
        </div>
        
        {/* Today Button - only shows when not on today */}
        {!isSelectedToday && (
          <button
            onClick={() => {
              const today = new Date();
              setSelectedDate(startOfDay(today));
              setCurrentMonth(startOfMonth(today));
              vibrate(30);
            }}
            className="flex h-10 items-center gap-1.5 px-3 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5" />
            Hoje
          </button>
        )}
      </div>

      {viewMode === 'calendario' ? (
        // Calendar Monthly View
        <main className="flex flex-col w-full px-4 mt-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-3">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-[10px] font-bold tracking-widest text-[#8A8B88] uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-2 gap-x-1">
            {monthDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const indicators = dayIndicators[dateKey] || { pending: 0, completed: 0, gold: 0 };
              const totalTasks = indicators.pending + indicators.completed + indicators.gold;

              if (!isCurrentMonth) {
                return (
                  <div key={index} className="min-h-[3.5rem] flex flex-col items-center pt-2 opacity-30 pointer-events-none">
                    <span className="text-sm font-medium text-slate-400">{format(day, 'd')}</span>
                  </div>
                );
              }

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "group min-h-[3.5rem] rounded-xl flex flex-col items-center justify-start pt-2 gap-1 transition-all",
                    isSelected
                      ? "bg-primary shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-stone-50 dark:ring-offset-[#22252a]"
                      : "border border-transparent hover:bg-white dark:hover:bg-[#2d3138] hover:shadow-soft"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold",
                    isSelected ? "font-bold text-white" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {/* Task indicators */}
                  {totalTasks > 0 && (
                    <div className="flex gap-0.5">
                      {isSelected ? (
                        <>
                          {Array.from({ length: Math.min(indicators.pending, 2) }).map((_, i) => (
                            <div key={`p-${i}`} className="h-1.5 w-1.5 rounded-full bg-white" />
                          ))}
                          {Array.from({ length: Math.min(indicators.completed, 2) }).map((_, i) => (
                            <div key={`c-${i}`} className="h-1.5 w-1.5 rounded-full bg-white/60" />
                          ))}
                          {Array.from({ length: Math.min(indicators.gold, 2) }).map((_, i) => (
                            <div key={`g-${i}`} className="h-1.5 w-1.5 rounded-full bg-[#E0C051] border border-white/20" />
                          ))}
                        </>
                      ) : (
                        <>
                          {Array.from({ length: Math.min(indicators.pending, 2) }).map((_, i) => (
                            <div key={`p-${i}`} className="h-1.5 w-1.5 rounded-full bg-primary" />
                          ))}
                          {Array.from({ length: Math.min(indicators.completed, 2) }).map((_, i) => (
                            <div key={`c-${i}`} className="h-1.5 w-1.5 rounded-full bg-[#8A8B88]/40" />
                          ))}
                          {Array.from({ length: Math.min(indicators.gold, 2) }).map((_, i) => (
                            <div key={`g-${i}`} className="h-1.5 w-1.5 rounded-full bg-[#E0C051]" />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Day Tasks Section */}
          <section className="mt-4 px-2 flex-1">
            <div className="flex items-baseline justify-between mb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h2>
              <span className="text-xs font-semibold text-primary">{selectedDaySchedules.length} Tarefas</span>
            </div>

            {/* Task Cards for Calendar View */}
            <div className="flex flex-col gap-3 pb-6">
              {selectedDaySchedules.map(schedule => (
                <button
                  key={schedule.id}
                  onClick={() => onScheduleClick(schedule)}
                  className="overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft border border-slate-100 dark:border-slate-700 transition-transform active:scale-[0.98] text-left"
                >
                  <div className="flex flex-row p-3 gap-3">
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
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1">
                        {schedule.propertyName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[#8A8B88] dark:text-slate-400">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        <span className="text-xs font-bold">
                          {formatTime(schedule.checkOut)} 
                          <span className="font-normal opacity-70">
                            - {schedule.status === 'completed' ? 'Finalizado' : schedule.status === 'cleaning' ? 'Limpeza' : 'Checkout'}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center pr-1">
                      {schedule.status === 'completed' ? (
                        <span className="material-symbols-outlined text-primary text-[24px]">check_circle</span>
                      ) : schedule.status === 'cleaning' ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#E0C051] ring-2 ring-[#E0C051]/30" />
                      ) : (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-primary/30" />
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {selectedDaySchedules.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[#8A8B88]">Nenhum agendamento para este dia</p>
                </div>
              )}
            </div>
          </section>
        </main>
      ) : (
        // Day View (original implementation)
        <>
          {/* Week Calendar Strip */}
          <section className="mt-4 w-full">
            <div className="flex w-full snap-x gap-3 overflow-x-auto px-6 py-4 hide-scrollbar">
              {weekDays.map((day, index) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const isSelected = isSameDay(day, selectedDate);
                const indicators = dayIndicators[dateKey] || { pending: 0, completed: 0, gold: 0 };
                const totalTasks = indicators.pending + indicators.completed + indicators.gold;
                const isPast = day < startOfDay(new Date()) && !isSameDay(day, new Date());

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "group flex h-24 min-w-[4.5rem] snap-start flex-col items-center justify-center gap-2 rounded-2xl transition-transform active:scale-95",
                      isSelected
                        ? "bg-primary shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-stone-50 dark:ring-offset-[#22252a]"
                        : "bg-white dark:bg-[#2d3138] shadow-sm border border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-semibold",
                      isSelected ? "text-white/90 font-bold" : "text-[#8A8B88]"
                    )}>
                      {dayNames[index]}
                    </span>
                    <span className={cn(
                      "font-bold",
                      isSelected ? "text-2xl text-white font-extrabold" : "text-lg text-slate-900 dark:text-white",
                      isPast && !isSelected && "text-[#8A8B88]"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {/* Task indicators */}
                    <div className="flex gap-1">
                      {isSelected ? (
                        <>
                          {indicators.pending > 0 && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          {indicators.completed > 0 && <div className="h-1.5 w-1.5 rounded-full bg-white/50" />}
                          {indicators.gold > 0 && <div className="h-1.5 w-1.5 rounded-full bg-[#E0C051]" />}
                        </>
                      ) : (
                        <>
                          {indicators.pending > 0 && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          {indicators.completed > 0 && <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />}
                          {indicators.gold > 0 && <div className="h-1.5 w-1.5 rounded-full bg-[#E0C051]" />}
                        </>
                      )}
                      {totalTasks === 0 && <div className="h-1.5 w-1.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Main Content */}
          <main className="flex flex-col">
            {/* Today Section Header */}
            <div className="px-6 pt-6 pb-3 flex items-baseline justify-between">
              <h2 className="text-[26px] font-bold leading-tight text-slate-900 dark:text-white tracking-tight">
                {isSelectedToday ? 'Hoje' : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h2>
              <span className="text-sm font-semibold text-primary">{selectedDaySchedules.length} Tarefas</span>
            </div>

            <div className="px-6 flex flex-col gap-4">
              {/* Empty state when no schedules for today */}
              {selectedDaySchedules.length === 0 && (
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                    Nenhum agendamento
                  </h3>
                  <p className="text-sm text-[#8A8B88] max-w-[280px]">
                    {checkIsToday(selectedDate) 
                      ? 'Você não tem tarefas para hoje. Aproveite o dia! 🎉' 
                      : 'Não há agendamentos para esta data.'}
                  </p>
                </div>
              )}

              {/* All Pending Cards - following the same pattern */}
              {pendingSchedules.map(schedule => (
                <div 
                  key={schedule.id}
                  className="overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft transition-all hover:shadow-md border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex flex-row p-4 gap-4">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">Pendente</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2">{schedule.propertyName}</h3>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88] mb-0.5">Checkout</span>
                          <div className="flex items-center gap-1 text-[#8A8B88]">
                            <Clock className="w-4 h-4" />
                            <p className="text-sm font-bold">{formatTime(schedule.checkOut)}</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onScheduleClick(schedule);
                        }}
                        className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#267373] active:bg-[#267373]"
                      >
                        <Play className="w-5 h-5" />
                        Iniciar Limpeza
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
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex justify-between items-center">
                    <div className="flex -space-x-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold ring-2 ring-white dark:ring-[#2d3138]">
                        {schedule.cleanerName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'N'}
                      </span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-orange-700 text-[10px] font-bold ring-2 ring-white dark:ring-[#2d3138]">JP</span>
                    </div>
                    <span className="text-xs font-medium text-[#8A8B88]">Checkout acontecendo</span>
                  </div>
                </div>
              ))}

              {/* In Progress Cards - same pattern but with different status */}
              {inProgressSchedules.map(schedule => (
                <div 
                  key={schedule.id}
                  className="overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft transition-all hover:shadow-md border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex flex-row p-4 gap-4">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="inline-flex h-2 w-2 rounded-full bg-[#E0C051] animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#E0C051]">Em Limpeza</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2">{schedule.propertyName}</h3>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88] mb-0.5">Checkout</span>
                          <div className="flex items-center gap-1 text-[#8A8B88]">
                            <Clock className="w-4 h-4" />
                            <p className="text-sm font-bold">{formatTime(schedule.checkOut)}</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onScheduleClick(schedule);
                        }}
                        className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-[#E0C051] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#c9a844] active:bg-[#c9a844]"
                      >
                        <Play className="w-5 h-5" />
                        Continuar Limpeza
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
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex justify-between items-center">
                    <div className="flex -space-x-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E0C051]/20 text-[#E0C051] text-[10px] font-bold ring-2 ring-white dark:ring-[#2d3138]">
                        {schedule.cleanerName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'N'}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-[#8A8B88]">Limpeza em andamento</span>
                  </div>
                </div>
              ))}

              {/* Completed Section */}
              {completedSchedules.length > 0 && (
                <>
                  <div className="relative py-2 flex items-center gap-4">
                    <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow" />
                    <span className="text-xs font-bold text-[#8A8B88] uppercase tracking-widest">Concluídas</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow" />
                  </div>
                  
                  {completedSchedules.map(schedule => (
                    <button
                      key={schedule.id}
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
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88]">Checkout</span>
                            <p className="text-xs font-bold text-[#8A8B88]">{formatTime(schedule.checkOut)}</p>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Concluído</span>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Tomorrow Section */}
            {nextDaySchedules.length > 0 && (
              <>
                <div className="mt-4 px-6 pt-4 pb-3">
                  <h2 className="text-[26px] font-bold leading-tight text-slate-900 dark:text-white tracking-tight">Amanhã</h2>
                </div>
                <div className="px-6 flex flex-col gap-4 pb-6">
                  {nextDaySchedules.map(schedule => (
                    <button
                      key={schedule.id}
                      onClick={() => onScheduleClick(schedule)}
                      className="overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft transition-all border border-slate-100 dark:border-slate-700 text-left"
                    >
                      <div className="flex flex-row p-4 gap-4">
                        <div 
                          className="w-20 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 bg-cover bg-center"
                          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJyH8o3WxyRm4SoiaW4QW43i8Xgk-U48CHl9sJlxmgb928H6O_ojBTPufAZfAVrK1R-9KdnhC2BOYyv9gNBVXZz5QFpUkBnYI-hq1NplLAQXtslQy_dvQ83JepoX3TA9_7MT2-40DQwr2vK0Vd1-v8sz-5IxoFsXiUKpLbOk5bN-qi4UmiodI7s8JeQLhs03Xlm6bd0gfamWWVOvDnEz0vQfDekw_9fjfLRjCVcT1ZlfwQ_hWpmLQAl2eYgUNQWrtkINO1NOYD6PJN")' }}
                          role="img"
                          aria-label="Interior do loft"
                        />
                        <div className="flex-1 flex flex-col justify-center">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1">{schedule.propertyName}</h3>
                          <div className="mt-1 flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88] mb-0.5">Checkout</span>
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
                  ))}
                </div>
              </>
            )}
          </main>
        </>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-stone-50/80 dark:bg-[#22252a]/80 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-700/50" />
        <div className="relative flex h-20 items-center justify-around px-2 pb-2">
          <button 
            onClick={() => setActiveTab('inicio')}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 p-2 transition-colors",
              activeTab === 'inicio' ? "text-primary" : "text-[#8A8B88] hover:text-primary"
            )}
          >
            <span className={cn(
              "material-symbols-outlined text-[28px] transition-transform group-active:scale-90",
              activeTab === 'inicio' && "filled"
            )}>dashboard</span>
            <span className={cn("text-[10px]", activeTab === 'inicio' ? "font-bold" : "font-medium")}>Início</span>
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 p-2 transition-colors",
              activeTab === 'agenda' ? "text-primary" : "text-[#8A8B88] hover:text-primary"
            )}
          >
            <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">calendar_today</span>
            <span className={cn("text-[10px]", activeTab === 'agenda' ? "font-bold" : "font-medium")}>Agenda</span>
          </button>
          <button 
            onClick={() => setActiveTab('msgs')}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 p-2 transition-colors",
              activeTab === 'msgs' ? "text-primary" : "text-[#8A8B88] hover:text-primary"
            )}
          >
            <div className="relative">
              <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">chat_bubble</span>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-stone-50 dark:border-[#22252a]" />
            </div>
            <span className={cn("text-[10px]", activeTab === 'msgs' ? "font-bold" : "font-medium")}>Msgs</span>
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 p-2 transition-colors",
              activeTab === 'menu' ? "text-primary" : "text-[#8A8B88] hover:text-primary"
            )}
          >
            <span className="material-symbols-outlined text-[28px] transition-transform group-active:scale-90">menu</span>
            <span className={cn("text-[10px]", activeTab === 'menu' ? "font-bold" : "font-medium")}>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
