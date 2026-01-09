import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

export type DateFilter = 'today' | 'tomorrow' | 'custom' | 'all';

interface Property {
  id: string;
  name: string;
}

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
      <div className="flex justify-end mb-4">
        <div className="inline-flex items-center bg-muted rounded-lg p-1">
          <Button
            variant={dateFilter === 'today' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onDateFilterChange('today')}
            className={dateFilter === 'today' ? 'bg-primary text-primary-foreground' : ''}
          >
            Hoje
          </Button>
          <Button
            variant={dateFilter === 'tomorrow' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onDateFilterChange('tomorrow')}
            className={dateFilter === 'tomorrow' ? 'bg-primary text-primary-foreground' : ''}
          >
            Amanhã
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'ghost'}
                size="sm"
                className="px-2"
              >
                <CalendarIcon className="w-4 h-4" />
              </Button>
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
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-foreground">Todos Imóveis</span>

        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {selectedStatus}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border shadow-lg z-50">
            {statusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onStatusFilterChange(option.value)}
                className={statusFilter === option.value ? 'bg-muted' : ''}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Responsible Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {responsibleFilter === 'all' ? 'Todos Responsáveis' : responsibleFilter}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border shadow-lg z-50">
            <DropdownMenuItem
              onClick={() => onResponsibleFilterChange('all')}
              className={responsibleFilter === 'all' ? 'bg-muted' : ''}
            >
              Todos Responsáveis
            </DropdownMenuItem>
            {responsibles.map((name) => (
              <DropdownMenuItem
                key={name}
                onClick={() => onResponsibleFilterChange(name)}
                className={responsibleFilter === name ? 'bg-muted' : ''}
              >
                {name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Input */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, condomínio..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>
    </div>
  );
}
