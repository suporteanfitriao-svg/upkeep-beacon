import { useState, useMemo } from 'react';
import { Clock, PlayCircle, Search, CheckCircle2, AlertTriangle, Loader2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { isToday, isTomorrow, isSameDay } from 'date-fns';

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { ScheduleRow } from '@/components/dashboard/ScheduleRow';
import { ScheduleDetail } from '@/components/dashboard/ScheduleDetail';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ScheduleFilters, DateFilter } from '@/components/dashboard/ScheduleFilters';
import { useSchedules, calculateStats } from '@/hooks/useSchedules';
import { Schedule, ScheduleStatus } from '@/types/scheduling';

const Index = () => {
  const { schedules, loading, error, refetch, updateSchedule, updateScheduleTimes } = useSchedules();
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<ScheduleStatus | 'all'>('all');
  
  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');

  const stats = useMemo(() => calculateStats(schedules), [schedules]);

  // Apply all filters and sort (completed last)
  const filteredSchedules = useMemo(() => {
    const filtered = schedules.filter(schedule => {
      // Status filter
      if (activeStatusFilter !== 'all' && schedule.status !== activeStatusFilter) {
        return false;
      }

      // Property filter
      if (propertyFilter !== 'all' && schedule.propertyId !== propertyFilter) {
        return false;
      }

      // Date filter
      const checkInDate = schedule.checkIn;
      if (dateFilter === 'today' && !isToday(checkInDate)) return false;
      if (dateFilter === 'tomorrow' && !isTomorrow(checkInDate)) return false;
      if (dateFilter === 'custom' && customDate && !isSameDay(checkInDate, customDate)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesProperty = schedule.propertyName.toLowerCase().includes(query);
        const matchesCleaner = schedule.cleanerName.toLowerCase().includes(query);
        if (!matchesProperty && !matchesCleaner) return false;
      }

      return true;
    });

    // Sort: completed schedules go to the end
    return filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return 0;
    });
  }, [schedules, activeStatusFilter, propertyFilter, dateFilter, customDate, searchQuery]);

  // Filtered stats for current date filter
  const filteredStats = useMemo(() => {
    const dateFiltered = schedules.filter(schedule => {
      const checkInDate = schedule.checkIn;
      if (dateFilter === 'today') return isToday(checkInDate);
      if (dateFilter === 'tomorrow') return isTomorrow(checkInDate);
      if (dateFilter === 'custom' && customDate) return isSameDay(checkInDate, customDate);
      return true;
    });
    return calculateStats(dateFiltered);
  }, [schedules, dateFilter, customDate]);

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

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
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
          <AppSidebar />
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <DashboardHeader onRefresh={handleRefresh} />

          {/* Status Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <StatusCard
              title="Aguardando Liberação"
              count={filteredStats.waiting}
              icon={Clock}
              variant="waiting"
              onClick={() => handleFilterByStatus(activeStatusFilter === 'waiting' ? 'all' : 'waiting')}
            />
            <StatusCard
              title="Liberado"
              count={filteredStats.released}
              icon={CheckSquare}
              variant="released"
              onClick={() => handleFilterByStatus(activeStatusFilter === 'released' ? 'all' : 'released')}
            />
            <StatusCard
              title="Em Limpeza"
              count={filteredStats.cleaning}
              icon={PlayCircle}
              variant="progress"
              onClick={() => handleFilterByStatus(activeStatusFilter === 'cleaning' ? 'all' : 'cleaning')}
            />
            <StatusCard
              title="Finalizados"
              count={filteredStats.completed}
              icon={CheckCircle2}
              variant="completed"
              onClick={() => handleFilterByStatus(activeStatusFilter === 'completed' ? 'all' : 'completed')}
            />
            <StatusCard
              title="Alertas"
              count={filteredStats.maintenanceAlerts}
              icon={AlertTriangle}
              variant="alert"
              onClick={() => {
                const alertSchedules = filteredSchedules.filter(s => s.maintenanceStatus !== 'ok');
                if (alertSchedules.length > 0) {
                  setSelectedSchedule(alertSchedules[0]);
                }
              }}
            />
          </div>

          {/* Filters */}
          <ScheduleFilters
            dateFilter={dateFilter}
            customDate={customDate}
            searchQuery={searchQuery}
            propertyFilter={propertyFilter}
            onDateFilterChange={setDateFilter}
            onCustomDateChange={setCustomDate}
            onSearchChange={setSearchQuery}
            onPropertyFilterChange={setPropertyFilter}
          />

          {/* Active Filter Indicator */}
          {activeStatusFilter !== 'all' && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Filtrando por status:</span>
              <button
                onClick={() => setActiveStatusFilter('all')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                {activeStatusFilter === 'waiting' && 'Aguardando'}
                {activeStatusFilter === 'released' && 'Liberado'}
                {activeStatusFilter === 'cleaning' && 'Em Limpeza'}
                {activeStatusFilter === 'completed' && 'Finalizados'}
                <span className="ml-1">×</span>
              </button>
            </div>
          )}

          {/* Schedules List - Compact Rows */}
          <div className="space-y-2">
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border">
                <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente ajustar os filtros de data ou busca
                </p>
              </div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-2">
                  {filteredSchedules.length} agendamento(s) encontrado(s)
                </div>
                
                {/* Fixed Header Row */}
                <div className="hidden md:grid grid-cols-[1fr_110px_90px_70px_90px_70px_130px_150px] gap-3 px-4 py-2 bg-muted/50 rounded-lg border text-sm font-medium text-muted-foreground">
                  <span>Propriedade</span>
                  <span>Status</span>
                  <span>Check-in</span>
                  <span className="text-center">Hora</span>
                  <span className="font-bold">Check-out</span>
                  <span className="text-center font-bold">Hora</span>
                  <span>Responsável</span>
                  <span>Tags</span>
                </div>

                {filteredSchedules.map(schedule => (
                  <ScheduleRow
                    key={schedule.id}
                    schedule={schedule}
                    onClick={() => setSelectedSchedule(schedule)}
                    onUpdateTimes={handleUpdateTimes}
                    onReleaseSchedule={handleReleaseSchedule}
                  />
                ))}
              </>
            )}
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
