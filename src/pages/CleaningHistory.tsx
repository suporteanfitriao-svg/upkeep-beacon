import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, differenceInMinutes, isWithinInterval, subMonths, setMonth, setYear, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Camera, AlertTriangle, Building2, ChevronLeft, ChevronRight, TrendingUp, BarChart3 } from 'lucide-react';
import { useSchedules } from '@/hooks/useSchedules';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { ScheduleDetailReadOnly } from '@/components/reports/ScheduleDetailReadOnly';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileEmptyState } from '@/components/mobile/MobileEmptyState';

const ITEMS_PER_PAGE = 10;

const MONTHS = [
  { value: 0, label: 'Janeiro' },
  { value: 1, label: 'Fevereiro' },
  { value: 2, label: 'Março' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Maio' },
  { value: 5, label: 'Junho' },
  { value: 6, label: 'Julho' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Setembro' },
  { value: 9, label: 'Outubro' },
  { value: 10, label: 'Novembro' },
  { value: 11, label: 'Dezembro' },
];

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
  
  // Filter states
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(now));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(now));

  // Generate available years (current year and 2 previous years)
  const availableYears = useMemo(() => {
    const currentYear = getYear(new Date());
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  // Filter completed schedules by selected month/year
  const completedSchedules = useMemo(() => {
    const filterDate = setYear(setMonth(new Date(), selectedMonth), selectedYear);
    const monthStart = startOfMonth(filterDate);
    const monthEnd = endOfMonth(filterDate);

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
  }, [schedules, selectedMonth, selectedYear]);

  // Calculate stats for the selected month
  const monthStats = useMemo(() => {
    const filterDate = setYear(setMonth(new Date(), selectedMonth), selectedYear);
    const monthStart = startOfMonth(filterDate);
    const monthEnd = endOfMonth(filterDate);
    const prevMonthDate = subMonths(filterDate, 1);
    const prevMonthStart = startOfMonth(prevMonthDate);
    const prevMonthEnd = endOfMonth(prevMonthDate);

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
  }, [schedules, selectedMonth, selectedYear]);

  // Reset page when filters change
  const handleMonthChange = (value: string) => {
    setSelectedMonth(parseInt(value));
    setCurrentPage(1);
  };

  const handleYearChange = (value: string) => {
    setSelectedYear(parseInt(value));
    setCurrentPage(1);
  };

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
      {/* REGRA 1: Header com botão Voltar obrigatório */}
      <MobilePageHeader 
        title="Histórico de Limpezas"
        subtitle={`${completedSchedules.length} concluídas`}
      />

      {/* Month/Year Filters */}
      <div className="px-4 pt-4 flex gap-2">
        <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="flex-1 bg-white dark:bg-slate-800">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-800 z-50">
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-28 bg-white dark:bg-slate-800">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-800 z-50">
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <main className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : completedSchedules.length === 0 ? (
          /* REGRA 5: Estado vazio com mensagem amigável */
          <MobileEmptyState 
            type="schedule"
            message="Nenhuma limpeza concluída este mês"
            submessage="Selecione outro período para ver o histórico"
          />
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

      {/* MENU INFERIOR: Gerenciado pelo MobileAdminLayout - não renderiza aqui */}
    </div>
  );
}