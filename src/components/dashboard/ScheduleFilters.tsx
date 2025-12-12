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
    <div className="bg-card rounded-xl border p-4 mb-6 space-y-4">
      {/* Date Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">Filtrar por data:</span>
        <Button
          variant={dateFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateFilterChange('all')}
        >
          Todos
        </Button>
        <Button
          variant={dateFilter === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateFilterChange('today')}
        >
          Hoje
        </Button>
        <Button
          variant={dateFilter === 'tomorrow' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateFilterChange('tomorrow')}
        >
          Amanhã
        </Button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={dateFilter === 'custom' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
            >
              <CalendarIcon className="w-4 h-4" />
              {dateFilter === 'custom' && customDate
                ? format(customDate, "dd/MM", { locale: ptBR })
                : 'Escolher data'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border shadow-lg z-50" align="start">
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome da propriedade..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
