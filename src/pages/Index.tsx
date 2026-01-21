import { useState, useMemo, useCallback, useEffect, createContext, useContext, useRef } from 'react';
import { Loader2, CalendarX, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { isToday, isTomorrow, isSameDay, isWithinInterval, startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { AdminDashboardHeader } from '@/components/dashboard/AdminDashboardHeader';
import { AdminStatusCards } from '@/components/dashboard/AdminStatusCards';
import { AdminFilters, DateFilter } from '@/components/dashboard/AdminFilters';
import { AdminScheduleRow } from '@/components/dashboard/AdminScheduleRow';
import { AdminScheduleRowSkeletonList } from '@/components/dashboard/AdminScheduleRowSkeleton';
import { AdminStatusCardsSkeleton } from '@/components/dashboard/AdminStatusCardsSkeleton';
import { AdminInspectionsSection } from '@/components/dashboard/AdminInspectionsSection';
import { ScheduleDetail } from '@/components/dashboard/ScheduleDetail';
import { MobileDashboard } from '@/components/dashboard/MobileDashboard';
import { UpcomingSchedules } from '@/components/dashboard/UpcomingSchedules';
import { CleaningTimeAlertBanner } from '@/components/dashboard/CleaningTimeAlertBanner';

import { useSchedules, calculateStats } from '@/hooks/useSchedules';
import { useAdminInspections } from '@/hooks/useAdminInspections';
import { useCleaningTimeAlerts } from '@/hooks/useCleaningTimeAlert';
import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const SYNC_STORAGE_KEY = 'lastSyncData';
const FILTERS_STORAGE_KEY = 'adminDashboardFilters';
const SYNC_TIMEOUT_MS = 60000; // 60 seconds
const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Helper to safely parse stored filters
function getStoredFilters() {
  try {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        dateFilter: data.dateFilter || 'today',
        customDate: data.customDate ? new Date(data.customDate) : undefined,
        dateRange: data.dateRange ? {
          from: data.dateRange.from ? new Date(data.dateRange.from) : undefined,
          to: data.dateRange.to ? new Date(data.dateRange.to) : undefined,
        } : undefined,
        statusFilter: data.statusFilter || 'all',
        responsibleFilter: data.responsibleFilter || 'all',
        propertyFilter: data.propertyFilter || 'all',
      };
    }
  } catch (e) {
    console.warn('Failed to parse stored filters:', e);
  }
  return null;
}

interface SyncLog {
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'success' | 'error' | 'timeout';
  userId?: string;
  duration?: number;
  syncedCount?: number;
}

