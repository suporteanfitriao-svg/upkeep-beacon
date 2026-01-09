import { useState, useMemo } from 'react';
import { format, isSameDay, addDays, startOfWeek, getWeek, isAfter, startOfDay, isToday as checkIsToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Play, Clock, Check, ChevronRight, LayoutGrid, MessageSquare, Menu } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';

interface MobileDashboardProps {
  schedules: Schedule[];
  onScheduleClick: (schedule: Schedule) => void;
  onStartCleaning: (scheduleId: string) => void;
}

const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function MobileDashboard({ schedules, onScheduleClick, onStartCleaning }: MobileDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'inicio' | 'agenda' | 'msgs' | 'menu'>('inicio');
  const [viewMode, setViewMode] = useState<'dia' | 'calendario'>('calendario');

  // Generate week days for the calendar strip
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

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

  // Upcoming schedules (next 7 days) when no schedules for selected day
  const upcomingSchedules = useMemo(() => {
    const today = startOfDay(new Date());
    return schedules
      .filter(s => isAfter(s.checkOut, today))
      .sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime())
      .slice(0, 5);
  }, [schedules]);

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

  // Find next checkout (upcoming but not completed)
  const nextCheckout = useMemo(() => {
    const now = new Date();
    return selectedDaySchedules.find(s => 
      s.status !== 'completed' && 
      s.status !== 'cleaning' &&
      !pendingSchedules.slice(0, 1).includes(s)
    );
  }, [selectedDaySchedules, pendingSchedules]);

  const formatTime = (date: Date) => format(date, 'HH:mm');
  const currentMonth = format(selectedDate, "MMMM", { locale: ptBR });
  const currentYear = format(selectedDate, "yyyy");
  const weekNumber = getWeek(selectedDate, { weekStartsOn: 0 });
  const isSelectedToday = isSameDay(selectedDate, new Date());

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background font-display text-foreground antialiased">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background/90 dark:bg-background/90 px-6 py-4 backdrop-blur-md transition-all">
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-muted">
            <Calendar className="w-6 h-6 text-muted-foreground" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold leading-none tracking-tight text-foreground">
              <span className="capitalize">{currentMonth}</span> <span className="text-primary">{currentYear}</span>
            </h2>
            <span className="text-xs font-medium text-muted-foreground">Semana {weekNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative flex h-10 w-10 overflow-hidden rounded-full border-2 border-card shadow-sm">
            <img 
              alt="Profile" 
              className="h-full w-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCp65lGt4lxJFFm-TGO-aIzx2sbcbs3rx9y7l4YFYJ3H4XYtGxLsjG-HTXQ1vYcnIvJibtUKZFMVCRYmEHabCfeC1YblSD4Mh_Naf4Pshd0mXFz0I3iBc07YtELAj5xOZO9NIkMVQycxZHlzhXHFnf95lrmJuG6cQVXr7ifsokiBBbLd9F5hh7uHa765-m2naizne6TJbvT_CeV1dmJCmyrDm42szalavocy6zqBJNWiMam9g3DWEKmAn7eJxQHww-n9ndHlQjpCEUl"
            />
          </button>
        </div>
      </header>

      {/* View Toggle */}
      <div className="px-6 pt-2">
        <div className="relative flex h-10 w-full items-center rounded-xl bg-muted p-1">
          <button 
            onClick={() => setViewMode('dia')}
            className={cn(
              "flex h-full flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all",
              viewMode === 'dia' 
                ? "bg-card text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Dia
          </button>
          <button 
            onClick={() => setViewMode('calendario')}
            className={cn(
              "flex h-full flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all",
              viewMode === 'calendario' 
                ? "bg-card text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Calendário
          </button>
        </div>
      </div>

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
                    ? "bg-primary shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "bg-card shadow-sm border border-border"
                )}
              >
                <span className={cn(
                  "text-xs font-semibold",
                  isSelected ? "text-primary-foreground/90 font-bold" : "text-muted-foreground"
                )}>
                  {dayNames[index]}
                </span>
                <span className={cn(
                  "font-bold",
                  isSelected ? "text-2xl text-primary-foreground font-extrabold" : "text-lg text-foreground",
                  isPast && !isSelected && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                {/* Task indicators */}
                <div className="flex gap-1">
                  {isSelected ? (
                    <>
                      {indicators.pending > 0 && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                      {indicators.completed > 0 && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground/50" />}
                      {indicators.gold > 0 && <div className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </>
                  ) : (
                    <>
                      {indicators.pending > 0 && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      {indicators.completed > 0 && <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />}
                      {indicators.gold > 0 && <div className="h-1.5 w-1.5 rounded-full bg-accent" />}
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
          <h2 className="text-[26px] font-bold leading-tight text-foreground tracking-tight">
            {isSelectedToday ? 'Hoje' : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h2>
          <span className="text-sm font-semibold text-primary">{selectedDaySchedules.length} Tarefas</span>
        </div>

        <div className="px-6 flex flex-col gap-4">
          {/* Featured Pending Card */}
          {pendingSchedules.slice(0, 1).map(schedule => (
            <div 
              key={schedule.id}
              className="overflow-hidden rounded-2xl bg-card shadow-soft transition-all hover:shadow-md dark:border dark:border-border"
            >
              <div className="flex flex-row p-4 gap-4">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Pendente</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground leading-tight mb-2">{schedule.propertyName}</h3>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Checkout</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <p className="text-sm font-bold">{formatTime(schedule.checkOut)}</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartCleaning(schedule.id);
                    }}
                    className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-dark active:bg-primary-dark"
                  >
                    <Play className="w-5 h-5" />
                    Iniciar Limpeza
                  </button>
                </div>
                <div 
                  className="w-28 shrink-0 rounded-xl bg-muted bg-cover bg-center"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAQZ1I3CYnYqqEiuhrq2tbVgN3t8Z7HrwILWPCxwgUNVwieY1obhBX55oEL9CmXHad1VeI1NFMykr6ob4b9wDsu-g4DqlzR77f3bxPc-epeA5E4XyXz1Ey-rihJBZbnw2Oxv8ufUHDfUMazld15ptZG4SQ_HcWXy1B48idcbq-KsGmbPQxk7s-6kHBHmZqYPvDwZj28SWRo1DkvlhOaBLfP7KO4oXH0EpEPp9B6cbVBrOEHduEtWQ8pLnxfPQzYE7-gcnacXyTlhT9i")' }}
                  role="img"
                  aria-label="Interior do apartamento"
                />
              </div>
              <div className="border-t border-border bg-muted/50 px-4 py-2 flex justify-between items-center">
                <div className="flex -space-x-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold ring-2 ring-card">
                    {schedule.cleanerName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AS'}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-[10px] font-bold ring-2 ring-card">JP</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">Checkout acontecendo</span>
              </div>
            </div>
          ))}

          {/* Next Checkout Card */}
          {(nextCheckout || inProgressSchedules[0]) && (
            <button
              onClick={() => onScheduleClick(nextCheckout || inProgressSchedules[0])}
              className="group relative overflow-hidden rounded-2xl bg-card shadow-soft dark:border dark:border-border text-left"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-accent" />
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">Check out Próximo</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {(nextCheckout || inProgressSchedules[0])?.propertyName}
                  </h3>
                  <div className="mt-1 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Checkout</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <p className="text-sm font-bold">{formatTime((nextCheckout || inProgressSchedules[0])?.checkOut)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            </button>
          )}

          {/* Completed Section */}
          {completedSchedules.length > 0 && (
            <>
              <div className="relative py-2 flex items-center gap-4">
                <div className="h-px bg-border flex-grow" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Concluídas</span>
                <div className="h-px bg-border flex-grow" />
              </div>
              
              {completedSchedules.map(schedule => (
                <button
                  key={schedule.id}
                  onClick={() => onScheduleClick(schedule)}
                  className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-3 opacity-70 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-completed-bg text-status-completed">
                      <Check className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-foreground line-through decoration-muted-foreground/30">{schedule.propertyName}</p>
                      <div className="mt-1 flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Checkout</span>
                        <p className="text-xs font-bold text-muted-foreground">{formatTime(schedule.checkOut)}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-status-completed">Concluído</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Tomorrow Section */}
        {nextDaySchedules.length > 0 && (
          <>
            <div className="mt-4 px-6 pt-4 pb-3">
              <h2 className="text-[26px] font-bold leading-tight text-foreground tracking-tight">Amanhã</h2>
            </div>
            <div className="px-6 flex flex-col gap-4 pb-6">
              {nextDaySchedules.map(schedule => (
                <button
                  key={schedule.id}
                  onClick={() => onScheduleClick(schedule)}
                  className="overflow-hidden rounded-2xl bg-card shadow-soft transition-all dark:border dark:border-border text-left"
                >
                  <div className="flex flex-row p-4 gap-4">
                    <div 
                      className="w-20 shrink-0 rounded-xl bg-muted bg-cover bg-center"
                      style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJyH8o3WxyRm4SoiaW4QW43i8Xgk-U48CHl9sJlxmgb928H6O_ojBTPufAZfAVrK1R-9KdnhC2BOYyv9gNBVXZz5QFpUkBnYI-hq1NplLAQXtslQy_dvQ83JepoX3TA9_7MT2-40DQwr2vK0Vd1-v8sz-5IxoFsXiUKpLbOk5bN-qi4UmiodI7s8JeQLhs03Xlm6bd0gfamWWVOvDnEz0vQfDekw_9fjfLRjCVcT1ZlfwQ_hWpmLQAl2eYgUNQWrtkINO1NOYD6PJN")' }}
                      role="img"
                      aria-label="Interior do loft"
                    />
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="text-base font-bold text-foreground leading-tight mb-1">{schedule.propertyName}</h3>
                      <div className="mt-1 flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Checkout</span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <p className="text-sm font-bold">{formatTime(schedule.checkOut)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">Agendado</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Empty state when no schedules */}
        {selectedDaySchedules.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-lg border-t border-border/50" />
        <div className="relative flex h-20 items-center justify-around px-2 pb-2">
          <button 
            onClick={() => setActiveTab('inicio')}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 p-2 transition-colors",
              activeTab === 'inicio' ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <LayoutGrid className={cn("w-7 h-7 transition-transform group-active:scale-90", activeTab === 'inicio' && "fill-current")} />
            <span className={cn("text-[10px]", activeTab === 'inicio' ? "font-bold" : "font-medium")}>Início</span>
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 p-2 transition-colors",
              activeTab === 'agenda' ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Calendar className="w-7 h-7 transition-transform group-active:scale-90" />
            <span className={cn("text-[10px]", activeTab === 'agenda' ? "font-bold" : "font-medium")}>Agenda</span>
          </button>
          <button 
            onClick={() => setActiveTab('msgs')}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 p-2 transition-colors",
              activeTab === 'msgs' ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <div className="relative">
              <MessageSquare className="w-7 h-7 transition-transform group-active:scale-90" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
            </div>
            <span className={cn("text-[10px]", activeTab === 'msgs' ? "font-bold" : "font-medium")}>Msgs</span>
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={cn(
              "group flex flex-col items-center justify-center gap-1 p-2 transition-colors",
              activeTab === 'menu' ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Menu className="w-7 h-7 transition-transform group-active:scale-90" />
            <span className={cn("text-[10px]", activeTab === 'menu' ? "font-bold" : "font-medium")}>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}