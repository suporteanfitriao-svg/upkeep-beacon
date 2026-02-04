import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import { format, isSameDay, addDays, startOfWeek, endOfWeek, getWeek, isAfter, startOfDay, endOfDay, isToday as checkIsToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, formatDistanceToNow, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Play, Clock, Check, ChevronRight, RefreshCw, Building2, ClipboardCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMemberId } from '@/hooks/useTeamMemberId';
import { useUserRole } from '@/hooks/useUserRole';
import { useViewMode } from '@/hooks/useViewMode';
import { PaymentPeriod } from '@/hooks/useCleanerPayments';
import { useCleanerInspections } from '@/hooks/useCleanerInspections';
import { AddToHomeScreen } from '@/components/pwa/AddToHomeScreen';
import { CleaningTimeAlertBanner } from '@/components/dashboard/CleaningTimeAlertBanner';
import { useCleaningTimeAlerts } from '@/hooks/useCleaningTimeAlert';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import LocationPermissionModal from './mobile/LocationPermissionModal';
import { ViewModeSwitcher } from './ViewModeSwitcher';

// Import memoized subcomponents
import { MobileBottomNav } from './mobile/MobileBottomNav';
import { MobilePeriodFilterTabs } from './mobile/MobilePeriodFilterTabs';
import { MobileScheduleCard } from './mobile/MobileScheduleCard';
import { MobileScheduleList } from './mobile/MobileScheduleList';
import { MobileWeekStrip } from './mobile/MobileWeekStrip';
import { MobileInspectionCard } from './mobile/MobileInspectionCard';
import { MobileInspectionDetail } from './mobile/MobileInspectionDetail';
import { MobileInfiniteDayStrip } from './mobile/MobileInfiniteDayStrip';
import { MobileAgendaFilterTabs, AgendaViewMode } from './mobile/MobileAgendaFilterTabs';
// MobileMonthlyHistory moved to /historico-limpezas page only
import { MobileOverdueDrawer } from './mobile/MobileOverdueDrawer';
import { CleanerInspection } from '@/hooks/useCleanerInspections';
import { MobileEmptyState } from '@/components/mobile/MobileEmptyState';

interface MobileDashboardProps {
  schedules: Schedule[];
  onScheduleClick: (schedule: Schedule) => void;
  onStartCleaning: (scheduleId: string) => void;
  onRefresh?: () => Promise<{ synced: number } | null>;
  loadingScheduleId?: string | null;
}

const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const AUTO_SYNC_INTERVAL = 300000; // 5 minutes
const PULL_THRESHOLD = 80; // pixels to trigger refresh

