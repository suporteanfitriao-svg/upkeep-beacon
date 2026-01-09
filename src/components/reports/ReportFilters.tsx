import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, X, Building2, User, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';

interface Property {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
}

export type SortField = 'date' | 'duration' | 'responsible';
export type SortOrder = 'asc' | 'desc';

interface ReportFiltersProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  propertyFilter: string;
  responsibleFilter: string;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onPropertyFilterChange: (propertyId: string) => void;
  onResponsibleFilterChange: (teamMemberId: string) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export function ReportFilters({
  startDate,
  endDate,
  propertyFilter,
  responsibleFilter,
  searchQuery,
  sortField,
  sortOrder,
  onStartDateChange,
  onEndDateChange,
  onPropertyFilterChange,
  onResponsibleFilterChange,
  onSearchChange,
  onSortChange,
}: ReportFiltersProps) {
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [propertiesRes, teamMembersRes] = await Promise.all([
        supabase.from('properties').select('id, name').order('name'),
        supabase.from('team_members').select('id, name').eq('is_active', true).order('name'),
      ]);
      setProperties(propertiesRes.data || []);
      setTeamMembers(teamMembersRes.data || []);
    };
    fetchData();
  }, []);

  const handleStartDateSelect = (date: Date | undefined) => {
    onStartDateChange(date);
    setStartCalendarOpen(false);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    onEndDateChange(date);
    setEndCalendarOpen(false);
  };

  const clearSearch = () => {
    onSearchChange('');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'desc');
    }
  };

  const sortLabels: Record<SortField, string> = {
    date: 'Data',
    duration: 'Tempo',
    responsible: 'Responsável',
  };

  return (
    <div className="bg-card rounded-xl border p-4 mb-6 space-y-4">
      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">Período:</span>
        <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 min-w-[120px]">
              <CalendarIcon className="w-4 h-4" />
              {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : 'Data inicial'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border shadow-lg z-50" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateSelect}
              locale={ptBR}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <span className="text-sm text-muted-foreground">até</span>
        <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 min-w-[120px]">
              <CalendarIcon className="w-4 h-4" />
              {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : 'Data final'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border shadow-lg z-50" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndDateSelect}
              locale={ptBR}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onStartDateChange(undefined);
              onEndDateChange(undefined);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Property, Responsible and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:w-56">
          <Select value={propertyFilter} onValueChange={onPropertyFilterChange}>
            <SelectTrigger>
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todas propriedades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas propriedades</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:w-56">
          <Select value={responsibleFilter} onValueChange={onResponsibleFilterChange}>
            <SelectTrigger>
              <User className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todos responsáveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
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

      {/* Sort Options */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <span className="text-sm font-medium text-muted-foreground mr-2">Ordenar por:</span>
        {(['date', 'duration', 'responsible'] as SortField[]).map((field) => (
          <Button
            key={field}
            variant={sortField === field ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort(field)}
            className="gap-1.5"
          >
            {sortLabels[field]}
            {sortField === field && (
              <ArrowUpDown className={`w-3 h-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
