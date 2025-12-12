import { useState } from 'react';
import { format, isToday, isTomorrow, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export type DateFilter = 'today' | 'tomorrow' | 'custom' | 'all';

interface ScheduleFiltersProps {
  dateFilter: DateFilter;
  customDate: Date | undefined;
  searchQuery: string;
  onDateFilterChange: (filter: DateFilter) => void;
  onCustomDateChange: (date: Date | undefined) => void;
  onSearchChange: (query: string) => void;
}

export function ScheduleFilters({
  dateFilter,
  customDate,
  searchQuery,
  onDateFilterChange,
  onCustomDateChange,
  onSearchChange,
}: ScheduleFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    onCustomDateChange(date);
    if (date) {
      onDateFilterChange('custom');
    }
    setCalendarOpen(false);
  };

  const clearSearch = () => {
    onSearchChange('');
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl border-2 border-border/50 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground mr-1 sm:mr-2 hidden sm:inline">Data:</span>
          <Button
            variant={dateFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDateFilterChange('all')}
            className={cn(
              "text-xs sm:text-sm h-8 px-2.5 sm:px-3",
              dateFilter === 'all' && "bg-primary shadow-md shadow-primary/25"
            )}
          >
            Todos
          </Button>
          <Button
            variant={dateFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDateFilterChange('today')}
            className={cn(
              "text-xs sm:text-sm h-8 px-2.5 sm:px-3",
              dateFilter === 'today' && "bg-primary shadow-md shadow-primary/25"
            )}
          >
            Hoje
          </Button>
          <Button
            variant={dateFilter === 'tomorrow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDateFilterChange('tomorrow')}
            className={cn(
              "text-xs sm:text-sm h-8 px-2.5 sm:px-3",
              dateFilter === 'tomorrow' && "bg-primary shadow-md shadow-primary/25"
            )}
          >
            Amanhã
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "gap-1.5 text-xs sm:text-sm h-8 px-2.5 sm:px-3",
                  dateFilter === 'custom' && "bg-primary shadow-md shadow-primary/25"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                {dateFilter === 'custom' && customDate
                  ? format(customDate, "dd/MM", { locale: ptBR })
                  : 'Data'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-2 shadow-xl z-50" align="start">
              <Calendar
                mode="single"
                selected={customDate}
                onSelect={handleDateSelect}
                locale={ptBR}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Property Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar propriedade..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 h-9 text-sm bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function filterByDate(checkIn: Date, dateFilter: DateFilter, customDate: Date | undefined): boolean {
  if (dateFilter === 'all') return true;
  if (dateFilter === 'today') return isToday(checkIn);
  if (dateFilter === 'tomorrow') return isTomorrow(checkIn);
  if (dateFilter === 'custom' && customDate) return isSameDay(checkIn, customDate);
  return true;
}
