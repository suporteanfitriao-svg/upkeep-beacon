import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { PaymentPeriod } from '@/hooks/useCleanerPayments';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaskBreakdown {
  schedules: number;
  inspections: number;
  total: number;
}

interface MobilePeriodFilterTabsProps {
  paymentPeriod: PaymentPeriod;
  onPeriodChange: (period: PaymentPeriod) => void;
  todayTasks: TaskBreakdown;
  tomorrowTasks: TaskBreakdown;
}

// Badge component with tooltip showing breakdown
const TaskBadge = memo(function TaskBadge({ 
  tasks, 
  className 
}: { 
  tasks: TaskBreakdown; 
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (tasks.total === 0) return null;

  const hasBreakdown = tasks.schedules > 0 && tasks.inspections > 0;
  const tooltipContent = hasBreakdown
    ? `${tasks.schedules} limpeza${tasks.schedules !== 1 ? 's' : ''} + ${tasks.inspections} inspeç${tasks.inspections !== 1 ? 'ões' : 'ão'}`
    : tasks.schedules > 0
      ? `${tasks.schedules} limpeza${tasks.schedules !== 1 ? 's' : ''}`
      : `${tasks.inspections} inspeç${tasks.inspections !== 1 ? 'ões' : 'ão'}`;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className={cn(
              "absolute -top-2.5 -right-2.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center cursor-pointer z-10",
              className
            )}
          >
            {tasks.total}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg"
        >
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export const MobilePeriodFilterTabs = memo(function MobilePeriodFilterTabs({
  paymentPeriod,
  onPeriodChange,
  todayTasks,
  tomorrowTasks
}: MobilePeriodFilterTabsProps) {
  return (
    <div className="flex items-center gap-2 mb-4 pt-3 overflow-x-auto hide-scrollbar relative z-30 pointer-events-auto overflow-visible">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPeriodChange('today');
        }}
        className={cn(
          "relative px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          paymentPeriod === 'today'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Hoje
        <TaskBadge tasks={todayTasks} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPeriodChange('tomorrow');
        }}
        className={cn(
          "relative px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          paymentPeriod === 'tomorrow'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Amanhã
        <TaskBadge tasks={tomorrowTasks} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPeriodChange('week');
        }}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          paymentPeriod === 'week'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Semana
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPeriodChange('month');
        }}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          paymentPeriod === 'month'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Mês
      </button>
    </div>
  );
});
