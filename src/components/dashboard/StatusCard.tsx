import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  variant: 'waiting' | 'progress' | 'inspection' | 'completed' | 'alert';
  onClick?: () => void;
}

const variantStyles = {
  waiting: 'bg-gradient-to-br from-status-waiting-bg to-status-waiting-bg/50 text-status-waiting border-status-waiting/30 shadow-status-waiting/10',
  progress: 'bg-gradient-to-br from-status-progress-bg to-status-progress-bg/50 text-status-progress border-status-progress/30 shadow-status-progress/10',
  inspection: 'bg-gradient-to-br from-status-inspection-bg to-status-inspection-bg/50 text-status-inspection border-status-inspection/30 shadow-status-inspection/10',
  completed: 'bg-gradient-to-br from-status-completed-bg to-status-completed-bg/50 text-status-completed border-status-completed/30 shadow-status-completed/10',
  alert: 'bg-gradient-to-br from-status-alert-bg to-status-alert-bg/50 text-status-alert border-status-alert/30 shadow-status-alert/10',
};

const iconBgStyles = {
  waiting: 'bg-status-waiting/15 shadow-inner',
  progress: 'bg-status-progress/15 shadow-inner',
  inspection: 'bg-status-inspection/15 shadow-inner',
  completed: 'bg-status-completed/15 shadow-inner',
  alert: 'bg-status-alert/15 shadow-inner animate-pulse',
};

export function StatusCard({ title, count, icon: Icon, variant, onClick }: StatusCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all duration-300',
        'hover:scale-[1.03] hover:shadow-xl cursor-pointer w-full text-left',
        'shadow-lg backdrop-blur-sm',
        variantStyles[variant]
      )}
    >
      <div className={cn('p-2.5 sm:p-3 rounded-xl', iconBgStyles[variant])}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl sm:text-3xl font-bold tracking-tight">{count}</p>
        <p className="text-xs sm:text-sm opacity-90 font-medium truncate">{title}</p>
      </div>
    </button>
  );
}
