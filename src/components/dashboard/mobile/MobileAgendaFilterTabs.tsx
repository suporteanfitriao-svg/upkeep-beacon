import { memo, useState } from 'react';
import { format, startOfDay, startOfMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type AgendaViewMode = 'hoje' | 'mes' | 'data';

interface DayIndicators {
  pending: number;
  completed: number;
  gold: number;
  inspections: number;
}

interface MobileAgendaFilterTabsProps {
  viewMode: AgendaViewMode;
  selectedDate: Date;
  onViewModeChange: (mode: AgendaViewMode) => void;
  onDateSelect: (date: Date) => void;
  onMonthChange: (month: Date) => void;
  dayIndicators?: Record<string, DayIndicators>;
}

export const MobileAgendaFilterTabs = memo(function MobileAgendaFilterTabs({
  viewMode,
  selectedDate,
  onViewModeChange,
  onDateSelect,
  onMonthChange,
  dayIndicators = {}
}: MobileAgendaFilterTabsProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleTodayClick = () => {
    onViewModeChange('hoje');
    onDateSelect(startOfDay(new Date()));
  };

  const handleMonthClick = () => {
    onViewModeChange('mes');
    onMonthChange(startOfMonth(new Date()));
  };

  const handleDatePickerSelect = (date: Date | undefined) => {
    if (date) {
      onViewModeChange('data');
      onDateSelect(startOfDay(date));
      setIsDatePickerOpen(false);
    }
  };

  const isCustomDate = viewMode === 'data';

  // Get task count for selected date when in custom date mode
  const getTaskCount = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const indicators = dayIndicators[dateKey];
    if (!indicators) return 0;
    return indicators.pending + indicators.completed + indicators.gold + indicators.inspections;
  };

  const selectedDateTaskCount = getTaskCount(selectedDate);

  // Custom day render for calendar with task indicators
  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const indicators = dayIndicators[dateKey];
    const totalTasks = indicators 
      ? indicators.pending + indicators.completed + indicators.gold + indicators.inspections 
      : 0;
    const isSelected = isSameDay(day, selectedDate);
    const isToday = isSameDay(day, new Date());

    return (
      <div className="relative flex flex-col items-center">
        <span>{format(day, 'd')}</span>
        {totalTasks > 0 && (
          <div className="absolute -bottom-1 flex gap-0.5">
            {isSelected ? (
              <div className="h-1 w-1 rounded-full bg-white" />
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
      {/* Hoje Button */}
      <button
        onClick={handleTodayClick}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          viewMode === 'hoje'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Hoje
      </button>

      {/* Mês Button */}
      <button
        onClick={handleMonthClick}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
          viewMode === 'mes'
            ? "bg-primary text-white shadow-md"
            : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
        )}
      >
        Mês
      </button>

      {/* Date Picker Button */}
      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
              isCustomDate
                ? "bg-primary text-white shadow-md"
                : "bg-white dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700"
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            {isCustomDate ? (
              <span>{format(selectedDate, "dd/MM", { locale: ptBR })}</span>
            ) : (
              <span>Data</span>
            )}
            {/* Task count badge for custom date */}
            {isCustomDate && selectedDateTaskCount > 0 && (
              <span className="ml-1 h-5 min-w-[20px] px-1.5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center">
                {selectedDateTaskCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[calc(100vw-32px)] max-w-[320px] p-0 z-[100] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl" 
          align="end" 
          sideOffset={8}
          side="bottom"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDatePickerSelect}
            initialFocus
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
        </PopoverContent>
      </Popover>
    </div>
  );
});
