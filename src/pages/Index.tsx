import { useState, useMemo } from 'react';
import { Clock, PlayCircle, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { isToday, isTomorrow, isSameDay } from 'date-fns';

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { ScheduleRow } from '@/components/dashboard/ScheduleRow';
import { ScheduleDetail } from '@/components/dashboard/ScheduleDetail';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ScheduleFilters, DateFilter } from '@/components/dashboard/ScheduleFilters';
import { mockSchedules, calculateStats } from '@/data/mockSchedules';
import { Schedule, ScheduleStatus } from '@/types/scheduling';

const Index = () => {
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<ScheduleStatus | 'all'>('all');
  
  // New filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => calculateStats(schedules), [schedules]);

  // Apply all filters and sort (completed last)
  const filteredSchedules = useMemo(() => {
    const filtered = schedules.filter(schedule => {
      // Status filter
      if (activeStatusFilter !== 'all' && schedule.status !== activeStatusFilter) {
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
  }, [schedules, activeStatusFilter, dateFilter, customDate, searchQuery]);

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

  const handleRefresh = () => {
    toast.success('Dashboard atualizado!');
  };

  const handleUpdateSchedule = (updatedSchedule: Schedule) => {
    setSchedules(prev => 
      prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s)
    );
    setSelectedSchedule(updatedSchedule);
  };

  const handleFilterByStatus = (status: ScheduleStatus | 'all') => {
    setActiveStatusFilter(status);
  };

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
              title="Em Limpeza"
              count={filteredStats.cleaning}
              icon={PlayCircle}
              variant="progress"
              onClick={() => handleFilterByStatus(activeStatusFilter === 'cleaning' ? 'all' : 'cleaning')}
            />
            <StatusCard
              title="Inspeção"
              count={filteredStats.inspection}
              icon={Search}
              variant="inspection"
              onClick={() => handleFilterByStatus(activeStatusFilter === 'inspection' ? 'all' : 'inspection')}
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
            onDateFilterChange={setDateFilter}
            onCustomDateChange={setCustomDate}
            onSearchChange={setSearchQuery}
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
                {activeStatusFilter === 'cleaning' && 'Em Limpeza'}
                {activeStatusFilter === 'inspection' && 'Inspeção'}
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
                <div className="hidden md:grid grid-cols-[1fr_120px_100px_140px_100px_180px] gap-4 px-4 py-2 bg-muted/50 rounded-lg border text-sm font-medium text-muted-foreground">
                  <span>Propriedade</span>
                  <span>Status</span>
                  <span>Hora Início</span>
                  <span>Responsável</span>
                  <span>Hora Fim</span>
                  <span>Tags</span>
                </div>

                {filteredSchedules.map(schedule => (
                  <ScheduleRow
                    key={schedule.id}
                    schedule={schedule}
                    onClick={() => setSelectedSchedule(schedule)}
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
