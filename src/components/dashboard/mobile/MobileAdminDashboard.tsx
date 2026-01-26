import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, formatDistanceToNow, isSameDay, startOfDay, addDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, ChevronRight, AlertTriangle, Building2, Calendar, Search, Clock, User, Check, Play, Eye, ChevronLeft, Settings, ClipboardList, X, ChevronDown } from 'lucide-react';
import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CleaningTimeAlert } from '@/hooks/useCleaningTimeAlert';
import { useViewMode, ViewMode } from '@/hooks/useViewMode';
import { MobileInfiniteDayStrip } from './MobileInfiniteDayStrip';
import { MobileAdminFilterTabs, AdminAgendaViewMode } from './MobileAdminFilterTabs';
import { MobileAdminScheduleCard } from './MobileAdminScheduleCard';
import { MobileEmptyState } from '@/components/mobile/MobileEmptyState';

import { LocationModal } from '../LocationModal';
import { PasswordModal } from '../PasswordModal';
import { useTeamMemberId } from '@/hooks/useTeamMemberId';
import { supabase } from '@/integrations/supabase/client';

// REGRA 4: Tipos de aba para Anfitrião
export type ManagerActiveTab = 'home' | 'calendario';

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
  propertyFilter?: string;
  onPropertyFilterChange?: (property: string) => void;
  onUpdateSchedule?: (schedule: Schedule) => void;
  // REGRA 4: Aba ativa para Anfitrião (home = contadores, calendario = agenda)
  managerActiveTab?: ManagerActiveTab;
}

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
  propertyFilter = 'all',
  onPropertyFilterChange,
  onUpdateSchedule,
  managerActiveTab = 'calendario', // Default to calendario for backwards compatibility
}: MobileAdminDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { viewMode, setViewMode, canSwitchView, getViewLabel } = useViewMode();
  const [showViewModeMenu, setShowViewModeMenu] = useState(false);
  const [completedPage, setCompletedPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Search and property filter states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPropertyFilterOpen, setIsPropertyFilterOpen] = useState(false);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Calendar/date state - matching cleaner layout
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [agendaViewMode, setAgendaViewMode] = useState<AdminAgendaViewMode>('hoje');
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  
  // Modal states for quick actions
  const [locationModal, setLocationModal] = useState<{ open: boolean; schedule: Schedule | null }>({ open: false, schedule: null });
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; schedule: Schedule | null }>({ open: false, schedule: null });
  const [assignModal, setAssignModal] = useState<{ open: boolean; schedule: Schedule | null }>({ open: false, schedule: null });
  
  const COMPLETED_PER_PAGE = 5;

  // Fetch properties for filter
  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setProperties(data);
      }
    };
    fetchProperties();
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

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

  // Day indicators for calendar strip
  const dayIndicators = useMemo(() => {
    const indicators: Record<string, { pending: number; completed: number; gold: number; inspections: number }> = {};
    
    schedules.forEach(s => {
      const dateKey = format(s.checkOut, 'yyyy-MM-dd');
      if (!indicators[dateKey]) {
        indicators[dateKey] = { pending: 0, completed: 0, gold: 0, inspections: 0 };
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

  // Filter schedules based on selected date and status filter
  const dateFilteredSchedules = useMemo(() => {
    let filtered = schedules;
    
    // Date filtering based on agendaViewMode
    if (agendaViewMode === 'hoje') {
      filtered = schedules.filter(s => isSameDay(s.checkOut, startOfDay(new Date())));
    } else if (agendaViewMode === 'amanha') {
      const tomorrow = startOfDay(addDays(new Date(), 1));
      filtered = schedules.filter(s => isSameDay(s.checkOut, tomorrow));
    } else if (agendaViewMode === 'dia') {
      // Filter by the specific selected date from the day strip
      filtered = schedules.filter(s => isSameDay(s.checkOut, selectedDate));
    } else if (agendaViewMode === 'mes') {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      filtered = schedules.filter(s => s.checkOut >= monthStart && s.checkOut <= monthEnd);
    } else if (agendaViewMode === 'range' && dateRange) {
      filtered = schedules.filter(s => 
        isWithinInterval(s.checkOut, { start: startOfDay(dateRange.from), end: startOfDay(addDays(dateRange.to, 1)) })
      );
    }
    
    // Status filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    // Search filtering
    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.propertyName.toLowerCase().includes(query) ||
        s.cleanerName?.toLowerCase().includes(query)
      );
    }
    
    // Property filtering
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(s => s.propertyId === propertyFilter);
    }
    
    return filtered.sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime());
  }, [schedules, agendaViewMode, selectedDate, currentMonth, dateRange, statusFilter, searchQuery, propertyFilter]);

  // Separate active and completed
  const activeSchedules = useMemo(() => 
    dateFilteredSchedules.filter(s => s.status !== 'completed'),
    [dateFilteredSchedules]
  );
  
  const completedSchedules = useMemo(() => 
    dateFilteredSchedules.filter(s => s.status === 'completed'),
    [dateFilteredSchedules]
  );

  // Pagination for completed
  const totalCompletedPages = Math.ceil(completedSchedules.length / COMPLETED_PER_PAGE);
  const paginatedCompleted = completedSchedules.slice(
    (completedPage - 1) * COMPLETED_PER_PAGE,
    completedPage * COMPLETED_PER_PAGE
  );

  // Calculate stats for selected period
  const periodStats = useMemo(() => {
    const waiting = dateFilteredSchedules.filter(s => s.status === 'waiting').length;
    const released = dateFilteredSchedules.filter(s => s.status === 'released').length;
    const cleaning = dateFilteredSchedules.filter(s => s.status === 'cleaning').length;
    const completed = dateFilteredSchedules.filter(s => s.status === 'completed').length;
    return { waiting, released, cleaning, completed, total: dateFilteredSchedules.length };
  }, [dateFilteredSchedules]);

  // Handle view mode change
  const handleAgendaViewModeChange = useCallback((mode: AdminAgendaViewMode) => {
    setAgendaViewMode(mode);
    if (mode === 'hoje') {
      setSelectedDate(startOfDay(new Date()));
    } else if (mode === 'amanha') {
      setSelectedDate(startOfDay(addDays(new Date(), 1)));
    }
    setCompletedPage(1);
  }, []);

  // Calculate counts for each filter - MUST respect property filter
  const filterCounts = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(addDays(new Date(), 1));
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Apply property filter first to base schedules
    const baseSchedules = propertyFilter !== 'all' 
      ? schedules.filter(s => s.propertyId === propertyFilter)
      : schedules;
    
    const getCount = (filtered: Schedule[]) => ({
      total: filtered.length,
      schedules: filtered.length,
      inspections: 0
    });
    
    const todaySchedules = baseSchedules.filter(s => isSameDay(s.checkOut, today));
    const tomorrowSchedules = baseSchedules.filter(s => isSameDay(s.checkOut, tomorrow));
    const selectedDaySchedules = baseSchedules.filter(s => isSameDay(s.checkOut, selectedDate));
    const monthSchedules = baseSchedules.filter(s => s.checkOut >= monthStart && s.checkOut <= monthEnd);
    const rangeSchedules = dateRange 
      ? baseSchedules.filter(s => isWithinInterval(s.checkOut, { start: startOfDay(dateRange.from), end: startOfDay(addDays(dateRange.to, 1)) }))
      : [];
    
    return {
      today: getCount(todaySchedules),
      tomorrow: getCount(tomorrowSchedules),
      day: getCount(selectedDaySchedules),
      month: getCount(monthSchedules),
      range: getCount(rangeSchedules)
    };
  }, [schedules, currentMonth, dateRange, selectedDate, propertyFilter]);

  const handleDateRangeSelect = useCallback((range: { from: Date; to: Date } | null) => {
    setDateRange(range);
    setCompletedPage(1);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    const newDate = startOfDay(date);
    setSelectedDate(newDate);
    setCompletedPage(1);
    
    // Switch to 'dia' mode when selecting a specific date from the strip
    // unless it's today or tomorrow (keep those modes for clarity)
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(addDays(new Date(), 1));
    
    if (isSameDay(newDate, today)) {
      setAgendaViewMode('hoje');
    } else if (isSameDay(newDate, tomorrow)) {
      setAgendaViewMode('amanha');
    } else {
      setAgendaViewMode('dia');
    }
  }, []);

  // Quick actions
  const handleViewAddress = useCallback((schedule: Schedule) => {
    setLocationModal({ open: true, schedule });
  }, []);

  const handleViewPassword = useCallback((schedule: Schedule) => {
    setPasswordModal({ open: true, schedule });
  }, []);

  const handleAssignCleaner = useCallback((schedule: Schedule) => {
    setAssignModal({ open: true, schedule });
  }, []);

  const handleRelease = useCallback(async (schedule: Schedule) => {
    if (onUpdateSchedule) {
      const updated = { ...schedule, status: 'released' as ScheduleStatus };
      onUpdateSchedule(updated);
      toast.success('Limpeza liberada!');
    }
  }, [onUpdateSchedule]);

  const monthName = format(currentMonth, "MMMM", { locale: ptBR });
  const yearNumber = format(currentMonth, "yyyy");

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-stone-50 dark:bg-[#1a1d21] flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-30 bg-stone-50/95 dark:bg-[#1a1d21]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Painel</span>
            <h1 className="text-lg font-bold text-foreground">
              <span className="capitalize">{monthName}</span> <span className="text-primary">{yearNumber}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Switcher for SuperAdmin */}
            {canSwitchView && (
              <div className="relative">
                <button 
                  onClick={() => setShowViewModeMenu(!showViewModeMenu)}
                  className="flex h-10 items-center gap-2 px-3 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 transition-colors"
                >
                  <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {getViewLabel(viewMode)}
                  </span>
                </button>
                
                {showViewModeMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowViewModeMenu(false)} 
                    />
                    <div className="absolute right-0 top-12 z-50 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-border bg-amber-50 dark:bg-amber-900/20">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <Eye className="w-3 h-3" />
                          Alternar Visão
                        </span>
                      </div>
                      {(['owner', 'manager', 'cleaner'] as ViewMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setViewMode(mode);
                            setShowViewModeMenu(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3",
                            viewMode === mode 
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" 
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            viewMode === mode ? "bg-amber-500" : "bg-muted-foreground/30"
                          )} />
                          {getViewLabel(mode)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            
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

        {/* REGRA 4: Aba Calendário do Anfitrião - Filtros e busca no header */}
        {managerActiveTab === 'calendario' && (
          <>
            {/* Search and Property Filter Row */}
            <div className="mt-3 flex items-center gap-2">
              {/* Property Filter Dropdown */}
              <div className="relative flex-1">
                <button 
                  onClick={() => setIsPropertyFilterOpen(!isPropertyFilterOpen)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    propertyFilter !== 'all'
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-card border border-border text-muted-foreground"
                  )}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1 text-left">
                    {propertyFilter === 'all' 
                      ? 'Todos Imóveis' 
                      : properties.find(p => p.id === propertyFilter)?.name || 'Selecionar'}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", isPropertyFilterOpen && "rotate-180")} />
                </button>
                
                {isPropertyFilterOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsPropertyFilterOpen(false)} 
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          onPropertyFilterChange?.('all');
                          setIsPropertyFilterOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2",
                          propertyFilter === 'all' 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <Building2 className="w-4 h-4" />
                        Todos Imóveis
                        {propertyFilter === 'all' && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                      <div className="border-t border-border" />
                      {properties.map((property) => (
                        <button
                          key={property.id}
                          onClick={() => {
                            onPropertyFilterChange?.(property.id);
                            setIsPropertyFilterOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2",
                            propertyFilter === property.id 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          {property.name}
                          {propertyFilter === property.id && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {/* Search Toggle */}
              {isSearchOpen ? (
                <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-right-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Buscar imóvel ou responsável..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      onSearchChange('');
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors shrink-0",
                    searchQuery 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Active Filters Indicator */}
            {(propertyFilter !== 'all' || searchQuery) && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {propertyFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    <Building2 className="w-3 h-3" />
                    {properties.find(p => p.id === propertyFilter)?.name}
                    <button 
                      onClick={() => onPropertyFilterChange?.('all')}
                      className="ml-1 hover:bg-primary/20 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    <Search className="w-3 h-3" />
                    "{searchQuery}"
                    <button 
                      onClick={() => onSearchChange('')}
                      className="ml-1 hover:bg-primary/20 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Filter Tabs - Updated with counters */}
            <div className="mt-3 overflow-visible">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Filtros</span>
              <div className="pt-2 overflow-visible">
                <MobileAdminFilterTabs
                  viewMode={agendaViewMode}
                  selectedDate={selectedDate}
                  dateRange={dateRange}
                  onViewModeChange={handleAgendaViewModeChange}
                  onDateSelect={handleDateSelect}
                  onDateRangeSelect={handleDateRangeSelect}
                  onMonthChange={setCurrentMonth}
                  todayCount={filterCounts.today}
                  tomorrowCount={filterCounts.tomorrow}
                  dayCount={filterCounts.day}
                  monthCount={filterCounts.month}
                  rangeCount={filterCounts.range}
                  dayIndicators={dayIndicators}
                />
              </div>
            </div>
          </>
        )}
      </header>

      {/* REGRA 4: Aba Home do Anfitrião - Apenas contadores de status */}
      {managerActiveTab === 'home' && (
        <section className="flex-1 px-4 pt-6 pb-24">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Resumo de Hoje</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                onStatusFilterChange('waiting');
                // Note: This doesn't switch tabs automatically - user needs to go to Calendário
              }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">{stats.waiting}</span>
              <span className="text-sm font-medium text-muted-foreground mt-1">Aguardando</span>
            </button>
            <button
              onClick={() => onStatusFilterChange('released')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              <span className="text-4xl font-bold text-primary">{stats.released}</span>
              <span className="text-sm font-medium text-muted-foreground mt-1">Liberado</span>
            </button>
            <button
              onClick={() => onStatusFilterChange('cleaning')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              <span className="text-4xl font-bold text-[#E0C051]">{stats.cleaning}</span>
              <span className="text-sm font-medium text-muted-foreground mt-1">Limpando</span>
            </button>
            <button
              onClick={() => onStatusFilterChange('completed')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</span>
              <span className="text-sm font-medium text-muted-foreground mt-1">Finalizado</span>
            </button>
          </div>

          {/* Quick Stats Summary */}
          <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total de Tarefas</span>
              <span className="text-lg font-bold text-foreground">
                {stats.waiting + stats.released + stats.cleaning + stats.completed}
              </span>
            </div>
            {stats.delayed > 0 && (
              <div className="mt-2 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{stats.delayed} em atraso</span>
              </div>
            )}
          </div>

          {/* Cleaning Time Alerts - Show on Home too */}
          {cleaningTimeAlerts.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Alertas de Tempo ({cleaningTimeAlerts.length})
                </span>
              </div>
              <div className="space-y-2">
                {cleaningTimeAlerts.slice(0, 3).map((alert) => {
                  const formatAlertTime = (minutes: number) => {
                    if (minutes < 0) {
                      const absMinutes = Math.abs(minutes);
                      const hours = Math.floor(absMinutes / 60);
                      const mins = absMinutes % 60;
                      if (hours > 0) return `+${hours}h ${mins > 0 ? `${mins}min ` : ''}excedido`;
                      return `+${mins}min excedido`;
                    }
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    if (hours > 0) return `${hours}h${mins > 0 ? ` ${mins}min` : ''} restantes`;
                    return `${mins}min restantes`;
                  };

                  return (
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
                            {alert.schedule.cleanerName || 'Não atribuído'}
                          </p>
                        </div>
                        <div className={cn(
                          "text-right flex-shrink-0 ml-2",
                          alert.type === 'exceeding' ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          <span className="text-xs font-bold whitespace-nowrap">
                            {formatAlertTime(alert.minutesRemaining)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* REGRA 4: Aba Calendário do Anfitrião - Conteúdo principal */}
      {managerActiveTab === 'calendario' && (
        <>
          {/* Section: Status Counters - Top priority */}
          <section className="px-4 pt-3 pb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Selecione Contadores</span>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => onStatusFilterChange(statusFilter === 'waiting' ? 'all' : 'waiting')}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-xl transition-all",
                  statusFilter === 'waiting' 
                    ? "bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-400" 
                    : "bg-card shadow-sm"
                )}
              >
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{periodStats.waiting}</span>
                <span className="text-[9px] text-muted-foreground">Aguardando</span>
              </button>
              <button
                onClick={() => onStatusFilterChange(statusFilter === 'released' ? 'all' : 'released')}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-xl transition-all",
                  statusFilter === 'released' 
                    ? "bg-primary/20 ring-2 ring-primary" 
                    : "bg-card shadow-sm"
                )}
              >
                <span className="text-lg font-bold text-primary">{periodStats.released}</span>
                <span className="text-[9px] text-muted-foreground">Liberado</span>
              </button>
              <button
                onClick={() => onStatusFilterChange(statusFilter === 'cleaning' ? 'all' : 'cleaning')}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-xl transition-all",
                  statusFilter === 'cleaning' 
                    ? "bg-[#E0C051]/20 ring-2 ring-[#E0C051]" 
                    : "bg-card shadow-sm"
                )}
              >
                <span className="text-lg font-bold text-[#E0C051]">{periodStats.cleaning}</span>
                <span className="text-[9px] text-muted-foreground">Limpando</span>
              </button>
              <button
                onClick={() => onStatusFilterChange(statusFilter === 'completed' ? 'all' : 'completed')}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-xl transition-all",
                  statusFilter === 'completed' 
                    ? "bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-emerald-400" 
                    : "bg-card shadow-sm"
                )}
              >
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{periodStats.completed}</span>
                <span className="text-[9px] text-muted-foreground">Finalizado</span>
              </button>
            </div>
          </section>

          {/* Section: Calendar Strip - Show for hoje, amanha modes */}
          {(agendaViewMode === 'hoje' || agendaViewMode === 'amanha') && (
            <section className="border-t border-b border-border py-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4 block">Dia</span>
              <MobileInfiniteDayStrip
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  handleDateSelect(date);
                  const today = startOfDay(new Date());
                  const tomorrow = startOfDay(addDays(new Date(), 1));
                  if (isSameDay(date, today)) {
                    setAgendaViewMode('hoje');
                  } else if (isSameDay(date, tomorrow)) {
                    setAgendaViewMode('amanha');
                  }
                }}
                dayIndicators={dayIndicators}
              />
            </section>
          )}

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
                {cleaningTimeAlerts.slice(0, 2).map((alert) => {
                  const formatAlertTime = (minutes: number) => {
                    if (minutes < 0) {
                      const absMinutes = Math.abs(minutes);
                      const hours = Math.floor(absMinutes / 60);
                      const mins = absMinutes % 60;
                      if (hours > 0) return `+${hours}h ${mins > 0 ? `${mins}min ` : ''}excedido`;
                      return `+${mins}min excedido`;
                    }
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    if (hours > 0) return `${hours}h${mins > 0 ? ` ${mins}min` : ''} restantes`;
                    return `${mins}min restantes`;
                  };

                  return (
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
                            {alert.schedule.cleanerName || 'Não atribuído'} • Check-in {format(alert.checkInTime, 'HH:mm')}
                          </p>
                        </div>
                        <div className={cn(
                          "text-right flex-shrink-0 ml-2",
                          alert.type === 'exceeding' ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          <span className="text-xs font-bold whitespace-nowrap">
                            {formatAlertTime(alert.minutesRemaining)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar propriedade ou responsável..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Schedule List */}
          <div className="flex-1 px-4 py-2 pb-24 overflow-y-auto">
            {/* REGRA 5: Estado vazio com mensagem amigável */}
            {dateFilteredSchedules.length === 0 ? (
              <MobileEmptyState 
                type="schedule"
                message="Não há agendamentos para este dia."
                submessage={
                  agendaViewMode === 'hoje' 
                    ? 'Nenhuma tarefa programada para hoje.' 
                    : agendaViewMode === 'amanha' 
                      ? 'Nenhuma tarefa programada para amanhã.' 
                      : agendaViewMode === 'mes' 
                        ? 'Nenhuma tarefa programada neste mês.' 
                        : 'Nenhuma tarefa programada neste período.'
                }
              />
            ) : (
              <div className="space-y-3">
                {/* Active Schedules */}
                {activeSchedules.map((schedule) => (
                  <MobileAdminScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onScheduleClick={onScheduleClick}
                    onViewAddress={handleViewAddress}
                    onViewPassword={handleViewPassword}
                    onAssignCleaner={handleAssignCleaner}
                    onRelease={handleRelease}
                    onScheduleUpdated={onUpdateSchedule}
                  />
                ))}
                
                {/* Separator */}
                {activeSchedules.length > 0 && completedSchedules.length > 0 && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Finalizados ({completedSchedules.length})
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                
                {/* Completed Schedules - Paginated */}
                {paginatedCompleted.map((schedule) => (
                  <MobileAdminScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onScheduleClick={onScheduleClick}
                    onViewAddress={handleViewAddress}
                    onViewPassword={handleViewPassword}
                    onScheduleUpdated={onUpdateSchedule}
                    isCompleted
                  />
                ))}
                
                {/* Pagination Controls */}
                {totalCompletedPages > 1 && (
                  <div className="flex items-center justify-center gap-4 py-3">
                    <button
                      onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                      disabled={completedPage === 1}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        completedPage === 1
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : "text-primary hover:bg-primary/10"
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {completedPage} de {totalCompletedPages}
                    </span>
                    <button
                      onClick={() => setCompletedPage(p => Math.min(totalCompletedPages, p + 1))}
                      disabled={completedPage === totalCompletedPages}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        completedPage === totalCompletedPages
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : "text-primary hover:bg-primary/10"
                      )}
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals - Rendered directly without Dialog wrapper since they handle their own overlay */}
      {locationModal.open && locationModal.schedule && (
        <LocationModal
          onClose={() => setLocationModal({ open: false, schedule: null })}
          address={locationModal.schedule.propertyAddress || ''}
          propertyName={locationModal.schedule.propertyName}
          latitude={locationModal.schedule.propertyLatitude}
          longitude={locationModal.schedule.propertyLongitude}
        />
      )}

      {passwordModal.open && passwordModal.schedule && (
        <PasswordModal
          onClose={() => setPasswordModal({ open: false, schedule: null })}
          scheduleId={passwordModal.schedule.id}
          propertyId={passwordModal.schedule.propertyId || ''}
          propertyName={passwordModal.schedule.propertyName}
          scheduleDate={format(passwordModal.schedule.checkOut, 'yyyy-MM-dd')}
          scheduleStatus={passwordModal.schedule.status}
          accessPassword={passwordModal.schedule.accessPassword}
          teamMemberId={null}
        />
      )}
    </div>
  );
}
