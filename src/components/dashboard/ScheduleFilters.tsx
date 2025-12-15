import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

export type DateFilter = 'today' | 'tomorrow' | 'custom' | 'all';

interface Property {
  id: string;
  name: string;
}

interface ScheduleFiltersProps {
  dateFilter: DateFilter;
  customDate: Date | undefined;
  searchQuery: string;
  propertyFilter: string;
  onDateFilterChange: (filter: DateFilter) => void;
  onCustomDateChange: (date: Date | undefined) => void;
  onSearchChange: (query: string) => void;
  onPropertyFilterChange: (propertyId: string) => void;
}

export function ScheduleFilters({
  dateFilter,
  customDate,
  searchQuery,
  propertyFilter,
  onDateFilterChange,
  onCustomDateChange,
  onSearchChange,
  onPropertyFilterChange,
}: ScheduleFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');
      setProperties(data || []);
    };
    fetchProperties();
  }, []);

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
        <span className="text-sm font-medium text-muted-foreground mr-2">Data:</span>
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

      {/* Property Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:w-64">
          <Select value={propertyFilter} onValueChange={onPropertyFilterChange}>
            <SelectTrigger>
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todas as propriedades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as propriedades</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
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
    </div>
  );
}

export function filterByDate(checkOut: Date, dateFilter: DateFilter, customDate: Date | undefined): boolean {
  if (dateFilter === 'all') return true;
  if (dateFilter === 'today') return isToday(checkOut);
  if (dateFilter === 'tomorrow') return isTomorrow(checkOut);
  if (dateFilter === 'custom' && customDate) return isSameDay(checkOut, customDate);
  return true;
}
