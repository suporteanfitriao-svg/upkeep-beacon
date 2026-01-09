import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export type DateFilter = 'today' | 'tomorrow' | 'custom' | 'all';

interface AdminFiltersProps {
  dateFilter: DateFilter;
  customDate: Date | undefined;
  searchQuery: string;
  statusFilter: string;
  responsibleFilter: string;
  onDateFilterChange: (filter: DateFilter) => void;
  onCustomDateChange: (date: Date | undefined) => void;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
  onResponsibleFilterChange: (responsible: string) => void;
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
  searchQuery,
  statusFilter,
  responsibleFilter,
  onDateFilterChange,
  onCustomDateChange,
  onSearchChange,
  onStatusFilterChange,
  onResponsibleFilterChange,
}: AdminFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const [responsibles, setResponsibles] = useState<string[]>([]);

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

  const handleDateSelect = (date: Date | undefined) => {
    onCustomDateChange(date);
    if (date) {
      onDateFilterChange('custom');
    }
    setCalendarOpen(false);
  };

  const selectedStatus = statusOptions.find(s => s.value === statusFilter)?.label || 'Todos Status';

  return (
    <div className="mb-6">
      {/* Date Toggle Buttons - Right Aligned */}
      <div className="flex justify-end mb-6">
        <div className="bg-card p-1 rounded-xl shadow-sm flex items-center">
          <button
            onClick={() => onDateFilterChange('today')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
              dateFilter === 'today' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            Hoje
          </button>
          <button
            onClick={() => onDateFilterChange('tomorrow')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium transition-colors',
              dateFilter === 'tomorrow' 
                ? 'bg-primary text-primary-foreground shadow-sm rounded-lg' 
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            Amanhã
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  dateFilter === 'custom' 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-primary'
                )}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border shadow-lg z-50" align="end">
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
      </div>

      {/* Filters Row */}
      <section className="flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <h3 className="text-xl font-bold text-foreground mr-2 whitespace-nowrap">Todos Imóveis</h3>
          
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