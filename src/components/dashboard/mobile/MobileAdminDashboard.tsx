import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, isToday, isTomorrow, isSameDay, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, ChevronRight, AlertTriangle, Building2, Calendar, Search, Filter, Clock, User, Check, Play, Loader2 } from 'lucide-react';
import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CleaningTimeAlert } from '@/hooks/useCleaningTimeAlert';
import type { DateRange } from 'react-day-picker';

interface MobileAdminDashboardProps {
  schedules: Schedule[];
  filteredSchedules: Schedule[];
  stats: {
    waiting: number;
    released: number;
    cleaning: number;
    completed: number;
    maintenanceAlerts: number;
    delayed: number;
  };
  cleaningTimeAlerts: CleaningTimeAlert[];
  onScheduleClick: (schedule: Schedule) => void;
  onRefresh?: () => Promise<{ synced: number } | null>;
  lastSyncTime?: Date | null;
  isSyncing?: boolean;
  dateFilter: string;
  onDateFilterChange: (filter: string) => void;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  waiting: { 
    label: 'Aguardando', 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  released: { 
    label: 'Liberado', 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: <Check className="w-3.5 h-3.5" />
  },
  cleaning: { 
    label: 'Em Limpeza', 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Play className="w-3.5 h-3.5" />
  },
  completed: { 
    label: 'Finalizado', 
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <Check className="w-3.5 h-3.5" />
  },
};

export function MobileAdminDashboard({
  schedules,
  filteredSchedules,
  stats,
  cleaningTimeAlerts,
  onScheduleClick,
  onRefresh,
  lastSyncTime,
  isSyncing = false,
  dateFilter,
  onDateFilterChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
}: MobileAdminDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lastSyncText = useMemo(() => {
    if (!lastSyncTime) return null;
    return formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ptBR });
  }, [lastSyncTime]);

  const handleRefresh = useCallback(async () => {
    if (isSyncing || !onRefresh) return;
    const result = await onRefresh();
    if (result?.synced !== undefined) {
      if (result.synced > 0) {
        toast.success(`${result.synced} reserva${result.synced > 1 ? 's' : ''} sincronizada${result.synced > 1 ? 's' : ''}!`);
      } else {
        toast.success('Nenhuma nova reserva');
      }
    }
  }, [onRefresh, isSyncing]);

  const dateFilterOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'tomorrow', label: 'Amanhã' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
  ];

  const statusFilterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'waiting', label: 'Aguardando' },
    { value: 'released', label: 'Liberado' },
    { value: 'cleaning', label: 'Em Limpeza' },
    { value: 'completed', label: 'Finalizado' },
  ];

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-stone-50 dark:bg-[#1a1d21] flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-20 bg-stone-50/95 dark:bg-[#1a1d21]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Painel</span>
            <h1 className="text-lg font-bold text-foreground">Administrativo</h1>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button 
                onClick={handleRefresh}
                disabled={isSyncing}
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className={cn("w-5 h-5 text-muted-foreground", isSyncing && "animate-spin")} />
              </button>
            )}
            <button 
              onClick={() => navigate('/minha-conta')}
              className="relative flex h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm dark:border-slate-600"
            >
              <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">
                  {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
            </button>
          </div>
        </div>
        {lastSyncText && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Última sincronização {lastSyncText}
          </p>
        )}
      </header>

      {/* Status Cards */}
      <div className="px-4 py-3 grid grid-cols-4 gap-2">
        <button
          onClick={() => onStatusFilterChange(statusFilter === 'waiting' ? 'all' : 'waiting')}
          className={cn(
            "flex flex-col items-center justify-center p-3 rounded-xl transition-all",
            statusFilter === 'waiting' 
              ? "bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-400" 
              : "bg-white dark:bg-slate-800 shadow-sm"
          )}
        >
          <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.waiting}</span>
          <span className="text-[10px] text-muted-foreground">Aguardando</span>
        </button>
        <button
          onClick={() => onStatusFilterChange(statusFilter === 'released' ? 'all' : 'released')}
          className={cn(
            "flex flex-col items-center justify-center p-3 rounded-xl transition-all",
            statusFilter === 'released' 
              ? "bg-primary/20 ring-2 ring-primary" 
              : "bg-white dark:bg-slate-800 shadow-sm"
          )}
        >
          <span className="text-xl font-bold text-primary">{stats.released}</span>
          <span className="text-[10px] text-muted-foreground">Liberado</span>
        </button>
        <button
          onClick={() => onStatusFilterChange(statusFilter === 'cleaning' ? 'all' : 'cleaning')}
          className={cn(
            "flex flex-col items-center justify-center p-3 rounded-xl transition-all",
            statusFilter === 'cleaning' 
              ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400" 
              : "bg-white dark:bg-slate-800 shadow-sm"
          )}
        >
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.cleaning}</span>
          <span className="text-[10px] text-muted-foreground">Limpando</span>
        </button>
        <button
          onClick={() => onStatusFilterChange(statusFilter === 'completed' ? 'all' : 'completed')}
          className={cn(
            "flex flex-col items-center justify-center p-3 rounded-xl transition-all",
            statusFilter === 'completed' 
              ? "bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-emerald-400" 
              : "bg-white dark:bg-slate-800 shadow-sm"
          )}
        >
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</span>
          <span className="text-[10px] text-muted-foreground">Finalizado</span>
        </button>
      </div>

      {/* Cleaning Time Alerts */}
      {cleaningTimeAlerts.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              ALERTAS DE TEMPO ({cleaningTimeAlerts.length})
            </span>
          </div>
          <div className="space-y-2">
            {cleaningTimeAlerts.slice(0, 3).map((alert) => (
              <button
                key={alert.schedule.id}
                onClick={() => onScheduleClick(alert.schedule)}
                className={cn(
                  "w-full p-3 rounded-xl text-left transition-all active:scale-[0.99]",
                  alert.type === 'exceeding' 
                    ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" 
                    : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{alert.schedule.propertyName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {alert.schedule.cleanerName} • Check-in {format(alert.checkInTime, 'HH:mm')}
                    </p>
                  </div>
                  <div className={cn(
                    "text-right",
                    alert.type === 'exceeding' ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  )}>
                    <span className="text-sm font-bold">
                      {alert.minutesRemaining < 0 
                        ? `+${Math.abs(alert.minutesRemaining)}min` 
                        : `${alert.minutesRemaining}min`}
                    </span>
                    <p className="text-[10px]">{alert.type === 'exceeding' ? 'excedido' : 'restantes'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 py-2 space-y-3">
        {/* Date Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {dateFilterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onDateFilterChange(option.value)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                dateFilter === option.value
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-white dark:bg-slate-800 text-muted-foreground shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar propriedade ou responsável..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Schedule List */}
      <div className="flex-1 px-4 py-2 space-y-3 pb-safe">
        {filteredSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum agendamento encontrado</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Ajuste os filtros para ver mais resultados</p>
          </div>
        ) : (
          filteredSchedules.map((schedule) => {
            const statusConfig = STATUS_CONFIG[schedule.status];
            return (
              <button
                key={schedule.id}
                onClick={() => onScheduleClick(schedule)}
                className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 text-left transition-all active:scale-[0.99] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {schedule.propertyName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {format(schedule.checkOut, "dd/MM 'às' HH:mm")}
                      </span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-xs font-medium text-foreground">
                        {format(schedule.checkIn, "HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {schedule.cleanerName}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold",
                      statusConfig.bgColor,
                      statusConfig.color
                    )}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-3 safe-area-bottom">
        <div className="flex items-center justify-around">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center gap-1 text-primary"
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] font-medium">Início</span>
          </button>
          <button
            onClick={() => navigate('/propriedades')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] font-medium">Propriedades</span>
          </button>
          <button
            onClick={() => navigate('/equipe')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Equipe</span>
          </button>
          <button
            onClick={() => navigate('/configuracoes')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span className="text-[10px] font-medium">Config</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
