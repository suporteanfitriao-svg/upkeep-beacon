import { memo } from 'react';
import { Schedule } from '@/types/scheduling';
import { MobileScheduleCard } from './MobileScheduleCard';

interface MobileScheduleListProps {
  pendingSchedules: Schedule[];
  inProgressSchedules: Schedule[];
  completedSchedules: Schedule[];
  onScheduleClick: (schedule: Schedule) => void;
  loadingScheduleId?: string | null;
}

export const MobileScheduleList = memo(function MobileScheduleList({
  pendingSchedules,
  inProgressSchedules,
  completedSchedules,
  onScheduleClick,
  loadingScheduleId
}: MobileScheduleListProps) {
  return (
    <>
      {/* In Progress Cards */}
      {inProgressSchedules.map(schedule => (
        <MobileScheduleCard
          key={schedule.id}
          schedule={schedule}
          onScheduleClick={onScheduleClick}
          loadingScheduleId={loadingScheduleId}
          variant="inProgress"
        />
      ))}

      {/* All Pending Cards */}
      {pendingSchedules.map(schedule => (
        <MobileScheduleCard
          key={schedule.id}
          schedule={schedule}
          onScheduleClick={onScheduleClick}
          loadingScheduleId={loadingScheduleId}
          variant="pending"
        />
      ))}

      {/* Completed Section */}
      {completedSchedules.length > 0 && (
        <>
          <div className="relative py-2 flex items-center gap-4">
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow" />
            <span className="text-xs font-bold text-[#8A8B88] uppercase tracking-widest">Concluídas</span>
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow" />
          </div>
          
          {completedSchedules.map(schedule => (
            <MobileScheduleCard
              key={schedule.id}
              schedule={schedule}
              onScheduleClick={onScheduleClick}
              variant="completed"
            />
          ))}
        </>
      )}
    </>
  );
});
