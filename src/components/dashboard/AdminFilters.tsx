import { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

export type DateFilter = 'today' | 'tomorrow' | 'week' | 'month' | 'custom' | 'range' | 'all';

interface DateFilterCounts {
  today: number;
  tomorrow: number;
  week: number;
  month: number;
}

interface AdminFiltersProps {
  dateFilter: DateFilter;
  customDate: Date | undefined;
  dateRange?: DateRange;
  searchQuery: string;
  statusFilter: string;
  responsibleFilter: string;
  propertyFilter: string;
  filterCounts?: DateFilterCounts;
  onDateFilterChange: (filter: DateFilter) => void;
  onCustomDateChange: (date: Date | undefined) => void;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
  onResponsibleFilterChange: (responsible: string) => void;
  onPropertyFilterChange: (property: string) => void;
}

const statusOptions = [
  { value: 'all', label: 'Todos Status' },
  { value: 'waiting', label: 'Aguardando Liberação' },
  { value: 'released', label: 'Liberado' },
  { value: 'cleaning', label: 'Em Limpeza' },
  { value: 'completed', label: 'Finalizado' },
];

export function AdminFilters({
  dateFilter,
  customDate,
  dateRange,
  searchQuery,
  statusFilter,
  responsibleFilter,
  propertyFilter,
  filterCounts,
  onDateFilterChange,
  onCustomDateChange,
  onDateRangeChange,
  onSearchChange,
  onStatusFilterChange,
  onResponsibleFilterChange,
  onPropertyFilterChange,
}: AdminFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchResponsibles = async () => {
      const { data } = await supabase
        .from('schedules')
        .select('cleaner_name')
        .not('cleaner_name', 'is', null);
      
      if (data) {
        const uniqueNames = [...new Set(data.map(d => d.cleaner_name).filter(Boolean))] as string[];
        setResponsibles(uniqueNames);
      }
    };
    fetchResponsibles();
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setProperties(data);
      }
    };
    fetchProperties();
  }, []);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      // Range selected (multiple days)
      onDateRangeChange?.(range);
      onDateFilterChange('range');
      setCalendarOpen(false);
    } else if (range?.from && !range?.to) {
      // Single day clicked - keep calendar open for second click or use as single day
      onDateRangeChange?.(range);
    }
  };

  const handleSingleDayConfirm = () => {
    if (dateRange?.from && !dateRange?.to) {
      // Use single day as both start and end
      onDateRangeChange?.({ from: dateRange.from, to: dateRange.from });
      onDateFilterChange('range');
      setCalendarOpen(false);
    }
  };

  // Navigate to previous day
  const handlePrevDay = () => {
    if (dateFilter === 'today') {
      const yesterday = subDays(new Date(), 1);
      onCustomDateChange(yesterday);
      onDateFilterChange('custom');
    } else if (dateFilter === 'tomorrow') {
      onDateFilterChange('today');
    } else if (dateFilter === 'custom' && customDate) {
      const prevDay = subDays(customDate, 1);
      onCustomDateChange(prevDay);
    } else if (dateFilter === 'range' && dateRange?.from) {
      // Move entire range back by 1 day
      const newFrom = subDays(dateRange.from, 1);
      const newTo = dateRange.to ? subDays(dateRange.to, 1) : newFrom;
      onDateRangeChange?.({ from: newFrom, to: newTo });
    }
  };

  // Navigate to next day
  const handleNextDay = () => {
    if (dateFilter === 'today') {
      onDateFilterChange('tomorrow');
    } else if (dateFilter === 'tomorrow') {
      const dayAfter = addDays(new Date(), 2);
      onCustomDateChange(dayAfter);
      onDateFilterChange('custom');
    } else if (dateFilter === 'custom' && customDate) {
      const nextDay = addDays(customDate, 1);
      onCustomDateChange(nextDay);
    } else if (dateFilter === 'range' && dateRange?.from) {
      // Move entire range forward by 1 day
      const newFrom = addDays(dateRange.from, 1);
      const newTo = dateRange.to ? addDays(dateRange.to, 1) : newFrom;
      onDateRangeChange?.({ from: newFrom, to: newTo });
    }
  };

  // Get current date label
  const getDateLabel = () => {
    if (dateFilter === 'today') return 'Hoje';
    if (dateFilter === 'tomorrow') return 'Amanhã';
    if (dateFilter === 'week') return 'Próxima Semana';
    if (dateFilter === 'month') return 'Mês';
    if (dateFilter === 'custom' && customDate) {
      return format(customDate, "dd 'de' MMM", { locale: ptBR });
    }
    if (dateFilter === 'range' && dateRange?.from) {
      if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
        return `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`;
      }
      return format(dateRange.from, "dd/MM", { locale: ptBR });
    }
    return 'Data';
  };

  // Handle week filter click
  const handleWeekClick = () => {
    const today = new Date();
    const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    onDateRangeChange?.({ from: nextWeekStart, to: nextWeekEnd });
    onDateFilterChange('week');
  };

  // Handle month filter click
  const handleMonthClick = () => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    onDateRangeChange?.({ from: monthStart, to: monthEnd });
    onDateFilterChange('month');
  };

  const selectedStatus = statusOptions.find(s => s.value === statusFilter)?.label || 'Todos Status';

  return (
    <div className="mb-6">
      {/* Date Navigation with Arrows */}
      <div className="flex justify-end mb-6">
        <div className="bg-card p-1 rounded-xl shadow-sm flex items-center gap-1">
          {/* Previous Day Arrow */}
          <button
            onClick={handlePrevDay}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Dia anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              onDateFilterChange('today');
              onDateRangeChange?.(undefined);
            }}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
              dateFilter === 'today' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            Hoje
            {filterCounts && filterCounts.today > 0 && (
              <span className={cn(
                'min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
                dateFilter === 'today' 
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              )}>
                {filterCounts.today}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onDateFilterChange('tomorrow');
              onDateRangeChange?.(undefined);
            }}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
              dateFilter === 'tomorrow' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            Amanhã
            {filterCounts && filterCounts.tomorrow > 0 && (
              <span className={cn(
                'min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
                dateFilter === 'tomorrow' 
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              )}>
                {filterCounts.tomorrow}
              </span>
            )}
          </button>
          <button
            onClick={handleWeekClick}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5',
              dateFilter === 'week' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            Próxima Semana
            {filterCounts && filterCounts.week > 0 && (
              <span className={cn(
                'min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
                dateFilter === 'week' 
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              )}>
                {filterCounts.week}
              </span>
            )}
          </button>
          <button
            onClick={handleMonthClick}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
              dateFilter === 'month' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            Mês
            {filterCounts && filterCounts.month > 0 && (
              <span className={cn(
                'min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
                dateFilter === 'month' 
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              )}>
                {filterCounts.month}
              </span>
            )}
          </button>
          
          {/* Custom date or range indicator */}
          {dateFilter === 'custom' && customDate && (
            <span className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg">
              {format(customDate, "dd/MM", { locale: ptBR })}
            </span>
          )}
          
          {dateFilter === 'range' && dateRange?.from && (
            <span className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg">
              {dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()
                ? `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`
                : format(dateRange.from, "dd/MM", { locale: ptBR })
              }
            </span>
          )}
          
          <div className="w-px h-4 bg-border mx-1" />
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  (dateFilter === 'custom' || dateFilter === 'range')
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-primary'
                )}
                title="Selecionar período"
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border shadow-lg z-50" align="end">
              <div className="p-3 border-b">
                <p className="text-sm text-muted-foreground">
                  Selecione uma data ou um período
                </p>
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateSelect}
                locale={ptBR}
                initialFocus
                numberOfMonths={1}
                className="pointer-events-auto"
              />
              {dateRange?.from && !dateRange?.to && (
                <div className="p-3 border-t flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      onDateRangeChange?.(undefined);
                    }}
                  >
                    Limpar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSingleDayConfirm}
                  >
                    Usar dia único
                  </Button>
                </div>
              )}
              {dateRange?.from && dateRange?.to && (
                <div className="p-3 border-t flex justify-end">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      onDateRangeChange?.(undefined);
                      onDateFilterChange('today');
                    }}
                  >
                    Limpar filtro
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Next Day Arrow */}
          <button
            onClick={handleNextDay}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Próximo dia"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <section className="flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Property Dropdown */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setPropertyOpen(!propertyOpen)}
              className="w-full appearance-none bg-card border-none rounded-xl px-4 py-2 pr-8 text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary cursor-pointer text-foreground flex items-center justify-between gap-2 min-w-[160px]"
            >
              {propertyFilter === 'all' ? 'Todos Imóveis' : properties.find(p => p.id === propertyFilter)?.name || 'Todos Imóveis'}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {propertyOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-card rounded-xl shadow-lg border z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    onPropertyFilterChange('all');
                    setPropertyOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl',
                    propertyFilter === 'all' && 'bg-muted text-primary font-medium'
                  )}
                >
                  Todos Imóveis
                </button>
                {properties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => {
                      onPropertyFilterChange(property.id);
                      setPropertyOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors last:rounded-b-xl',
                      propertyFilter === property.id && 'bg-muted text-primary font-medium'
                    )}
                  >
                    {property.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Status Dropdown */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setStatusOpen(!statusOpen)}
              className="w-full appearance-none bg-card border-none rounded-xl px-4 py-2 pr-8 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary cursor-pointer text-muted-foreground flex items-center justify-between gap-2 min-w-[160px]"
            >
              {selectedStatus}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-card rounded-xl shadow-lg border z-50">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onStatusFilterChange(option.value);
                      setStatusOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl',
                      statusFilter === option.value && 'bg-muted text-primary font-medium'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Responsible Dropdown */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setResponsibleOpen(!responsibleOpen)}
              className="w-full appearance-none bg-card border-none rounded-xl px-4 py-2 pr-8 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary cursor-pointer text-muted-foreground flex items-center justify-between gap-2 min-w-[180px]"
            >
              {responsibleFilter === 'all' ? 'Todos Responsáveis' : responsibleFilter}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {responsibleOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-card rounded-xl shadow-lg border z-50 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    onResponsibleFilterChange('all');
                    setResponsibleOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-xl',
                    responsibleFilter === 'all' && 'bg-muted text-primary font-medium'
                  )}
                >
                  Todos Responsáveis
                </button>
                {responsibles.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      onResponsibleFilterChange(name);
                      setResponsibleOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors last:rounded-b-xl',
                      responsibleFilter === name && 'bg-muted text-primary font-medium'
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome, condomínio..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-card border-none rounded-xl py-2.5 pl-10 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>
    </div>
  );
}