import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { cn } from '@/lib/utils';

interface MobileMonthlyHistoryProps {
  schedules: Schedule[];
}

interface MonthData {
  month: Date;
  count: number;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
}

export function MobileMonthlyHistory({ schedules }: MobileMonthlyHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: MonthData[] = [];
    
    // Get last 6 months (excluding current month which is shown separately)
    for (let i = 1; i <= 6; i++) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const count = schedules.filter(s => 
        s.status === 'completed' &&
        isWithinInterval(s.checkOut, { start: monthStart, end: monthEnd })
      ).length;
      
      months.push({
        month: monthDate,
        count,
        trend: 'same',
        trendValue: 0
      });
    }
    
    // Calculate trends (comparing to previous month)
    for (let i = 0; i < months.length - 1; i++) {
      const current = months[i].count;
      const previous = months[i + 1].count;
      
      if (previous === 0) {
        months[i].trend = current > 0 ? 'up' : 'same';
        months[i].trendValue = current > 0 ? 100 : 0;
      } else {
        const diff = ((current - previous) / previous) * 100;
        months[i].trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
        months[i].trendValue = Math.abs(Math.round(diff));
      }
    }
    
    return months;
  }, [schedules]);

  const maxCount = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.count), 1);
  }, [monthlyData]);

  const displayedMonths = isExpanded ? monthlyData : monthlyData.slice(0, 3);

  if (monthlyData.every(m => m.count === 0)) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Histórico de Limpezas
      </h4>
      
      <div className="space-y-3">
        {displayedMonths.map((data, index) => (
          <div 
            key={index} 
            className={cn(
              "flex items-center gap-3 transition-all duration-300",
              !isExpanded && index >= 3 && "opacity-0 h-0 overflow-hidden"
            )}
          >
            {/* Month label */}
            <div className="w-16 shrink-0">
              <p className="text-sm font-medium text-foreground capitalize">
                {format(data.month, 'MMM', { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(data.month, 'yyyy')}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden relative">
              <div 
                className={cn(
                  "h-full rounded-lg transition-all duration-500",
                  data.count > 0 
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600" 
                    : "bg-slate-200 dark:bg-slate-600"
                )}
                style={{ width: `${Math.max((data.count / maxCount) * 100, data.count > 0 ? 10 : 0)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                {data.count}
              </span>
            </div>
            
            {/* Trend indicator */}
            <div className="w-12 shrink-0 flex items-center justify-end gap-1">
              {data.trend === 'up' && (
                <>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {data.trendValue}%
                  </span>
                </>
              )}
              {data.trend === 'down' && (
                <>
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    {data.trendValue}%
                  </span>
                </>
              )}
              {data.trend === 'same' && (
                <Minus className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Expand/Collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <>
            <span>Ver menos</span>
            <ChevronUp className="w-4 h-4" />
          </>
        ) : (
          <>
            <span>Ver 6 meses</span>
            <ChevronDown className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
