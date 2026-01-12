import { Banknote, Wallet } from 'lucide-react';
import { useCleanerPayments, PaymentPeriod } from '@/hooks/useCleanerPayments';
import { Skeleton } from '@/components/ui/skeleton';

interface CleanerPaymentCardsProps {
  teamMemberId: string | null;
  period: PaymentPeriod;
}

export function CleanerPaymentCards({ teamMemberId, period }: CleanerPaymentCardsProps) {
  const { loading, summary } = useCleanerPayments(teamMemberId, period);

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
      <div className="grid grid-cols-1 gap-3 mb-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
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
  );
}
