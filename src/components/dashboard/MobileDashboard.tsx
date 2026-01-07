import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, addDays, startOfWeek, getWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Play, Clock, Check, ChevronRight, LayoutGrid, MessageSquare, Menu } from 'lucide-react';
import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MobileDashboardProps {
  schedules: Schedule[];
  onScheduleClick: (schedule: Schedule) => void;
  onStartCleaning: (scheduleId: string) => void;
}

const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function MobileDashboard({ schedules, onScheduleClick, onStartCleaning }: MobileDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'inicio' | 'agenda' | 'msgs' | 'menu'>('inicio');

  // Generate week days for the calendar strip
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Filter schedules for selected date
  const todaySchedules = useMemo(() => {
    return schedules.filter(s => {
      const checkOutDate = s.checkOut;
      return isToday(checkOutDate);
    }).sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime());
  }, [schedules]);

  const tomorrowSchedules = useMemo(() => {
    return schedules.filter(s => isTomorrow(s.checkOut))
      .sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime());
  }, [schedules]);

  // Count tasks with indicators for each day
  const dayIndicators = useMemo(() => {
    const indicators: Record<string, number> = {};
    schedules.forEach(s => {
      const dateKey = format(s.checkOut, 'yyyy-MM-dd');
      indicators[dateKey] = (indicators[dateKey] || 0) + 1;
    });
    return indicators;
  }, [schedules]);

  // Separate schedules by status
  const pendingSchedules = todaySchedules.filter(s => s.status === 'waiting' || s.status === 'released');
  const upcomingCheckouts = todaySchedules.filter(s => s.status === 'cleaning');
  const completedSchedules = todaySchedules.filter(s => s.status === 'completed');

  const formatTime = (date: Date) => format(date, 'HH:mm');
  const currentMonth = format(selectedDate, "MMMM yyyy", { locale: ptBR });
  const weekNumber = getWeek(selectedDate, { weekStartsOn: 0 });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold capitalize text-foreground">
              {currentMonth}
            </h1>
            <p className="text-xs text-muted-foreground">Semana {weekNumber}</p>
          </div>
        </div>
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback className="bg-orange-100 text-orange-700">U</AvatarFallback>
        </Avatar>
      </header>

      {/* Week Calendar Strip */}
      <div className="px-2 py-3 flex gap-1 overflow-x-auto scrollbar-hide">
        {weekDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          const taskCount = dayIndicators[dateKey] || 0;
          const isCurrentDay = isToday(day);

          return (
            <button
              key={index}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "flex flex-col items-center min-w-[52px] py-2 px-3 rounded-2xl transition-all",
                isSelected
                  ? "bg-[hsl(var(--status-released))] text-white shadow-lg shadow-[hsl(var(--status-released))]/30"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn(
                "text-[10px] font-medium mb-1",
                isSelected ? "text-white/80" : "text-muted-foreground"
              )}>
                {dayNames[index]}
              </span>
              <span className={cn(
                "text-lg font-bold",
                isSelected ? "text-white" : "text-foreground"
              )}>
                {format(day, 'd')}
              </span>
              {/* Task indicators */}
              <div className="flex gap-0.5 mt-1 h-2">
                {Array.from({ length: Math.min(taskCount, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-white/80" : "bg-[hsl(var(--status-released))]"
                    )}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        {/* Today Section */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="text-2xl font-bold text-foreground">Hoje</h2>
          <span className="text-sm font-medium text-[hsl(var(--status-released))]">
            {todaySchedules.length} Tarefas
          </span>
        </div>

        {/* Pending Task - Featured Card */}
        {pendingSchedules.length > 0 && (
          <div className="mb-4">
            {pendingSchedules.slice(0, 1).map(schedule => (
              <div
                key={schedule.id}
                className="bg-card rounded-2xl border-l-4 border-l-[hsl(var(--status-released))] p-4 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-[hsl(var(--status-released))]" />
                      <span className="text-xs font-semibold text-[hsl(var(--status-released))] uppercase">
                        Pendente
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {schedule.propertyName}
                    </h3>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Checkout</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(schedule.checkOut)}</span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[hsl(var(--status-released))] hover:bg-[hsl(var(--status-released))]/90 text-white rounded-full px-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCleaning(schedule.id);
                      }}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Iniciar Limpeza
                    </Button>
                  </div>
                  <div className="w-28 h-24 rounded-xl bg-muted overflow-hidden">
                    <img
                      src="/placeholder.svg"
                      alt={schedule.propertyName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <div className="flex -space-x-2">
                    <Avatar className="h-6 w-6 border-2 border-card">
                      <AvatarImage src={schedule.cleanerAvatar} />
                      <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">
                        {schedule.cleanerName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Checkout acontecendo
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Checkout */}
        {upcomingCheckouts.length > 0 && (
          <div className="mb-4">
            {upcomingCheckouts.map(schedule => (
              <button
                key={schedule.id}
                onClick={() => onScheduleClick(schedule)}
                className="w-full bg-card rounded-2xl border-l-4 border-l-[hsl(var(--status-progress))] p-4 shadow-sm text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[hsl(var(--status-progress))] uppercase">
                      Check out próximo
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-1">
                      {schedule.propertyName}
                    </h3>
                    <p className="text-xs text-muted-foreground uppercase">Checkout</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(schedule.checkOut)}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Completed Section */}
        {completedSchedules.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Concluídas
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {completedSchedules.map(schedule => (
                <button
                  key={schedule.id}
                  onClick={() => onScheduleClick(schedule)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--status-completed-bg))] flex items-center justify-center">
                    <Check className="w-4 h-4 text-[hsl(var(--status-completed))]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {schedule.propertyName}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="uppercase">Checkout</span>
                      <span>{formatTime(schedule.checkOut)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[hsl(var(--status-completed))] border-[hsl(var(--status-completed))]/30 bg-[hsl(var(--status-completed-bg))]">
                    Concluído
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tomorrow Section */}
        {tomorrowSchedules.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-3">Amanhã</h2>
            <div className="space-y-2">
              {tomorrowSchedules.slice(0, 3).map(schedule => (
                <button
                  key={schedule.id}
                  onClick={() => onScheduleClick(schedule)}
                  className="w-full flex items-center gap-3 bg-card rounded-2xl p-3 shadow-sm text-left"
                >
                  <div className="w-16 h-14 rounded-xl bg-muted overflow-hidden">
                    <img
                      src="/placeholder.svg"
                      alt={schedule.propertyName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {schedule.propertyName}
                    </h4>
                    <p className="text-xs text-muted-foreground uppercase">Checkout</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(schedule.checkOut)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    Agendado
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {todaySchedules.length === 0 && tomorrowSchedules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab('inicio')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
              activeTab === 'inicio' ? "text-[hsl(var(--status-released))]" : "text-muted-foreground"
            )}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Início</span>
          </button>
          <button
            onClick={() => setActiveTab('agenda')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
              activeTab === 'agenda' ? "text-[hsl(var(--status-released))]" : "text-muted-foreground"
            )}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-medium">Agenda</span>
          </button>
          <button
            onClick={() => setActiveTab('msgs')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors relative",
              activeTab === 'msgs' ? "text-[hsl(var(--status-released))]" : "text-muted-foreground"
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <div className="absolute top-1 right-3 w-2 h-2 bg-[hsl(var(--status-progress))] rounded-full" />
            <span className="text-[10px] font-medium">Msgs</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors",
              activeTab === 'menu' ? "text-[hsl(var(--status-released))]" : "text-muted-foreground"
            )}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
