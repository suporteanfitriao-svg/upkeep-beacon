import { useState, useEffect } from 'react';
import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Clock, Sparkles, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { AssignCleanerPopover } from './AssignCleanerPopover';
import { EditTimesPopover } from './EditTimesPopover';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminScheduleRowProps {
  schedule: Schedule;
  onClick: () => void;
  onScheduleUpdated?: (schedule: Schedule) => void;
}

const statusConfig: Record<ScheduleStatus, { 
  label: string; 
  borderColor: string;
  bgColor: string;
  iconBgColor: string;
  textColor: string;
  icon: typeof Clock;
  showTime?: boolean;
}> = {
  waiting: { 
    label: 'Aguardando Liberação', 
    borderColor: 'bg-amber-500',
    bgColor: 'bg-[#FFF8E1] dark:bg-amber-900/30',
    iconBgColor: 'bg-[#FFF8E1] dark:bg-amber-900/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  released: { 
    label: 'Liberado', 
    borderColor: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    icon: Check,
    showTime: true,
  },
  cleaning: { 
    label: 'Em Limpeza', 
    borderColor: 'bg-primary',
    bgColor: 'bg-[#E0F2F1] dark:bg-teal-900/30',
    iconBgColor: 'bg-[#E0F2F1] dark:bg-teal-900/30',
    textColor: 'text-primary',
    icon: Sparkles,
    showTime: true,
  },
  completed: { 
    label: 'Finalizado', 
    borderColor: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    icon: Check,
    showTime: true,
  },
};

const avatarColors = [
  { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-700/50', text: 'text-orange-600 dark:text-orange-400' },
  { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-700/50', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-700/50', text: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-700/50', text: 'text-rose-600 dark:text-rose-400' },
];

function getAvatarColor(name: string) {
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

export function AdminScheduleRow({ schedule, onClick, onScheduleUpdated }: AdminScheduleRowProps) {
  const { isAdmin, isManager } = useUserRole();
  const { user } = useAuth();
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [localSchedule, setLocalSchedule] = useState(schedule);

  const statusStyle = statusConfig[localSchedule.status];
  const hasIssue = localSchedule.maintenanceStatus !== 'ok';
  const checkoutTime = format(localSchedule.checkOut, "HH:mm");
  const avatarColor = getAvatarColor(localSchedule.cleanerName);
  const Icon = statusStyle.icon;
  const isCompleted = localSchedule.status === 'completed';
  const canManage = isAdmin || isManager;

  // Fetch team member id for current user
  useEffect(() => {
    const fetchTeamMemberId = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setTeamMemberId(data.id);
    };
    fetchTeamMemberId();
  }, [user?.id]);

  // Sync with parent schedule updates
  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  const handleAssigned = (cleanerName: string, cleanerTeamMemberId: string) => {
    const updated = {
      ...localSchedule,
      cleanerName,
      responsibleTeamMemberId: cleanerTeamMemberId,
    };
    setLocalSchedule(updated);
    onScheduleUpdated?.(updated);
  };

  const handleTimesUpdated = (checkIn: Date, checkOut: Date) => {
    const updated = {
      ...localSchedule,
      checkIn,
      checkOut,
    };
    setLocalSchedule(updated);
    onScheduleUpdated?.(updated);
  };

  // Cleaner cannot reassign during cleaning, only admin can
  const canReassignDuringCleaning = isAdmin;
  const isReassignDisabled = localSchedule.status === 'cleaning' && !canReassignDuringCleaning;

  return (
    <article 
      onClick={onClick}
      className={cn(
        'bg-card rounded-3xl shadow-sm border border-border p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group',
        isCompleted && 'opacity-75 hover:opacity-100'
      )}
    >
      {/* Left Border Indicator */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', hasIssue && isCompleted ? 'bg-rose-500' : statusStyle.borderColor)} />
      
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4 pl-2">
          {/* Status Icon */}
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform',
            statusStyle.iconBgColor
          )}>
            {localSchedule.status === 'cleaning' ? (
              <Sparkles className={cn('w-5 h-5', statusStyle.textColor)} />
            ) : (
              <Icon className={cn('w-5 h-5', statusStyle.textColor)} />
            )}
          </div>
          
          {/* Property Info */}
          <div>
            <h4 className="font-bold text-foreground">{localSchedule.propertyName}</h4>
            <div className="flex items-center gap-2">
              {localSchedule.status === 'cleaning' && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
              <p className={cn('text-sm font-medium', statusStyle.textColor)}>
                {statusStyle.label}
                {statusStyle.showTime && ` - ${checkoutTime}`}
              </p>
              {hasIssue && (
                <div className="flex items-center gap-1 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                    Avaria
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 md:gap-10">
          {/* Quick Actions - Only for admin/manager */}
          {canManage && (
            <div className="hidden lg:flex items-center gap-1">
              <AssignCleanerPopover
                scheduleId={localSchedule.id}
                propertyId={localSchedule.propertyId}
                currentCleanerName={localSchedule.cleanerName}
                responsibleTeamMemberId={localSchedule.responsibleTeamMemberId || null}
                status={localSchedule.status}
                onAssigned={handleAssigned}
                disabled={isReassignDisabled}
              />
              <EditTimesPopover
                scheduleId={localSchedule.id}
                checkIn={localSchedule.checkIn}
                checkOut={localSchedule.checkOut}
                status={localSchedule.status}
                onUpdated={handleTimesUpdated}
                teamMemberId={teamMemberId}
              />
            </div>
          )}

          {/* Checkout Time */}
          <div className="hidden md:block text-right">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">
              Checkout Previsto
            </p>
            <div className="flex items-center justify-end gap-1.5 text-foreground">
              <Clock className="w-3 h-3" />
              <span className="font-semibold text-sm">{checkoutTime}</span>
            </div>
          </div>
          
          {/* Responsible */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">
                Responsável
              </p>
              <p className="text-xs font-semibold text-foreground">{localSchedule.cleanerName}</p>
            </div>
            <div 
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border',
                avatarColor.bg,
                avatarColor.border,
                avatarColor.text
              )}
              title={localSchedule.cleanerName}
            >
              {getInitials(localSchedule.cleanerName)}
            </div>
          </div>
          
          {/* Chevron */}
          <button className="text-muted-foreground hover:text-primary transition-colors ml-2">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    </article>
  );
}