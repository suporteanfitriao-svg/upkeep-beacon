import { useState } from 'react';
import { Banknote, Wallet, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useCleanerPayments, PaymentPeriod } from '@/hooks/useCleanerPayments';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CleanerPaymentCardsProps {
  teamMemberId: string | null;
  period: PaymentPeriod;
}

export function CleanerPaymentCards({ teamMemberId, period }: CleanerPaymentCardsProps) {
  const { loading, summary } = useCleanerPayments(teamMemberId, period);
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show anything if no required rates exist
  if (!loading && !summary.hasRequiredRates) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="mb-6">
        <Skeleton className="h-14 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Collapsed Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm text-left transition-all hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagamentos</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(summary.received + summary.future)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isExpanded && (
              <span className="text-xs font-medium text-primary flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                Ver
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        isExpanded ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"
      )}>
        <div className="space-y-3">
          {/* Received Payments - Highlighted Card */}
          <div className="rounded-2xl bg-primary p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-1">
                  Pagamentos Recebidos
                </p>
                <p className="text-3xl font-bold">
                  {formatCurrency(summary.received)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Future Payments Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Pagamentos Futuros
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(summary.future)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
