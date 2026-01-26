import { memo, useState } from 'react';
import { format, startOfDay, addDays, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DateRange } from 'react-day-picker';

export type AdminAgendaViewMode = 'hoje' | 'amanha' | 'mes' | 'range' | 'dia';

interface DayIndicators {
  pending: number;
  completed: number;
  gold: number;
  inspections: number;
}

interface FilterCount {
  total: number;
  schedules: number;
  inspections: number;
}

interface MobileAdminFilterTabsProps {
  viewMode: AdminAgendaViewMode;
  selectedDate: Date;
  dateRange?: { from: Date; to: Date } | null;
  onViewModeChange: (mode: AdminAgendaViewMode) => void;
  onDateSelect: (date: Date) => void;
  onDateRangeSelect: (range: { from: Date; to: Date } | null) => void;
  onMonthChange: (month: Date) => void;
  todayCount: FilterCount;
  tomorrowCount: FilterCount;
  dayCount?: FilterCount;
  monthCount: FilterCount;
  rangeCount: FilterCount;
  dayIndicators?: Record<string, DayIndicators>;
}

// Badge component with tooltip showing breakdown
const CountBadge = memo(function CountBadge({ 
  count, 
  isActive,
  className 
}: { 
  count: FilterCount; 
  isActive: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (count.total === 0) return null;

  const hasBreakdown = count.schedules > 0 && count.inspections > 0;
  const tooltipContent = hasBreakdown
    ? `${count.schedules} limpeza${count.schedules !== 1 ? 's' : ''} + ${count.inspections} inspeç${count.inspections !== 1 ? 'ões' : 'ão'}`
    : count.schedules > 0
      ? `${count.schedules} limpeza${count.schedules !== 1 ? 's' : ''}`
      : `${count.inspections} inspeç${count.inspections !== 1 ? 'ões' : 'ão'}`;

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
              "absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-colors",
              isActive
                ? "bg-white text-primary"
                : "bg-red-500 text-white",
              className
            )}
          >
            {count.total}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg z-[200]"
        >
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export const MobileAdminFilterTabs = memo(function MobileAdminFilterTabs({
  viewMode,
  selectedDate,
  dateRange,
  onViewModeChange,
  onDateSelect,
  onDateRangeSelect,
  onMonthChange,
  todayCount,
  tomorrowCount,
  dayCount,
  monthCount,
  rangeCount,
  dayIndicators = {}
}: MobileAdminFilterTabsProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    dateRange ? { from: dateRange.from, to: dateRange.to } : undefined
  );

  const handleTodayClick = () => {
    onViewModeChange('hoje');
    onDateSelect(startOfDay(new Date()));
  };

  const handleTomorrowClick = () => {
    onViewModeChange('amanha');
    onDateSelect(startOfDay(addDays(new Date(), 1)));
  };

  const handleMonthClick = () => {
    onViewModeChange('mes');
    onMonthChange(startOfMonth(new Date()));
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setTempRange(range);
    
    // Only close and apply when both dates are selected
    if (range?.from && range?.to) {
      onViewModeChange('range');
      onDateRangeSelect({ from: range.from, to: range.to });
      setIsDatePickerOpen(false);
    }
  };

  const isRangeMode = viewMode === 'range';

  // Get range label
  const getRangeLabel = () => {
    if (!dateRange?.from || !dateRange?.to) return 'Período';
    
    const fromStr = format(dateRange.from, 'dd/MM', { locale: ptBR });
    const toStr = format(dateRange.to, 'dd/MM', { locale: ptBR });
    
    return `${fromStr} - ${toStr}`;
  };


  return (
    <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible hide-scrollbar pb-1 pt-2">
      {/* Hoje Button */}
      <button
        onClick={handleTodayClick}
        className={cn(
          "relative px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          viewMode === 'hoje'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Hoje
        <CountBadge count={todayCount} isActive={viewMode === 'hoje'} />
      </button>

      {/* Amanhã Button */}
      <button
        onClick={handleTomorrowClick}
        className={cn(
          "relative px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          viewMode === 'amanha'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Amanhã
        <CountBadge count={tomorrowCount} isActive={viewMode === 'amanha'} />
      </button>

      {/* Selected Day Button - Only shows when a specific day is selected (not today/tomorrow) */}
      {viewMode === 'dia' && dayCount && (
        <button
          className={cn(
            "relative px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
            "bg-primary text-white shadow-md"
          )}
        >
          {format(selectedDate, 'dd/MM', { locale: ptBR })}
          <CountBadge count={dayCount} isActive={true} />
        </button>
      )}

      {/* Mês Button */}
      <button
        onClick={handleMonthClick}
        className={cn(
          "relative px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          viewMode === 'mes'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Mês
        <CountBadge count={monthCount} isActive={viewMode === 'mes'} />
      </button>

      {/* Date Range Picker Button */}
      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
              isRangeMode
                ? "bg-primary text-white shadow-md"
                : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>{isRangeMode ? getRangeLabel() : 'Período'}</span>
            <CountBadge count={rangeCount} isActive={isRangeMode} />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[calc(100vw-32px)] max-w-[340px] p-0 z-[100] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl" 
          align="end" 
          sideOffset={8}
          side="bottom"
        >
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-muted-foreground">
              Selecione um período (início e fim)
            </p>
          </div>
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={handleRangeSelect}
            numberOfMonths={1}
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
          {tempRange?.from && !tempRange?.to && (
            <div className="px-3 pb-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Agora selecione a data final
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
});
