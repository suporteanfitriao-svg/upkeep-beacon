import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, differenceInMinutes, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, Camera, AlertTriangle, Building2, ChevronLeft, ChevronRight, TrendingUp, BarChart3 } from 'lucide-react';
import { useSchedules } from '@/hooks/useSchedules';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { ScheduleDetailReadOnly } from '@/components/reports/ScheduleDetailReadOnly';

const ITEMS_PER_PAGE = 10;

function formatDuration(startAt: Date | undefined, endAt: Date | undefined): string {
  if (!startAt || !endAt) return '-';
  const minutes = differenceInMinutes(endAt, startAt);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
}

export default function CleaningHistory() {
  const navigate = useNavigate();
  const { schedules, loading } = useSchedules();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Filter completed schedules from current month
  const completedSchedules = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return schedules
      .filter(s => {
        if (s.status !== 'completed') return false;
        const endAt = s.endAt;
        if (!endAt) return false;
        return endAt >= monthStart && endAt <= monthEnd;
      })
      .sort((a, b) => {
        const aEnd = a.endAt?.getTime() || 0;
        const bEnd = b.endAt?.getTime() || 0;
        return bEnd - aEnd; // Most recent first
      });
  }, [schedules]);

  // Calculate stats for the current month
  const monthStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthCompleted = schedules.filter(s => 
      s.status === 'completed' && 
      s.endAt && 
      isWithinInterval(s.endAt, { start: monthStart, end: monthEnd })
    );

    const prevMonthCompleted = schedules.filter(s => 
      s.status === 'completed' && 
      s.endAt && 
      isWithinInterval(s.endAt, { start: prevMonthStart, end: prevMonthEnd })
    );

    const totalDurationMinutes = thisMonthCompleted.reduce((acc, s) => {
      if (s.startAt && s.endAt) {
        return acc + differenceInMinutes(s.endAt, s.startAt);
      }
      return acc;
    }, 0);

    const avgDuration = thisMonthCompleted.length > 0 
      ? Math.round(totalDurationMinutes / thisMonthCompleted.length) 
      : 0;

    const totalIssues = thisMonthCompleted.reduce((acc, s) => 
      acc + (s.maintenanceIssues?.length || 0), 0
    );

    const growth = prevMonthCompleted.length > 0 
      ? Math.round(((thisMonthCompleted.length - prevMonthCompleted.length) / prevMonthCompleted.length) * 100)
      : thisMonthCompleted.length > 0 ? 100 : 0;

    return {
      total: thisMonthCompleted.length,
      avgDuration,
      totalIssues,
      growth,
      prevMonthTotal: prevMonthCompleted.length
    };
  }, [schedules]);

  // Pagination
  const totalPages = Math.ceil(completedSchedules.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedSchedules = completedSchedules.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
  };

  const handleBack = () => {
    navigate('/');
  };

  // If a schedule is selected, show read-only detail
  if (selectedSchedule) {
    return (
      <ScheduleDetailReadOnly 
        schedule={selectedSchedule} 
        onClose={() => setSelectedSchedule(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#1a1d21]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-stone-50 dark:bg-[#22252a] px-4 py-4 shadow-sm border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Histórico de Limpezas</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })} • {completedSchedules.length} concluídas
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : completedSchedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma limpeza concluída este mês</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{monthStats.total}</p>
                <div className="flex items-center gap-1 mt-1">
                  {monthStats.growth !== 0 && (
                    <span className={cn(
                      "text-xs font-medium flex items-center gap-0.5",
                      monthStats.growth > 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      <TrendingUp className={cn("w-3 h-3", monthStats.growth < 0 && "rotate-180")} />
                      {Math.abs(monthStats.growth)}%
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Tempo Médio</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {monthStats.avgDuration > 60 
                    ? `${Math.floor(monthStats.avgDuration / 60)}h ${monthStats.avgDuration % 60}m`
                    : `${monthStats.avgDuration}min`
                  }
                </p>
                <span className="text-xs text-muted-foreground">por limpeza</span>
              </div>
              
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block">Avarias Registradas</span>
                      <span className="text-xl font-bold text-foreground">{monthStats.totalIssues}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">no mês</span>
                </div>
              </div>
            </div>

            {/* Section Title */}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Todas as Limpezas
            </h3>

            {/* Schedule List */}
            <div className="space-y-3">
              {displayedSchedules.map((schedule) => {
                const issueCount = schedule.maintenanceIssues?.length || 0;
                const photoCount = Object.values(schedule.categoryPhotos || {}).reduce(
                  (acc, urls) => acc + (Array.isArray(urls) ? urls.length : 0),
                  0
                );

                return (
                  <button
                    key={schedule.id}
                    onClick={() => handleScheduleClick(schedule)}
                    className="w-full text-left rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      {schedule.propertyImageUrl ? (
                        <img
                          src={schedule.propertyImageUrl}
                          alt={schedule.propertyName}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{schedule.propertyName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {schedule.endAt ? format(schedule.endAt, "dd/MM 'às' HH:mm", { locale: ptBR }) : '-'}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(schedule.startAt, schedule.endAt)}
                          </span>
                          {issueCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {issueCount}
                            </span>
                          )}
                          {photoCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Camera className="w-3.5 h-3.5" />
                              {photoCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                        Concluída
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    currentPage === 1
                      ? "text-muted-foreground opacity-50 cursor-not-allowed"
                      : "text-primary hover:bg-primary/10"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    currentPage === totalPages
                      ? "text-muted-foreground opacity-50 cursor-not-allowed"
                      : "text-primary hover:bg-primary/10"
                  )}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border z-50 px-6 py-3 flex justify-around items-center text-xs font-medium text-muted-foreground">
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">home</span>
          <span>Início</span>
        </button>
        <button onClick={() => navigate('/?tab=agenda')} className="flex flex-col items-center gap-1 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">calendar_today</span>
          <span>Agenda</span>
        </button>
        <button onClick={() => navigate('/minha-conta')} className="flex flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined text-xl">menu</span>
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}