import { cn } from '@/lib/utils';
import { Clock, Unlock, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';

interface AdminStatusCardsProps {
  stats: {
    waiting: number;
    released: number;
    cleaning: number;
    completed: number;
    maintenanceAlerts: number;
  };
  onFilterByStatus: (status: string) => void;
  activeFilter: string;
}

const statusCards = [
  {
    key: 'waiting',
    label: 'AGUARDANDO LIBERAÇÃO',
    icon: Clock,
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    iconBg: 'bg-emerald-200/60',
  },
  {
    key: 'released',
    label: 'LIBERADO',
    icon: Unlock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    iconBg: 'bg-amber-100/60',
  },
  {
    key: 'cleaning',
    label: 'EM LIMPEZA',
    icon: Sparkles,
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    iconBg: 'bg-cyan-200/60',
  },
  {
    key: 'completed',
    label: 'FINALIZADO',
    icon: CheckCircle,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    iconBg: 'bg-orange-200/60',
  },
  {
    key: 'maintenanceAlerts',
    label: 'DANOS / AVARIAS',
    icon: AlertTriangle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    iconBg: 'bg-red-200/60',
  },
];

export function AdminStatusCards({ stats, onFilterByStatus, activeFilter }: AdminStatusCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {statusCards.map((card) => {
        const count = stats[card.key as keyof typeof stats];
        const isActive = activeFilter === card.key;
        const Icon = card.icon;

        return (
          <button
            key={card.key}
            onClick={() => onFilterByStatus(isActive ? 'all' : card.key)}
            className={cn(
              'flex items-center gap-3 p-4 rounded-2xl transition-all duration-200',
              'hover:scale-[1.02] hover:shadow-lg cursor-pointer',
              card.bgColor,
              isActive && 'ring-2 ring-offset-2 ring-primary'
            )}
          >
            <div className={cn('p-2 rounded-xl', card.iconBg)}>
              <Icon className={cn('w-5 h-5', card.textColor)} />
            </div>
            <div className="text-left">
              <p className={cn('text-2xl font-bold', card.textColor)}>{count}</p>
              <p className={cn('text-[10px] font-semibold uppercase tracking-wide', card.textColor, 'opacity-80')}>
                {card.label}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
