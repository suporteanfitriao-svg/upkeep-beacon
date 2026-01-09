import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AdminScheduleRowProps {
  schedule: Schedule;
  onClick: () => void;
}

const statusConfig: Record<ScheduleStatus, { 
  label: string; 
  dotColor: string;
  textColor: string;
  showTime?: boolean;
}> = {
  waiting: { 
    label: 'Aguardando Liberação', 
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-600',
  },
  released: { 
    label: 'Liberado', 
    dotColor: 'bg-emerald-400',
    textColor: 'text-emerald-600',
    showTime: true,
  },
  cleaning: { 
    label: 'Em Limpeza', 
    dotColor: 'bg-cyan-400',
    textColor: 'text-cyan-600',
    showTime: true,
  },
  completed: { 
    label: 'Finalizado', 
    dotColor: 'bg-orange-400',
    textColor: 'text-orange-600',
    showTime: true,
  },
};

const avatarColors = [
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-cyan-100 text-cyan-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
];

function getAvatarColor(name: string): string {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[index];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AdminScheduleRow({ schedule, onClick }: AdminScheduleRowProps) {
  const statusStyle = statusConfig[schedule.status];
  const hasIssue = schedule.maintenanceStatus !== 'ok';
  const checkoutTime = format(schedule.checkOut, "HH:mm");

  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-card rounded-xl border hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Status Indicator */}
      <div className="relative">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          schedule.status === 'completed' ? 'bg-emerald-100' : 'bg-muted'
        )}>
          {schedule.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <div className={cn('w-3 h-3 rounded-full', statusStyle.dotColor)} />
          )}
        </div>
      </div>

      {/* Property Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">
          {schedule.propertyName}
        </h3>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', statusStyle.textColor)}>
            {statusStyle.label}
            {statusStyle.showTime && ` - ${format(schedule.checkOut, "HH:mm")}`}
          </span>
          {hasIssue && (
            <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3" />
              AVARIA
            </span>
          )}
        </div>
      </div>

      {/* Checkout Info */}
      <div className="text-right hidden sm:block">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Checkout Previsto</p>
        <p className="font-medium text-foreground flex items-center justify-end gap-1">
          <span className="text-muted-foreground">🕐</span>
          {checkoutTime}
        </p>
      </div>

      {/* Responsible */}
      <div className="text-right hidden md:block">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Responsável</p>
        <p className="font-medium text-foreground">{schedule.cleanerName}</p>
      </div>

      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className={cn('font-semibold', getAvatarColor(schedule.cleanerName))}>
          {getInitials(schedule.cleanerName)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