// Sync Overlay Component (inline to avoid circular dependencies)
function SyncOverlayInline({ isSyncing }: { isSyncing: boolean }) {
  if (!isSyncing) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        "animate-in fade-in duration-200"
      )}
      style={{ pointerEvents: 'all' }}
    >
      <div className="absolute inset-0" />
      
      <div className="relative bg-card rounded-3xl shadow-2xl border border-border p-10 max-w-md mx-4 animate-in zoom-in-95 duration-300">
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-28 h-28 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-24 h-24 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          
          <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-4xl">
              lock
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground text-center mb-3">
          Atualização em andamento
        </h2>

        <p className="text-muted-foreground text-center leading-relaxed mb-8">
          Estamos sincronizando as informações mais recentes. Por favor, aguarde um momento.
        </p>

        <div className="flex items-center justify-center gap-2">
          <div 
            className="w-3 h-3 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className="w-3 h-3 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div 
            className="w-3 h-3 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  const isMobile = useIsMobile();
  const { schedules, loading, error, refetch, updateSchedule, updateScheduleTimes, updateScheduleLocal } = useSchedules();
  const { inspections: adminInspections, loading: inspectionsLoading, refetch: refetchInspections } = useAdminInspections();
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  
  // Initialize from localStorage
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const stored = localStorage.getItem(SYNC_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data.lastSyncTime ? new Date(data.lastSyncTime) : null;
    }
    return null;
  });
  
  const [newReservationsCount, setNewReservationsCount] = useState(() => {
    const stored = localStorage.getItem(SYNC_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data.newReservationsCount || 0;
    }
    return 0;
  });

  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<ScheduleStatus | 'all'>('all');
  
  // Filters - initialize from localStorage
  const storedFilters = useMemo(() => getStoredFilters(), []);
  const [dateFilter, setDateFilter] = useState<DateFilter>(storedFilters?.dateFilter || 'today');
  const [customDate, setCustomDate] = useState<Date | undefined>(storedFilters?.customDate);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(storedFilters?.dateRange);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(storedFilters?.statusFilter || 'all');
  const [responsibleFilter, setResponsibleFilter] = useState(storedFilters?.responsibleFilter || 'all');
  const [propertyFilter, setPropertyFilter] = useState(storedFilters?.propertyFilter || 'all');
  
  // Pagination for range mode
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Persist sync data to localStorage
  useEffect(() => {
    const data = {
      lastSyncTime: lastSyncTime?.toISOString() || null,
      newReservationsCount
    };
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(data));
  }, [lastSyncTime, newReservationsCount]);

  // Persist filters to localStorage
  useEffect(() => {
    const data = {
      dateFilter,
      customDate: customDate?.toISOString() || null,
      dateRange: dateRange ? {
        from: dateRange.from?.toISOString() || null,
        to: dateRange.to?.toISOString() || null,
      } : null,
      statusFilter,
      responsibleFilter,
      propertyFilter,
    };
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(data));
  }, [dateFilter, customDate, dateRange, statusFilter, responsibleFilter, propertyFilter]);

  const stats = useMemo(() => calculateStats(schedules), [schedules]);

  // Cleaning time alerts
  const cleaningTimeAlerts = useCleaningTimeAlerts(schedules);

  // Apply all filters and sort (completed last)
  const filteredSchedules = useMemo(() => {
    const filtered = schedules.filter(schedule => {
      // Status filter (from cards or dropdown)
      const effectiveStatusFilter = activeStatusFilter !== 'all' ? activeStatusFilter : statusFilter;
      if (effectiveStatusFilter !== 'all' && schedule.status !== effectiveStatusFilter) {
        return false;
      }

      // Responsible filter
      if (responsibleFilter !== 'all' && schedule.cleanerName !== responsibleFilter) {
        return false;
      }

      // Property filter
      if (propertyFilter !== 'all' && schedule.propertyId !== propertyFilter) {
        return false;
      }

      // Date filter (by checkout date)
      const checkOutDate = schedule.checkOut;
      if (dateFilter === 'today' && !isToday(checkOutDate)) return false;
      if (dateFilter === 'tomorrow' && !isTomorrow(checkOutDate)) return false;
      if (dateFilter === 'custom' && customDate && !isSameDay(checkOutDate, customDate)) return false;
      if ((dateFilter === 'range' || dateFilter === 'week' || dateFilter === 'month') && dateRange?.from) {
        const rangeEnd = dateRange.to || dateRange.from;
        const isInRange = isWithinInterval(checkOutDate, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(rangeEnd) 
        });
        if (!isInRange) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesProperty = schedule.propertyName.toLowerCase().includes(query);
        const matchesCleaner = schedule.cleanerName.toLowerCase().includes(query);
        if (!matchesProperty && !matchesCleaner) return false;
      }

      return true;
    });

    // Sort: by checkout time, then completed schedules go to the end
    return filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      // Sort by checkout time
      return a.checkOut.getTime() - b.checkOut.getTime();
    });
  }, [schedules, activeStatusFilter, statusFilter, responsibleFilter, dateFilter, customDate, dateRange, searchQuery]);

  // Paginated schedules - always apply pagination when more than 10 items
  const paginatedSchedules = useMemo(() => {
    if (filteredSchedules.length <= ITEMS_PER_PAGE) {
      return filteredSchedules;
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSchedules.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSchedules, currentPage, ITEMS_PER_PAGE]);

  const totalPages = useMemo(() => {
    if (filteredSchedules.length <= ITEMS_PER_PAGE) return 1;
    return Math.ceil(filteredSchedules.length / ITEMS_PER_PAGE);
  }, [filteredSchedules.length, ITEMS_PER_PAGE]);

  // Calculate filter counts for date filter buttons
  const dateFilterCounts = useMemo(() => {
    const today = new Date();
    const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    return {
      today: schedules.filter(s => isToday(s.checkOut)).length,
      tomorrow: schedules.filter(s => isTomorrow(s.checkOut)).length,
      week: schedules.filter(s => isWithinInterval(s.checkOut, { 
        start: startOfDay(nextWeekStart), 
        end: endOfDay(nextWeekEnd) 
      })).length,
      month: schedules.filter(s => isWithinInterval(s.checkOut, { 
        start: startOfDay(monthStart), 
        end: endOfDay(monthEnd) 
      })).length,
    };
  }, [schedules]);

  // Transition state for smooth filter changes
  const [isFilterTransitioning, setIsFilterTransitioning] = useState(false);
  const filterTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset page and trigger smooth transition when filters change
  useEffect(() => {
    setCurrentPage(1);
    
    // Trigger brief transition for smooth visual update
    setIsFilterTransitioning(true);
    
    // Clear any existing timeout
    if (filterTransitionTimeoutRef.current) {
      clearTimeout(filterTransitionTimeoutRef.current);
    }
    
    // End transition after a short delay - enough for skeleton to render smoothly
    filterTransitionTimeoutRef.current = setTimeout(() => {
      setIsFilterTransitioning(false);
    }, 200);
    
    return () => {
      if (filterTransitionTimeoutRef.current) {
        clearTimeout(filterTransitionTimeoutRef.current);
      }
    };
  }, [dateFilter, customDate, dateRange, statusFilter, responsibleFilter, searchQuery, activeStatusFilter, propertyFilter]);

  // Filtered stats that reflect ALL applied filters (except status, which is what we're counting)
  const filteredStats = useMemo(() => {
    const filtered = schedules.filter(schedule => {
      // Responsible filter
      if (responsibleFilter !== 'all' && schedule.cleanerName !== responsibleFilter) {
        return false;
      }

      // Date filter (by checkout date)
      const checkOutDate = schedule.checkOut;
      if (dateFilter === 'today' && !isToday(checkOutDate)) return false;
      if (dateFilter === 'tomorrow' && !isTomorrow(checkOutDate)) return false;
      if (dateFilter === 'custom' && customDate && !isSameDay(checkOutDate, customDate)) return false;
      if ((dateFilter === 'range' || dateFilter === 'week' || dateFilter === 'month') && dateRange?.from) {
        const rangeEnd = dateRange.to || dateRange.from;
        const isInRange = isWithinInterval(checkOutDate, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(rangeEnd) 
        });
        if (!isInRange) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesProperty = schedule.propertyName.toLowerCase().includes(query);
        const matchesCleaner = schedule.cleanerName.toLowerCase().includes(query);
        if (!matchesProperty && !matchesCleaner) return false;
      }

      return true;
    });
    return calculateStats(filtered);
  }, [schedules, dateFilter, customDate, dateRange, responsibleFilter, searchQuery]);

  // Filter inspections by date filter (same as schedules)
  const filteredInspections = useMemo(() => {
    return adminInspections.filter(inspection => {
      const inspectionDate = parseISO(inspection.scheduled_date);
      if (dateFilter === 'today') return isToday(inspectionDate);
      if (dateFilter === 'tomorrow') return isTomorrow(inspectionDate);
      if (dateFilter === 'custom' && customDate) return isSameDay(inspectionDate, customDate);
      if ((dateFilter === 'range' || dateFilter === 'week' || dateFilter === 'month') && dateRange?.from) {
        const rangeEnd = dateRange.to || dateRange.from;
        return isWithinInterval(inspectionDate, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(rangeEnd) 
        });
      }
      return true;
    });
  }, [adminInspections, dateFilter, customDate, dateRange]);

  // Sync function with all rules implemented
  const startSync = useCallback(async (): Promise<{ synced: number } | null> => {
    // Prevent concurrent syncs (rule 7.1)
    if (syncInProgressRef.current) {
      console.log('[Sync] Sync already in progress, ignoring request');
      return null;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    // Close any open schedule detail panel during sync (rule 6.1)
    if (selectedSchedule) {
      toast.info('Atualização em andamento', {
        description: 'Detalhes do agendamento fechados para sincronização.',
        duration: 3000,
      });
      setSelectedSchedule(null);
    }

    const startTime = new Date();
    const currentLog: SyncLog = {
      startTime,
      status: 'in_progress',
    };

    // Get current user for audit (rule 8.1)
    const { data: { user } } = await supabase.auth.getUser();
    currentLog.userId = user?.id;

    setSyncLogs(prev => [...prev.slice(-9), currentLog]);

    // Create timeout promise (rule 5.2)
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
      setTimeout(() => resolve({ timeout: true }), SYNC_TIMEOUT_MS);
    });

    // Create sync promise
    const syncPromise = (async () => {
      try {
        console.log('[Sync] Starting sync at', startTime.toISOString());

        // Call edge function to sync iCal reservations
        const { data, error: syncError } = await supabase.functions.invoke('sync-ical-reservations');

        if (syncError) {
          console.error('[Sync] Error syncing iCal:', syncError);
          throw syncError;
        }

        // Refetch schedules from database (rule 2.1)
        await refetch();

        return data as { synced: number } | null;
      } catch (err) {
        console.error('[Sync] Sync error:', err);
        throw err;
      }
    })();

    try {
      // Race between sync and timeout
      const result = await Promise.race([syncPromise, timeoutPromise]);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      if ('timeout' in result) {
        // Timeout occurred (rule 5.2)
        console.log('[Sync] Sync timed out after', SYNC_TIMEOUT_MS, 'ms');
        setSyncError('Falha ao sincronizar. Tente atualizar novamente.');
        
        setSyncLogs(prev => {
          const updated = [...prev];
          const lastLog = updated[updated.length - 1];
          if (lastLog) {
            lastLog.endTime = endTime;
            lastLog.status = 'timeout';
            lastLog.duration = duration;
          }
          return updated;
        });

        toast.error('Falha ao sincronizar', {
          description: 'Tente atualizar novamente.',
          duration: 5000,
        });

        return null;
      }

      // Success (rule 5.1)
      console.log('[Sync] Sync completed successfully in', duration, 'ms');
      
      setLastSyncTime(endTime);
      const syncedCount = result?.synced || 0;
      setNewReservationsCount(syncedCount);

      // Update audit log (rule 8.1)
      setSyncLogs(prev => {
        const updated = [...prev];
        const lastLog = updated[updated.length - 1];
        if (lastLog) {
          lastLog.endTime = endTime;
          lastLog.status = 'success';
          lastLog.duration = duration;
          lastLog.syncedCount = syncedCount;
        }
        return updated;
      });

      return result;
    } catch (err) {
      // Error occurred
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.error('[Sync] Sync failed:', err);
      setSyncError('Falha ao sincronizar. Tente atualizar novamente.');
      
      setSyncLogs(prev => {
        const updated = [...prev];
        const lastLog = updated[updated.length - 1];
        if (lastLog) {
          lastLog.endTime = endTime;
          lastLog.status = 'error';
          lastLog.duration = duration;
        }
        return updated;
      });

      toast.error('Falha ao sincronizar', {
        description: 'Tente atualizar novamente.',
        duration: 5000,
      });

      // Still try to refetch even on error
      try {
        await refetch();
      } catch {}

      return null;
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [refetch, selectedSchedule]);

  // Auto-sync every 10 minutes (rule 1.1, 1.2) - admin panel only
  useEffect(() => {
    if (isMobile) return;
    
    console.log('[Sync] Setting up auto-sync interval:', AUTO_SYNC_INTERVAL_MS, 'ms (10 minutes)');
    
    const autoSync = async () => {
      console.log('[Sync] Auto-sync triggered at', new Date().toISOString());
      const result = await startSync();
      
      if (result?.synced && result.synced > 0) {
        toast.success(`${result.synced} nova${result.synced > 1 ? 's' : ''} reserva${result.synced > 1 ? 's' : ''} sincronizada${result.synced > 1 ? 's' : ''}!`, {
          description: 'Sincronização automática',
          duration: 4000,
        });
      }
    };

    const intervalId = setInterval(autoSync, AUTO_SYNC_INTERVAL_MS);

    return () => {
      console.log('[Sync] Clearing auto-sync interval');
      clearInterval(intervalId);
    };
  }, [isMobile, startSync]);

  const handleRefresh = async () => {
    const result = await startSync();
    
    if (result?.synced !== undefined) {
      if (result.synced > 0) {
        toast.success(`${result.synced} reserva${result.synced > 1 ? 's' : ''} sincronizada${result.synced > 1 ? 's' : ''}!`, {
          description: 'Dashboard atualizado com sucesso',
        });
      } else {
        toast.success('Dashboard atualizado!', {
          description: 'Nenhuma nova reserva encontrada',
        });
      }
    }
  };

  const handleUpdateSchedule = async (updatedSchedule: Schedule, previousStatus?: ScheduleStatus) => {
    // Block updates during sync (rule 3.2)
    if (isSyncing) {
      toast.info('Atualização em andamento', {
        description: 'Aguarde a sincronização terminar.',
      });
      return;
    }
    
    const result = await updateSchedule(updatedSchedule, previousStatus);
    if (result) {
      // Update selected schedule state with the returned schedule (includes updated checklist)
      setSelectedSchedule(prev => {
        if (prev && prev.id === result.id) {
          return result;
        }
        return prev;
      });
    } else {
      toast.error('Erro ao atualizar agendamento');
    }
  };

  const handleFilterByStatus = (status: ScheduleStatus | 'all') => {
    setActiveStatusFilter(status);
  };

  const handleUpdateTimes = async (scheduleId: string, checkInTime: string, checkOutTime: string) => {
    // Block updates during sync (rule 3.2)
    if (isSyncing) {
      toast.info('Atualização em andamento', {
        description: 'Aguarde a sincronização terminar.',
      });
      return;
    }
    
    const success = await updateScheduleTimes(scheduleId, checkInTime, checkOutTime);
    if (success) {
      toast.success('Horários atualizados!');
    } else {
      toast.error('Erro ao atualizar horários');
    }
  };

  const handleReleaseSchedule = async (scheduleId: string) => {
    // Block updates during sync (rule 3.2)
    if (isSyncing) {
      toast.info('Atualização em andamento', {
        description: 'Aguarde a sincronização terminar.',
      });
      return;
    }
    
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      const result = await updateSchedule({ ...schedule, status: 'released' }, 'waiting');
      if (result) {
        toast.success('Liberado para limpeza!');
      } else {
        toast.error('Erro ao liberar agendamento');
      }
    }
  };
  // Handler for mobile - start cleaning
  const handleStartCleaning = async (scheduleId: string) => {
    // Block updates during sync (rule 3.2)
    if (isSyncing) {
      toast.info('Atualização em andamento', {
        description: 'Aguarde a sincronização terminar.',
      });
      return;
    }
    
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      const result = await updateSchedule({ ...schedule, status: 'cleaning' }, schedule.status);
      if (result) {
        // Update selectedSchedule with the result that includes the checklist
        setSelectedSchedule(result);
        toast.success('Limpeza iniciada!');
      } else {
        toast.error('Erro ao iniciar limpeza');
      }
    }
  };

  // Sync for mobile dashboard
  const syncAndRefresh = useCallback(async (): Promise<{ synced: number } | null> => {
    return startSync();
  }, [startSync]);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Carregando agendamentos...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-destructive font-medium">{error}</p>
              <button
                onClick={refetch}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Tentar novamente
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <MobileDashboard
          schedules={schedules}
          onScheduleClick={setSelectedSchedule}
          onStartCleaning={handleStartCleaning}
          onRefresh={syncAndRefresh}
        />
        {selectedSchedule && (
          <ScheduleDetail
            schedule={selectedSchedule}
            onClose={() => setSelectedSchedule(null)}
            onUpdateSchedule={handleUpdateSchedule}
          />
        )}
        <SyncOverlayInline isSyncing={isSyncing} />
      </>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
        <AdminSidebar />
        
        <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
          <AdminDashboardHeader 
            onRefresh={handleRefresh} 
            lastSyncTime={lastSyncTime}
            newReservationsCount={newReservationsCount}
          />

          <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
            {/* Status Cards with skeleton during transition */}
            {isFilterTransitioning ? (
              <AdminStatusCardsSkeleton />
            ) : (
              <AdminStatusCards 
                stats={filteredStats}
                onFilterByStatus={handleFilterByStatus}
                activeFilter={activeStatusFilter}
              />
            )}

            {/* Cleaning Time Alerts - hide during transition */}
            {!isFilterTransitioning && (
              <CleaningTimeAlertBanner 
                alerts={cleaningTimeAlerts}
                onAlertClick={(scheduleId) => {
                  const schedule = schedules.find(s => s.id === scheduleId);
                  if (schedule) setSelectedSchedule(schedule);
                }}
                variant="admin"
              />
            )}

            {/* Filters - always visible, no transition */}
            <AdminFilters
              dateFilter={dateFilter}
              customDate={customDate}
              dateRange={dateRange}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              responsibleFilter={responsibleFilter}
              propertyFilter={propertyFilter}
              filterCounts={dateFilterCounts}
              onDateFilterChange={setDateFilter}
              onCustomDateChange={setCustomDate}
              onDateRangeChange={setDateRange}
              onSearchChange={setSearchQuery}
              onStatusFilterChange={setStatusFilter}
              onResponsibleFilterChange={setResponsibleFilter}
              onPropertyFilterChange={setPropertyFilter}
            />

            {/* Inspections Section */}
            {!isFilterTransitioning && (
              <AdminInspectionsSection 
                inspections={filteredInspections} 
                loading={inspectionsLoading} 
              />
            )}

            {/* Schedules List */}
            <section className="space-y-4">
              {isFilterTransitioning ? (
                <AdminScheduleRowSkeletonList count={Math.min(paginatedSchedules.length || 3, 5)} />
              ) : filteredSchedules.length === 0 ? (
                <div className="bg-card dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <CalendarX className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                    Nenhum agendamento encontrado
                  </h4>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Tente ajustar os filtros de data ou busca para encontrar o que procura.
                  </p>
                  
                  {/* Upcoming Schedules Section */}
                  <UpcomingSchedules 
                    schedules={schedules} 
                    onGoToDate={(date) => {
                      setDateFilter('custom');
                      setCustomDate(date);
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* Show count when there's pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {paginatedSchedules.length} de {filteredSchedules.length} agendamentos
                      </p>
                    </div>
                  )}
                  
                  {paginatedSchedules.map(schedule => (
                    <AdminScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      onClick={() => setSelectedSchedule(schedule)}
                      onScheduleUpdated={(updated) => {
                        // Update locally without refetching to prevent reload
                        updateScheduleLocal(updated);
                        if (selectedSchedule?.id === updated.id) {
                          setSelectedSchedule(updated);
                        }
                      }}
                    />
                  ))}

                  {/* Pagination - show when more than 10 items */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                          currentPage === 1
                            ? 'text-muted-foreground/50 cursor-not-allowed'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          // Show first, last, current, and neighbors
                          const showPage = page === 1 || 
                            page === totalPages || 
                            Math.abs(page - currentPage) <= 1;
                          
                          if (!showPage) {
                            // Show ellipsis
                            if (page === 2 || page === totalPages - 1) {
                              return (
                                <span key={page} className="px-2 text-muted-foreground">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          }
                          
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition-colors',
                                currentPage === page
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                          currentPage === totalPages
                            ? 'text-muted-foreground/50 cursor-not-allowed'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
            
            <div className="h-8" />
          </div>

          {/* Schedule Detail Panel */}
          {selectedSchedule && (
            <ScheduleDetail
              schedule={selectedSchedule}
              onClose={() => setSelectedSchedule(null)}
              onUpdateSchedule={handleUpdateSchedule}
            />
          )}
        </main>
        
        {/* Sync Overlay - covers entire dashboard (rule 3.1, 4.1, 4.2) */}
        <SyncOverlayInline isSyncing={isSyncing} />
      </div>
    </SidebarProvider>
  );
};

export default Index;
