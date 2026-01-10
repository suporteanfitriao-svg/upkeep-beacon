import { useState, useMemo, useCallback, useEffect } from 'react';
import { Loader2, CalendarX } from 'lucide-react';
import { toast } from 'sonner';
import { isToday, isTomorrow, isSameDay } from 'date-fns';

import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { AdminDashboardHeader } from '@/components/dashboard/AdminDashboardHeader';
import { AdminStatusCards } from '@/components/dashboard/AdminStatusCards';
import { AdminFilters, DateFilter } from '@/components/dashboard/AdminFilters';
import { AdminScheduleRow } from '@/components/dashboard/AdminScheduleRow';
import { ScheduleDetail } from '@/components/dashboard/ScheduleDetail';
import { MobileDashboard } from '@/components/dashboard/MobileDashboard';
import { UpcomingSchedules } from '@/components/dashboard/UpcomingSchedules';
import { useSchedules, calculateStats } from '@/hooks/useSchedules';
import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

const SYNC_STORAGE_KEY = 'lastSyncData';

const Index = () => {
  const isMobile = useIsMobile();
  const { schedules, loading, error, refetch, updateSchedule, updateScheduleTimes } = useSchedules();
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<ScheduleStatus | 'all'>('all');
  
  // Sync tracking - initialize from localStorage
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
  
  // Persist sync data to localStorage
  useEffect(() => {
    const data = {
      lastSyncTime: lastSyncTime?.toISOString() || null,
      newReservationsCount
    };
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(data));
  }, [lastSyncTime, newReservationsCount]);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');

  const stats = useMemo(() => calculateStats(schedules), [schedules]);

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

      // Date filter (by checkout date)
      const checkOutDate = schedule.checkOut;
      if (dateFilter === 'today' && !isToday(checkOutDate)) return false;
      if (dateFilter === 'tomorrow' && !isTomorrow(checkOutDate)) return false;
      if (dateFilter === 'custom' && customDate && !isSameDay(checkOutDate, customDate)) return false;

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
  }, [schedules, activeStatusFilter, statusFilter, responsibleFilter, dateFilter, customDate, searchQuery]);

  // Filtered stats for current date filter
  const filteredStats = useMemo(() => {
    const dateFiltered = schedules.filter(schedule => {
      const checkOutDate = schedule.checkOut;
      if (dateFilter === 'today') return isToday(checkOutDate);
      if (dateFilter === 'tomorrow') return isTomorrow(checkOutDate);
      if (dateFilter === 'custom' && customDate) return isSameDay(checkOutDate, customDate);
      return true;
    });
    return calculateStats(dateFiltered);
  }, [schedules, dateFilter, customDate]);

  // Count of today's checkouts
  const todayCheckoutsCount = useMemo(() => {
    return schedules.filter(schedule => isToday(schedule.checkOut)).length;
  }, [schedules]);

  // Sync iCal reservations and refetch schedules
  const syncAndRefresh = useCallback(async (): Promise<{ synced: number } | null> => {
    try {
      // Call edge function to sync iCal reservations
      const { data, error: syncError } = await supabase.functions.invoke('sync-ical-reservations');
      
      if (syncError) {
        console.error('Error syncing iCal:', syncError);
      }
      
      // Refetch schedules from database
      await refetch();
      
      return data as { synced: number } | null;
    } catch (err) {
      console.error('Sync error:', err);
      await refetch(); // Still refetch even if sync fails
      return null;
    }
  }, [refetch]);

  // Auto-sync every 5 minutes (admin panel only, not mobile)
  useEffect(() => {
    if (isMobile) return;
    
    const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    const autoSync = async () => {
      console.log('Auto-sync triggered');
      const result = await syncAndRefresh();
      setLastSyncTime(new Date());
      
      if (result?.synced !== undefined) {
        setNewReservationsCount(result.synced);
        if (result.synced > 0) {
          toast.success(`${result.synced} nova${result.synced > 1 ? 's' : ''} reserva${result.synced > 1 ? 's' : ''} sincronizada${result.synced > 1 ? 's' : ''}!`, {
            description: 'Sincronização automática',
            duration: 4000,
          });
        }
      }
    };
    
    const intervalId = setInterval(autoSync, AUTO_SYNC_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [isMobile, syncAndRefresh]);

  const handleRefresh = async () => {
    const result = await syncAndRefresh();
    setLastSyncTime(new Date());
    
    if (result?.synced !== undefined) {
      setNewReservationsCount(result.synced);
      if (result.synced > 0) {
        toast.success(`${result.synced} reserva${result.synced > 1 ? 's' : ''} sincronizada${result.synced > 1 ? 's' : ''}!`, {
          description: 'Dashboard atualizado com sucesso',
        });
      } else {
        toast.success('Dashboard atualizado!', {
          description: 'Nenhuma nova reserva encontrada',
        });
      }
    } else {
      setNewReservationsCount(0);
      toast.success('Dashboard atualizado!');
    }
  };

  const handleUpdateSchedule = async (updatedSchedule: Schedule, previousStatus?: ScheduleStatus) => {
    const success = await updateSchedule(updatedSchedule, previousStatus);
    if (success) {
      // When starting cleaning, the hook will load the checklist from the property
      // We need to refetch to get the updated schedule with the loaded checklist
      if (updatedSchedule.status === 'cleaning' && previousStatus !== 'cleaning') {
        await refetch();
      }
      // Update selected schedule from the latest schedules state
      setSelectedSchedule(prev => {
        if (prev && prev.id === updatedSchedule.id) {
          return { ...updatedSchedule };
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
    const success = await updateScheduleTimes(scheduleId, checkInTime, checkOutTime);
    if (success) {
      toast.success('Horários atualizados!');
    } else {
      toast.error('Erro ao atualizar horários');
    }
  };

  const handleReleaseSchedule = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      const success = await updateSchedule({ ...schedule, status: 'released' }, 'waiting');
      if (success) {
        toast.success('Liberado para limpeza!');
      } else {
        toast.error('Erro ao liberar agendamento');
      }
    }
  };

  // Handler for mobile - start cleaning
  const handleStartCleaning = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      const success = await updateSchedule({ ...schedule, status: 'cleaning' }, schedule.status);
      if (success) {
        await refetch();
        toast.success('Limpeza iniciada!');
      } else {
        toast.error('Erro ao iniciar limpeza');
      }
    }
  };

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
            {/* Status Cards */}
            <AdminStatusCards 
              stats={filteredStats}
              onFilterByStatus={handleFilterByStatus}
              activeFilter={activeStatusFilter}
            />

            {/* Filters */}
            <AdminFilters
              dateFilter={dateFilter}
              customDate={customDate}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              responsibleFilter={responsibleFilter}
              onDateFilterChange={setDateFilter}
              onCustomDateChange={setCustomDate}
              onSearchChange={setSearchQuery}
              onStatusFilterChange={setStatusFilter}
              onResponsibleFilterChange={setResponsibleFilter}
            />

            {/* Schedules List */}
            <section className="space-y-4">
              {filteredSchedules.length === 0 ? (
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
                filteredSchedules.map(schedule => (
                  <AdminScheduleRow
                    key={schedule.id}
                    schedule={schedule}
                    onClick={() => setSelectedSchedule(schedule)}
                    onScheduleUpdated={(updated) => {
                      // Update local schedule state when quick actions are used
                      if (selectedSchedule?.id === updated.id) {
                        setSelectedSchedule(updated);
                      }
                    }}
                  />
                ))
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
      </div>
    </SidebarProvider>
  );
};

export default Index;
