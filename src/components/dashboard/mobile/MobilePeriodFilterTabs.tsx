import { memo } from 'react';
import { cn } from '@/lib/utils';
import { PaymentPeriod } from '@/hooks/useCleanerPayments';

interface MobilePeriodFilterTabsProps {
  paymentPeriod: PaymentPeriod;
  onPeriodChange: (period: PaymentPeriod) => void;
  todayTasksCount: number;
  tomorrowTasksCount: number;
}

export const MobilePeriodFilterTabs = memo(function MobilePeriodFilterTabs({
  paymentPeriod,
  onPeriodChange,
  todayTasksCount,
  tomorrowTasksCount
}: MobilePeriodFilterTabsProps) {
  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto hide-scrollbar relative z-30 pointer-events-auto">
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
        {todayTasksCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {todayTasksCount}
          </span>
        )}
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
        {tomorrowTasksCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {tomorrowTasksCount}
          </span>
        )}
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
