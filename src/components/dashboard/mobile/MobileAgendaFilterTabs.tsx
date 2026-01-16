import { memo, useState } from 'react';
import { format, startOfDay, startOfMonth } from 'date-fns';
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

interface MobileAgendaFilterTabsProps {
  viewMode: AgendaViewMode;
  selectedDate: Date;
  onViewModeChange: (mode: AgendaViewMode) => void;
  onDateSelect: (date: Date) => void;
  onMonthChange: (month: Date) => void;
}

export const MobileAgendaFilterTabs = memo(function MobileAgendaFilterTabs({
  viewMode,
  selectedDate,
  onViewModeChange,
  onDateSelect,
  onMonthChange
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
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap touch-manipulation",
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
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="end" sideOffset={8}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDatePickerSelect}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto bg-white dark:bg-slate-800 rounded-lg shadow-xl")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});
