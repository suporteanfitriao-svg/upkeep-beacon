import { useState, useMemo } from 'react';
import { Clock, PlayCircle, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { StatusCard } from '@/components/dashboard/StatusCard';
import { ScheduleCard } from '@/components/dashboard/ScheduleCard';
import { ScheduleDetail } from '@/components/dashboard/ScheduleDetail';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import { mockSchedules, calculateStats } from '@/data/mockSchedules';
import { Schedule, ScheduleStatus } from '@/types/scheduling';

const Index = () => {
  const [schedules, setSchedules] = useState<Schedule[]>(mockSchedules);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScheduleStatus | 'all'>('all');

  const stats = useMemo(() => calculateStats(schedules), [schedules]);

  const filteredSchedules = useMemo(() => {
    if (activeFilter === 'all') return schedules;
    return schedules.filter(s => s.status === activeFilter);
  }, [schedules, activeFilter]);

  const counts = useMemo(() => ({
    waiting: stats.waiting,
    cleaning: stats.cleaning,
    inspection: stats.inspection,
    completed: stats.completed,
  }), [stats]);

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
    setActiveFilter(status);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardHeader onRefresh={handleRefresh} />

        {/* Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatusCard
            title="Aguardando"
            count={stats.waiting}
            icon={Clock}
            variant="waiting"
            onClick={() => handleFilterByStatus('waiting')}
          />
          <StatusCard
            title="Em Limpeza"
            count={stats.cleaning}
            icon={PlayCircle}
            variant="progress"
            onClick={() => handleFilterByStatus('cleaning')}
          />
          <StatusCard
            title="Inspeção"
            count={stats.inspection}
            icon={Search}
            variant="inspection"
            onClick={() => handleFilterByStatus('inspection')}
          />
          <StatusCard
            title="Finalizados"
            count={stats.completed}
            icon={CheckCircle2}
            variant="completed"
            onClick={() => handleFilterByStatus('completed')}
          />
          <StatusCard
            title="Alertas"
            count={stats.maintenanceAlerts}
            icon={AlertTriangle}
            variant="alert"
            onClick={() => {
              const alertSchedules = schedules.filter(s => s.maintenanceStatus !== 'ok');
              if (alertSchedules.length > 0) {
                setSelectedSchedule(alertSchedules[0]);
              }
            }}
          />
        </div>

        {/* Filter Tabs */}
        <FilterTabs 
          activeFilter={activeFilter} 
          onFilterChange={handleFilterByStatus}
          counts={counts}
        />

        {/* Schedules List */}
        <div className="space-y-3">
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum agendamento encontrado</p>
            </div>
          ) : (
            filteredSchedules.map(schedule => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onClick={() => setSelectedSchedule(schedule)}
              />
            ))
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
      </div>
    </div>
  );
};

export default Index;
