import { cn } from '@/lib/utils';
import { ScheduleStatus } from '@/types/scheduling';

interface FilterTabsProps {
  activeFilter: ScheduleStatus | 'all';
  onFilterChange: (filter: ScheduleStatus | 'all') => void;
  counts: Record<string, number>;
}

const filters: { value: ScheduleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'waiting', label: 'Aguardando' },
  { value: 'cleaning', label: 'Em Limpeza' },
  { value: 'inspection', label: 'Inspeção' },
  { value: 'completed', label: 'Finalizados' },
];

export function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            activeFilter === filter.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {filter.label}
          <span className={cn(
            'px-1.5 py-0.5 rounded text-xs',
            activeFilter === filter.value
              ? 'bg-primary-foreground/20'
              : 'bg-background'
          )}>
            {filter.value === 'all' 
              ? Object.values(counts).reduce((a, b) => a + b, 0)
              : counts[filter.value] || 0
            }
          </span>
        </button>
      ))}
    </div>
  );
}
