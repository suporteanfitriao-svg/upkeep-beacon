import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Clock, User, AlertTriangle, ChevronRight, Camera, FileCheck } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';

interface CompletedScheduleRowProps {
  schedule: Schedule;
  onClick: () => void;
}

function formatDuration(startAt: Date | undefined, endAt: Date | undefined): string {
  if (!startAt || !endAt) return '--';
  const minutes = differenceInMinutes(endAt, startAt);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
}

export function CompletedScheduleRow({ schedule, onClick }: CompletedScheduleRowProps) {
  const hasIssues = schedule.maintenanceIssues.length > 0;
  const completedDate = schedule.endAt || schedule.checkOut;
  const photosCount = Object.values(schedule.categoryPhotos || {}).reduce((acc, photos) => acc + photos.length, 0);
  const checklistCompleted = schedule.checklist.filter(item => item.completed).length;
  const checklistTotal = schedule.checklist.length;

  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-4 rounded-xl border bg-card p-4 transition-all cursor-pointer hover:shadow-md hover:border-primary/30"
    >
      {/* Property Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm truncate">{schedule.propertyName}</h3>
          {hasIssues && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600">
              <AlertTriangle className="w-3 h-3" />
              {schedule.maintenanceIssues.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{schedule.propertyAddress}</span>
        </div>
        
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
            <span>{format(completedDate, "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(schedule.startAt, schedule.endAt)}</span>
          </div>
          {schedule.cleanerName && schedule.cleanerName !== 'Não atribuído' && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{schedule.cleanerName}</span>
            </div>
          )}
          {checklistTotal > 0 && (
            <div className="flex items-center gap-1">
              <FileCheck className="w-3 h-3" />
              <span>{checklistCompleted}/{checklistTotal}</span>
            </div>
          )}
          {photosCount > 0 && (
            <div className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{photosCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 text-xs font-medium">
          Finalizado
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}
