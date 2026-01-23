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

export type AdminAgendaViewMode = 'hoje' | 'amanha' | 'mes' | 'range';

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

  // Custom day render for calendar with task indicators
  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const indicators = dayIndicators[dateKey];
    const totalTasks = indicators 
      ? indicators.pending + indicators.completed + indicators.gold + indicators.inspections 
      : 0;

    return (
      <div className="relative flex flex-col items-center">
        <span>{format(day, 'd')}</span>
        {totalTasks > 0 && (
          <div className="absolute -bottom-1 flex gap-0.5">
            {indicators?.pending && indicators.pending > 0 && (
              <div className="h-1 w-1 rounded-full bg-primary" />
            )}
            {indicators?.gold && indicators.gold > 0 && (
              <div className="h-1 w-1 rounded-full bg-[#E0C051]" />
            )}
            {indicators?.completed && indicators.completed > 0 && (
              <div className="h-1 w-1 rounded-full bg-primary/50" />
            )}
            {indicators?.inspections && indicators.inspections > 0 && (
              <div className="h-1 w-1 rounded-full bg-purple-500" />
            )}
          </div>
        )}
      </div>
    );
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
            className={cn("p-3 pointer-events-auto bg-white dark:bg-slate-800 rounded-lg")}
            classNames={{
              months: "flex flex-col space-y-4",
              month: "space-y-3",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex justify-between",
              head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.75rem] text-center",
              row: "flex w-full mt-1.5 justify-between",
              cell: "flex-1 aspect-square text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: "h-full w-full p-0 font-normal aria-selected:opacity-100 transition-all duration-200 ease-out hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md flex items-center justify-center",
              day_range_start: "bg-primary text-primary-foreground rounded-l-md",
              day_range_end: "bg-primary text-primary-foreground rounded-r-md",
              day_range_middle: "bg-primary/20 text-foreground",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md",
              day_today: "bg-accent text-accent-foreground ring-2 ring-primary/30",
              day_outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              DayContent: ({ date }) => renderDay(date)
            }}
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
