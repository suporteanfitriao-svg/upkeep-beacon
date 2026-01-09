import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
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
import { useSchedules, calculateStats } from '@/hooks/useSchedules';
import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  const { schedules, loading, error, refetch, updateSchedule, updateScheduleTimes } = useSchedules();
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<ScheduleStatus | 'all'>('all');
  
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

  const handleRefresh = async () => {
    await refetch();
    toast.success('Dashboard atualizado!');
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
          <AdminDashboardHeader onRefresh={handleRefresh} />

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
                <div className="text-center py-12 bg-card rounded-3xl border shadow-sm">
                  <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tente ajustar os filtros de data ou busca
                  </p>
                </div>
              ) : (
                filteredSchedules.map(schedule => (
                  <AdminScheduleRow
                    key={schedule.id}
                    schedule={schedule}
                    onClick={() => setSelectedSchedule(schedule)}
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
