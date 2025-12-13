import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  variant: 'waiting' | 'released' | 'progress' | 'completed' | 'alert';
  onClick?: () => void;
}

const variantStyles = {
  waiting: 'bg-status-waiting-bg text-status-waiting border-status-waiting/20',
  released: 'bg-status-released-bg text-status-released border-status-released/20',
  progress: 'bg-status-progress-bg text-status-progress border-status-progress/20',
  completed: 'bg-status-completed-bg text-status-completed border-status-completed/20',
  alert: 'bg-status-alert-bg text-status-alert border-status-alert/20',
};

const iconBgStyles = {
  waiting: 'bg-status-waiting/10',
  released: 'bg-status-released/10',
  progress: 'bg-status-progress/10',
  completed: 'bg-status-completed/10',
  alert: 'bg-status-alert/10',
};

export function StatusCard({ title, count, icon: Icon, variant, onClick }: StatusCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
        'hover:scale-[1.02] hover:shadow-md cursor-pointer w-full text-left',
        variantStyles[variant]
      )}
    >
      <div className={cn('p-3 rounded-lg', iconBgStyles[variant])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-3xl font-bold">{count}</p>
        <p className="text-sm opacity-80 font-medium">{title}</p>
      </div>
    </button>
  );
}