// Vibrate helper function
const vibrate = (pattern: number | number[] = 50) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export function MobileDashboard({ schedules, onScheduleClick, onStartCleaning, onRefresh, loadingScheduleId }: MobileDashboardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { teamMemberId } = useTeamMemberId();
  const { isCleaner } = useUserRole();
  const { canSwitchView } = useViewMode();
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod>('today');
  
  // Cleaner inspections
  const { 
    inspections, 
    loading: inspectionsLoading, 
    updateInspectionStatus,
    refetch: refetchInspections 
  } = useCleanerInspections();
  
  // Cleaning time alerts
  const cleaningTimeAlerts = useCleaningTimeAlerts(schedules);

  // Regra: o perfil cleaner não deve ver "TEMPO EXCEDIDO" (atraso grande) no dashboard.
  // Mantemos apenas os alertas preventivos (at_risk) quando aplicável.
  const visibleCleaningTimeAlerts = useMemo(() => {
    if (!isCleaner) return cleaningTimeAlerts;
    return cleaningTimeAlerts.filter(a => a.type !== 'exceeding');
  }, [cleaningTimeAlerts, isCleaner]);

  // Location permission management
  const {
    permissionState: locationPermissionState,
    showModal: showLocationModal,
    closeModal: closeLocationModal,
    requestPermission: requestLocationPermission,
    dismissAndContinue: dismissLocationModal,
  } = useLocationPermission({ autoPrompt: true, promptDelay: 2000 });

  // Always initialize with the current date from the device
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [activeTab, setActiveTab] = useState<'inicio' | 'agenda' | 'menu'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'agenda') return 'agenda';
    return 'inicio';
  });
  const [viewMode, setViewMode] = useState<'dia' | 'calendario'>('dia');
  const [agendaViewMode, setAgendaViewMode] = useState<AgendaViewMode>('hoje');
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showOverdueDrawer, setShowOverdueDrawer] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<CleanerInspection | null>(null);
  
  // Pull-to-refresh state - using Pointer Events for safer interaction
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [gestureDecided, setGestureDecided] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isAutoSyncRef = useRef(false);

  // Handle manual refresh
  const handleRefresh = useCallback(async (isAutoSync = false) => {
    if (isSyncing || !onRefresh) return;
    isAutoSyncRef.current = isAutoSync;
    setIsSyncing(true);
    try {
      const result = await onRefresh();
      setLastSyncTime(new Date());
      
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
      
      if (!isAutoSync) {
        vibrate([50, 30, 50]);
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

  // Auto-sync every 5 minutes
  useEffect(() => {
    if (!onRefresh) return;
    const interval = setInterval(() => {
      handleRefresh(true);
    }, AUTO_SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [handleRefresh, onRefresh]);

  // Pull-to-refresh with Pointer Events - safer implementation
  const DIRECTION_THRESHOLD = 15;
  const VERTICAL_RATIO = 2;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startPosRef.current = { x: e.clientX, y: e.clientY };
      setGestureDecided(false);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if (isSyncing) return;
    
    const deltaX = Math.abs(e.clientX - startPosRef.current.x);
    const deltaY = e.clientY - startPosRef.current.y;
    
    if (!gestureDecided) {
      const totalMovement = Math.max(deltaX, Math.abs(deltaY));
      if (totalMovement > DIRECTION_THRESHOLD) {
        const isVerticalPull = deltaY > 0 && 
                               Math.abs(deltaY) > deltaX * VERTICAL_RATIO &&
                               containerRef.current?.scrollTop === 0;
        
        if (isVerticalPull) {
          setIsPulling(true);
          setGestureDecided(true);
        } else {
          setIsPulling(false);
          setGestureDecided(true);
          return;
        }
      } else {
        return;
      }
    }
    
    if (isPulling && deltaY > 0) {
      setPullDistance(Math.min(deltaY * 0.5, PULL_THRESHOLD * 1.5));
      if (deltaY * 0.5 >= PULL_THRESHOLD && deltaY * 0.5 < PULL_THRESHOLD + 5) {
        vibrate(20);
      }
    }
  }, [isPulling, isSyncing, gestureDecided]);

  const handlePointerUp = useCallback(async () => {
    if (isPulling && pullDistance >= PULL_THRESHOLD && !isSyncing) {
      await handleRefresh(false);
    }
    setPullDistance(0);
    setIsPulling(false);
    setGestureDecided(false);
  }, [isPulling, pullDistance, isSyncing, handleRefresh]);

  const handlePointerCancel = useCallback(() => {
    setPullDistance(0);
    setIsPulling(false);
    setGestureDecided(false);
  }, []);

  // Memoized calculations
  const lastSyncText = useMemo(() => {
    if (!lastSyncTime) return null;
    return formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ptBR });
  }, [lastSyncTime]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDayOfWeek = getDay(start);
    const paddingBefore = Array.from({ length: startDayOfWeek }, (_, i) => 
      addDays(start, -(startDayOfWeek - i))
    );
    return [...paddingBefore, ...days];
  }, [currentMonth]);

  const selectedDaySchedules = useMemo(() => {
    return schedules.filter(s => isSameDay(s.checkOut, selectedDate))
      .sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime());
  }, [schedules, selectedDate]);

  // Tomorrow schedules - only show when viewing today's date
  const nextDaySchedules = useMemo(() => {
    // Only show tomorrow section if selectedDate is today
    const today = startOfDay(new Date());
    if (!isSameDay(selectedDate, today)) {
      return []; // Don't show tomorrow section for past/future dates
    }
    
    const tomorrow = addDays(today, 1);
    return schedules.filter(s => isSameDay(s.checkOut, tomorrow))
      .sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime());
  }, [schedules, selectedDate]);

  const dayIndicators = useMemo(() => {
    const indicators: Record<string, { pending: number; completed: number; gold: number; inspections: number; completedInspections: number }> = {};
    
    schedules.forEach(s => {
      const dateKey = format(s.checkOut, 'yyyy-MM-dd');
      if (!indicators[dateKey]) {
        indicators[dateKey] = { pending: 0, completed: 0, gold: 0, inspections: 0, completedInspections: 0 };
      }
      if (s.status === 'completed') {
        indicators[dateKey].completed++;
      } else if (s.status === 'waiting' || s.status === 'released') {
        indicators[dateKey].pending++;
      } else {
        indicators[dateKey].gold++;
      }
    });
    
    inspections.forEach(i => {
      const dateKey = i.scheduled_date;
      if (!indicators[dateKey]) {
        indicators[dateKey] = { pending: 0, completed: 0, gold: 0, inspections: 0, completedInspections: 0 };
      }
      if (i.status === 'scheduled' || i.status === 'in_progress') {
        indicators[dateKey].inspections++;
      } else if (i.status === 'completed') {
        indicators[dateKey].completedInspections++;
      }
    });
    
    return indicators;
  }, [schedules, inspections]);

  // For past dates, only show in-progress (not finished) and completed schedules
  // For today and future, show all statuses
  const isPastDate = useMemo(() => {
    const today = startOfDay(new Date());
    return selectedDate < today;
  }, [selectedDate]);

  const pendingSchedules = useMemo(() => {
    const today = startOfDay(new Date());
    return selectedDaySchedules
      .filter(s => s.status === 'waiting' || s.status === 'released')
      .sort((a, b) => {
        // Sort overdue tasks first (older dates come first)
        const aIsOverdue = startOfDay(a.checkOut) < today;
        const bIsOverdue = startOfDay(b.checkOut) < today;
        
        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;
        
        // Within same category, sort by checkout time
        return a.checkOut.getTime() - b.checkOut.getTime();
      });
  }, [selectedDaySchedules]);
  
  const inProgressSchedules = useMemo(() => 
    selectedDaySchedules.filter(s => s.status === 'cleaning'),
    [selectedDaySchedules]
  );
  const completedSchedules = useMemo(() => 
    selectedDaySchedules.filter(s => s.status === 'completed'),
    [selectedDaySchedules]
  );

  const selectedDayInspections = useMemo(() => {
    return inspections.filter(i => {
      const inspectionDate = parseISO(i.scheduled_date);
      return isSameDay(inspectionDate, selectedDate);
    });
  }, [inspections, selectedDate]);

  const scheduledInspections = useMemo(() => 
    selectedDayInspections.filter(i => i.status === 'scheduled'),
    [selectedDayInspections]
  );
  const inProgressInspections = useMemo(() => 
    selectedDayInspections.filter(i => i.status === 'in_progress'),
    [selectedDayInspections]
  );
  const completedInspections = useMemo(() => 
    selectedDayInspections.filter(i => i.status === 'completed'),
    [selectedDayInspections]
  );

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
  const isSelectedToday = isSameDay(selectedDate, new Date());

  // Calculate overdue tasks (past dates with pending status - NOT cleaning or completed)
  // Only show tasks that haven't been started yet (waiting/released) and are overdue
  const overdueSchedules = useMemo(() => {
    const today = startOfDay(new Date());
    return schedules.filter(s => 
      // Only waiting or released status (not yet started)
      (s.status === 'waiting' || s.status === 'released') &&
      // Checkout date is in the past
      startOfDay(s.checkOut) < today
    );
  }, [schedules]);

  const overdueCount = overdueSchedules.length;

  const todayTasks = useMemo(() => {
    const today = new Date();
    const todayDateStr = format(today, 'yyyy-MM-dd');
    
    // Schedules for today (not completed) + overdue
    const schedulesCount = schedules.filter(s => 
      isSameDay(s.checkOut, today) && s.status !== 'completed'
    ).length + overdueCount;
    
    // Inspections for today (scheduled or in_progress)
    const inspectionsCount = inspections.filter(i =>
      i.scheduled_date === todayDateStr && 
      (i.status === 'scheduled' || i.status === 'in_progress')
    ).length;
    
    return {
      schedules: schedulesCount,
      inspections: inspectionsCount,
      total: schedulesCount + inspectionsCount
    };
  }, [schedules, overdueCount, inspections]);

  const tomorrowTasks = useMemo(() => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowDateStr = format(tomorrow, 'yyyy-MM-dd');
    
    // Schedules for tomorrow only (not completed) - overdue NOT included here
    const schedulesCount = schedules.filter(s => 
      isSameDay(s.checkOut, tomorrow) && s.status !== 'completed'
    ).length;
    
    // Inspections for tomorrow (scheduled or in_progress)
    const inspectionsCount = inspections.filter(i =>
      i.scheduled_date === tomorrowDateStr && 
      (i.status === 'scheduled' || i.status === 'in_progress')
    ).length;
    
    return {
      schedules: schedulesCount,
      inspections: inspectionsCount,
      total: schedulesCount + inspectionsCount
    };
  }, [schedules, inspections]);

  const periodStats = useMemo(() => {
    const now = new Date();
    let dateRange: { start: Date; end: Date };
    let dateRangeStr: { start: string; end: string };
    
    switch (paymentPeriod) {
      case 'today':
        dateRange = { start: startOfDay(now), end: endOfDay(now) };
        dateRangeStr = { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
        break;
      case 'tomorrow':
        const tomorrow = addDays(now, 1);
        dateRange = { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
        dateRangeStr = { start: format(tomorrow, 'yyyy-MM-dd'), end: format(tomorrow, 'yyyy-MM-dd') };
        break;
      case 'week':
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
        dateRange = { start: weekStart, end: weekEnd };
        dateRangeStr = { start: format(weekStart, 'yyyy-MM-dd'), end: format(weekEnd, 'yyyy-MM-dd') };
        break;
      case 'month':
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        dateRange = { start: monthStart, end: monthEnd };
        dateRangeStr = { start: format(monthStart, 'yyyy-MM-dd'), end: format(monthEnd, 'yyyy-MM-dd') };
        break;
    }

    const periodSchedules = schedules.filter(s => 
      isWithinInterval(s.checkOut, { start: dateRange.start, end: dateRange.end })
    );

    // Count inspections in period (scheduled or in_progress)
    const periodInspections = inspections.filter(i => {
      const inspDate = i.scheduled_date;
      return inspDate >= dateRangeStr.start && 
             inspDate <= dateRangeStr.end && 
             (i.status === 'scheduled' || i.status === 'in_progress');
    });

    const completed = periodSchedules.filter(s => s.status === 'completed');
    const pending = periodSchedules.filter(s => s.status !== 'completed');

    // Add overdue count and inspections to total and pending for all periods
    const totalWithOverdue = periodSchedules.length + overdueCount + periodInspections.length;
    const pendingWithOverdue = pending.length + overdueCount + periodInspections.length;

    return {
      total: totalWithOverdue,
      completed: completed.length,
      pending: pendingWithOverdue,
      overdueCount: overdueCount,
      inspectionsCount: periodInspections.length,
      periodLabel: paymentPeriod === 'today' ? 'Hoje' : 
                   paymentPeriod === 'tomorrow' ? 'Amanhã' :
                   paymentPeriod === 'week' ? 'Semana' : 'Mês'
    };
  }, [schedules, paymentPeriod, overdueCount, inspections]);

  const monthCompletedCount = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    return schedules.filter(s => 
      s.status === 'completed' &&
      isWithinInterval(s.checkOut, { start: monthStart, end: monthEnd })
    ).length;
  }, [schedules]);

  const handlePrevMonth = useCallback(() => setCurrentMonth(prev => subMonths(prev, 1)), []);
  const handleNextMonth = useCallback(() => setCurrentMonth(prev => addMonths(prev, 1)), []);

  const handleTabChange = useCallback((tab: 'inicio' | 'agenda' | 'menu') => {
    setActiveTab(tab);
  }, []);

  const handlePeriodChange = useCallback((period: PaymentPeriod) => {
    setPaymentPeriod(period);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleAgendaViewModeChange = useCallback((mode: AgendaViewMode) => {
    setAgendaViewMode(mode);
    if (mode === 'hoje') {
      setViewMode('dia');
      setSelectedDate(startOfDay(new Date()));
    } else if (mode === 'mes') {
      setViewMode('calendario');
      setCurrentMonth(startOfMonth(new Date()));
    } else {
      setViewMode('dia');
    }
  }, []);

  const handleNavigateToAgenda = useCallback(() => {
    setActiveTab('agenda');
    
    // If there are overdue tasks, always navigate to the oldest one first
    if (overdueSchedules.length > 0) {
      const oldestOverdue = overdueSchedules.reduce((oldest, current) => 
        current.checkOut < oldest.checkOut ? current : oldest
      );
      setSelectedDate(startOfDay(oldestOverdue.checkOut));
      return;
    }
    
    // Otherwise, navigate based on selected period
    if (paymentPeriod === 'today') {
      setSelectedDate(startOfDay(new Date()));
    } else if (paymentPeriod === 'tomorrow') {
      setSelectedDate(startOfDay(addDays(new Date(), 1)));
    } else if (paymentPeriod === 'week') {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
      const firstPendingInWeek = schedules.find(s => {
        const scheduleDate = startOfDay(new Date(s.checkOut));
        return isWithinInterval(scheduleDate, { start: weekStart, end: weekEnd }) && 
               ['waiting', 'released', 'cleaning'].includes(s.status);
      });
      if (firstPendingInWeek) {
        setSelectedDate(startOfDay(new Date(firstPendingInWeek.checkOut)));
      } else {
        setSelectedDate(startOfDay(new Date()));
      }
    } else if (paymentPeriod === 'month') {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      const firstPendingInMonth = schedules.find(s => {
        const scheduleDate = startOfDay(new Date(s.checkOut));
        return isWithinInterval(scheduleDate, { start: monthStart, end: monthEnd }) && 
               ['waiting', 'released', 'cleaning'].includes(s.status);
      });
      if (firstPendingInMonth) {
        setSelectedDate(startOfDay(new Date(firstPendingInMonth.checkOut)));
      } else {
        setSelectedDate(startOfDay(new Date()));
      }
    }
  }, [paymentPeriod, schedules, overdueSchedules]);

  // Vibrate when overdue tasks alert appears
  const hasVibratedForOverdue = useRef(false);
  useEffect(() => {
    if (overdueCount > 0 && !hasVibratedForOverdue.current) {
      vibrate([100, 50, 100]);
      hasVibratedForOverdue.current = true;
    } else if (overdueCount === 0) {
      hasVibratedForOverdue.current = false;
    }
  }, [overdueCount]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-stone-50 dark:bg-[#22252a] font-display text-slate-800 dark:text-slate-100 antialiased touch-pan-y"
    >
      {/* Pull-to-refresh indicator */}
      {isPulling && pullDistance > 0 && (
        <div 
          className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 z-30 pointer-events-none"
          style={{ 
            top: Math.min(pullDistance - 40, 60),
            transform: `scale(${Math.min(pullDistance / PULL_THRESHOLD, 1)})`,
            opacity: pullDistance > 10 ? 1 : 0
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
      )}

      {/* INÍCIO (HOME) TAB */}
      {activeTab === 'inicio' && (
        <div className="animate-fade-in">
          {/* Home Header */}
          <header className="sticky top-0 z-20 bg-stone-50/90 dark:bg-[#22252a]/90 px-6 py-4 backdrop-blur-md">
            {/* View Mode Switcher for SuperAdmin */}
            {canSwitchView && (
              <div className="mb-3">
                <ViewModeSwitcher />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bem-vindo(a)</span>
                <h1 className="text-xl font-bold text-foreground">
                  Dashboard <span className="text-primary">Geral</span>
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => handleRefresh(false)}
                      disabled={isSyncing}
                      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-5 h-5 text-muted-foreground", isSyncing && "animate-spin")} />
                    </button>
                    {lastSyncTime && (
                      <span className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
                        {format(lastSyncTime, "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
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
          </header>

          {/* Install App Prompt */}
          <div className="px-6 pt-2">
            <AddToHomeScreen />
          </div>

          {/* Cleaning Time Alerts */}
          {visibleCleaningTimeAlerts.length > 0 && (
            <div className="px-6 pt-3 relative z-10">
              <CleaningTimeAlertBanner 
                alerts={visibleCleaningTimeAlerts}
                onAlertClick={(scheduleId) => {
                  const schedule = schedules.find(s => s.id === scheduleId);
                  if (schedule) onScheduleClick(schedule);
                }}
                variant="mobile"
              />
            </div>
          )}

          {/* Overdue Tasks Alert */}
          {overdueCount > 0 && (
            <div className="px-6 pt-3">
              <button
                onClick={() => setShowOverdueDrawer(true)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 transition-all active:scale-[0.99]"
              >
                <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">
                    {overdueCount} {overdueCount === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70">
                    Toque para ver todas
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400" />
              </button>
            </div>
          )}

          <main className="flex-1 px-6 py-4">
            {/* Period Filter Tabs - Memoized */}
            <div className="relative z-30">
              <MobilePeriodFilterTabs
                paymentPeriod={paymentPeriod}
                onPeriodChange={handlePeriodChange}
                todayTasks={todayTasks}
                tomorrowTasks={tomorrowTasks}
              />
            </div>

            {/* Today Summary */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumo de Atividades</p>
              </div>
              {onRefresh && (
                <button
                  onClick={() => handleRefresh(false)}
                  disabled={isSyncing}
                  className="flex items-center gap-1 text-xs font-semibold text-primary"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                  Atualizar
                </button>
              )}
            </div>

            {/* Tasks Card */}
            <button
              onClick={handleNavigateToAgenda}
              className="w-full rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 mb-3 shadow-sm text-left transition-all hover:shadow-md active:scale-[0.99] cursor-pointer relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Tarefas de {periodStats.periodLabel}
                      {overdueCount > 0 && (
                        <span className="ml-1 text-red-600 dark:text-red-400">(+{overdueCount} atrasadas)</span>
                      )}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {String(periodStats.total).padStart(2, '0')}
                    </p>
                  </div>
                </div>
                {periodStats.pending > 0 ? (
                  <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                    Pendente
                  </span>
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2" />
            </button>

            {/* Completed in Month Card - Fixed value, doesn't change with filters */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Concluídas no Mês</p>
                    <p className="text-3xl font-bold text-foreground">{String(monthCompletedCount).padStart(2, '0')}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  {format(new Date(), 'MMMM', { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Removed MobileMonthlyHistory from home - now only in /historico-limpezas */}

            {/* Completed Schedules - Link to History Page */}
            <button
              onClick={() => navigate('/historico-limpezas')}
              className="w-full mb-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-left transition-all hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Histórico de Limpezas</p>
                    <p className="text-xs text-muted-foreground">Ver todas as limpezas concluídas</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>



            {/* Next Task */}
            {nextCheckout && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Próxima Tarefa</h3>
                <button
                  onClick={() => onScheduleClick(nextCheckout)}
                  className="w-full overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft border border-slate-100 dark:border-slate-700 text-left transition-transform active:scale-[0.98]"
                >
                  <div className="flex flex-row p-4 gap-4">
                    {nextCheckout.propertyImageUrl ? (
                      <img 
                        src={nextCheckout.propertyImageUrl}
                        alt={nextCheckout.propertyName}
                        className="w-20 h-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="text-base font-bold text-foreground mb-1">{nextCheckout.propertyName}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <p className="text-sm font-medium">Liberado a partir de {formatTime(nextCheckout.checkOut)}</p>
                      </div>
                      <span className={cn(
                        "mt-2 inline-flex self-start rounded-full px-2.5 py-0.5 text-xs font-bold",
                        nextCheckout.status === 'waiting' && "bg-slate-100 dark:bg-slate-800 text-slate-600",
                        nextCheckout.status === 'released' && "bg-amber-100 dark:bg-amber-900/30 text-amber-700",
                        nextCheckout.status === 'cleaning' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700"
                      )}>
                        {nextCheckout.status === 'waiting' ? 'Aguardando' : 
                         nextCheckout.status === 'released' ? 'Liberado' : 'Em limpeza'}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground self-center" />
                  </div>
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* AGENDA TAB */}
      {activeTab === 'agenda' && (
        <div className="animate-fade-in">
          {/* Agenda Header */}
          <header 
            className="sticky top-0 z-30 bg-stone-50 dark:bg-[#22252a] px-6 py-4 shadow-sm"
            style={{ transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined }}
          >
            {/* Title Row */}
            <div className="flex items-center justify-between mb-3">
              {viewMode === 'calendario' ? (
                <>
                  <button 
                    onClick={() => {
                      setViewMode('dia');
                      setAgendaViewMode('hoje');
                    }}
                    className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
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
                  <div className="w-8" /> {/* Spacer */}
                </>
              ) : (
                <div className="w-full">
                  <h2 className="text-lg font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
                    <span className="capitalize">{monthName}</span> <span className="text-primary">{yearNumber}</span>
                  </h2>
                </div>
              )}
            </div>

            {/* Filter Tabs: Hoje, Mês, Data - Always visible */}
            <div className="flex items-center">
              <MobileAgendaFilterTabs
                viewMode={agendaViewMode}
                selectedDate={selectedDate}
                onViewModeChange={handleAgendaViewModeChange}
                onDateSelect={handleDateSelect}
                onMonthChange={setCurrentMonth}
                dayIndicators={dayIndicators}
              />
            </div>
          </header>

          {/* Infinite Day Strip for "Hoje" or "Data" views */}
          {viewMode === 'dia' && (
            <MobileInfiniteDayStrip
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              dayIndicators={dayIndicators}
            />
          )}

          {viewMode === 'calendario' ? (
            // Calendar View
            <main className="flex flex-col px-4 pt-2 pb-6">

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
                  const indicators = dayIndicators[dateKey] || { pending: 0, completed: 0, gold: 0, inspections: 0 };
                  const totalTasks = indicators.pending + indicators.completed + indicators.gold + indicators.inspections;

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
                      onClick={() => handleDateSelect(day)}
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
                              {Array.from({ length: Math.min(indicators.inspections, 2) }).map((_, i) => (
                                <div key={`i-${i}`} className="h-1.5 w-1.5 rounded-full bg-purple-300 border border-white/20" />
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
                              {Array.from({ length: Math.min(indicators.inspections, 2) }).map((_, i) => (
                                <div key={`i-${i}`} className="h-1.5 w-1.5 rounded-full bg-purple-500" />
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

                <div className="flex flex-col gap-3 pb-4">
                  {selectedDaySchedules.map(schedule => (
                    <MobileScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onScheduleClick={onScheduleClick}
                      variant="calendar"
                    />
                  ))}

                  {/* REGRA 5: Estado vazio com mensagem amigável */}
                  {selectedDaySchedules.length === 0 && (
                    <MobileEmptyState 
                      type="schedule" 
                      message="Não há agendamentos para este dia."
                    />
                  )}
                </div>

                {/* Color Legend - At the bottom */}
                <div className="mt-4 px-3 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Legenda dos indicadores</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">Pendente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#E0C051]" />
                      <span className="text-xs text-muted-foreground">Em andamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#8A8B88]/40" />
                      <span className="text-xs text-muted-foreground">Concluída</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                      <span className="text-xs text-muted-foreground">Inspeção</span>
                    </div>
                  </div>
                </div>
              </section>
            </main>
          ) : (
            // Day View - Day strip is already rendered above
            <>
              {/* Main Content */}
              <main className="flex flex-col">
                <div className="px-6 pt-6 pb-3 flex items-baseline justify-between">
                  <h2 className="text-[26px] font-bold leading-tight text-slate-900 dark:text-white tracking-tight">
                    {isSelectedToday ? 'Hoje' : format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                  </h2>
                  <span className="text-sm font-semibold text-primary">{selectedDaySchedules.length + selectedDayInspections.length} Tarefas</span>
                </div>

                <div className="px-6 flex flex-col gap-4">
                  {/* REGRA 5: Estado vazio com mensagem amigável */}
                  {selectedDaySchedules.length === 0 && selectedDayInspections.length === 0 && (
                    <MobileEmptyState 
                      type="schedule" 
                      message="Não há agendamentos para este dia."
                      submessage={checkIsToday(selectedDate) 
                        ? 'Você não tem tarefas para hoje. Aproveite o dia! 🎉' 
                        : 'Selecione outra data para ver as tarefas.'}
                    />
                  )}

                  {/* Inspections Section - Limited to 6 cards max */}
                  {(() => {
                    const allInspections = [...scheduledInspections, ...inProgressInspections, ...completedInspections];
                    const displayedInspections = allInspections.slice(0, 6);
                    const hasMoreInspections = allInspections.length > 6;
                    
                    return (
                      <>
                        {displayedInspections.map(inspection => (
                          <MobileInspectionCard
                            key={inspection.id}
                            inspection={inspection}
                            variant={
                              inspection.status === 'completed' ? 'completed' :
                              inspection.status === 'in_progress' ? 'inProgress' : 'scheduled'
                            }
                            onOpenDetail={(i) => setSelectedInspection(i)}
                          />
                        ))}
                        
                        {hasMoreInspections && (
                          <button
                            onClick={() => navigate('/inspecoes')}
                            className="w-full py-3 px-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30 active:scale-[0.98]"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                            Ver todas as {allInspections.length} inspeções
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    );
                  })()}

                  {/* Schedule List - Memoized */}
                  <MobileScheduleList
                    pendingSchedules={pendingSchedules}
                    inProgressSchedules={inProgressSchedules}
                    completedSchedules={completedSchedules}
                    onScheduleClick={onScheduleClick}
                    loadingScheduleId={loadingScheduleId}
                  />
                </div>

                {/* Tomorrow Section */}
                {nextDaySchedules.length > 0 && (
                  <>
                    <div className="mt-4 px-6 pt-4 pb-3">
                      <h2 className="text-[26px] font-bold leading-tight text-slate-900 dark:text-white tracking-tight">Amanhã</h2>
                    </div>
                    <div className="px-6 flex flex-col gap-4 pb-6">
                      {nextDaySchedules.map(schedule => (
                        <MobileScheduleCard
                          key={schedule.id}
                          schedule={schedule}
                          onScheduleClick={onScheduleClick}
                          variant="tomorrow"
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Color Legend - At the bottom of day view */}
                <div className="mt-6 mx-6 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Legenda dos indicadores</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">Pendente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#E0C051]" />
                      <span className="text-xs text-muted-foreground">Em andamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                      <span className="text-xs text-muted-foreground">Concluída</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                      <span className="text-xs text-muted-foreground">Inspeção</span>
                    </div>
                  </div>
                </div>
              </main>
            </>
          )}
        </div>
      )}

      {/* Bottom Navigation - Memoized */}
      <MobileBottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={closeLocationModal}
        permissionState={locationPermissionState}
        onRequestPermission={requestLocationPermission}
        onContinueWithoutLocation={dismissLocationModal}
      />

      {/* Overdue Tasks Drawer */}
      <MobileOverdueDrawer
        isOpen={showOverdueDrawer}
        onClose={() => setShowOverdueDrawer(false)}
        overdueSchedules={overdueSchedules}
        onScheduleClick={onScheduleClick}
      />

      {/* Inspection Detail View */}
      {selectedInspection && (
        <MobileInspectionDetail
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
          onUpdate={(shouldClose = true) => {
            refetchInspections();
            if (shouldClose) {
              setSelectedInspection(null);
            }
          }}
        />
      )}
    </div>
  );
}
