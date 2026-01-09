import { cn } from '@/lib/utils';
import { Clock, DoorOpen, Sparkles, Flag, AlertTriangle } from 'lucide-react';

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
    bgLight: 'bg-[#FFF8E1]',
    bgDark: 'dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-600/60 dark:text-amber-400/60',
    glowColor: 'bg-amber-500/10',
  },
  {
    key: 'released',
    label: 'LIBERADO',
    icon: DoorOpen,
    bgLight: 'bg-[#E8F5E9]',
    bgDark: 'dark:bg-green-900/20',
    textColor: 'text-green-600 dark:text-green-400',
    iconColor: 'text-green-600/60 dark:text-green-400/60',
    glowColor: 'bg-green-500/10',
  },
  {
    key: 'cleaning',
    label: 'EM LIMPEZA',
    icon: Sparkles,
    bgLight: 'bg-[#E0F2F1]',
    bgDark: 'dark:bg-teal-900/20',
    textColor: 'text-primary',
    iconColor: 'text-primary/60',
    glowColor: 'bg-primary/10',
  },
  {
    key: 'completed',
    label: 'FINALIZADO',
    icon: Flag,
    bgLight: 'bg-indigo-50',
    bgDark: 'dark:bg-indigo-900/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    iconColor: 'text-indigo-600/60 dark:text-indigo-400/60',
    glowColor: 'bg-indigo-500/10',
  },
  {
    key: 'maintenanceAlerts',
    label: 'DANOS / AVARIAS',
    icon: AlertTriangle,
    bgLight: 'bg-[#FFEBEE]',
    bgDark: 'dark:bg-rose-900/20',
    textColor: 'text-rose-500 dark:text-rose-400',
    iconColor: 'text-rose-500/60 dark:text-rose-400/60',
    glowColor: 'bg-rose-500/10',
  },
];

export function AdminStatusCards({ stats, onFilterByStatus, activeFilter }: AdminStatusCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
      {statusCards.map((card) => {
        const count = stats[card.key as keyof typeof stats];
        const isActive = activeFilter === card.key;
        const Icon = card.icon;

        return (
          <button
            key={card.key}
            onClick={() => onFilterByStatus(isActive ? 'all' : card.key)}
            className={cn(
              'rounded-3xl p-6 flex flex-col justify-between h-32 relative overflow-hidden transition-transform hover:-translate-y-1 duration-300 text-left',
              card.bgLight,
              card.bgDark,
              isActive && 'ring-2 ring-offset-2 ring-primary'
            )}
          >
            <div className="flex justify-between items-start z-10">
              <span className={cn('text-4xl font-bold', card.textColor)}>{count}</span>
              <Icon className={cn('text-2xl w-7 h-7', card.iconColor)} />
            </div>
            <span className={cn('font-bold text-sm uppercase tracking-wide z-10', card.textColor)}>
              {card.label}
            </span>
            <div className={cn('absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-xl', card.glowColor)} />
          </button>
        );
      })}
    </section>
  );
}