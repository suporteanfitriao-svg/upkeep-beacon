import { Banknote, Wallet, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCleanerPayments, PaymentPeriod } from '@/hooks/useCleanerPayments';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CleanerPaymentCardsProps {
  teamMemberId: string | null;
  period: PaymentPeriod;
}

export function CleanerPaymentCards({ teamMemberId }: CleanerPaymentCardsProps) {
  const { loading, summary, period, setPeriod, selectedMonth, setSelectedMonth } = useCleanerPayments(teamMemberId);

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

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 mb-6">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Period Filter */}
      <div className="flex items-center gap-2">
        <Button
          variant={period === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('today')}
          className="text-xs"
        >
          Hoje
        </Button>
        <Button
          variant={period === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('week')}
          className="text-xs"
        >
          Semana
        </Button>
        <Button
          variant={period === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod('month')}
          className="text-xs"
        >
          Mês
        </Button>
        
        {period === 'month' && (
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium min-w-[80px] text-center capitalize">
              {format(selectedMonth, 'MMM yyyy', { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextMonth}
              disabled={addMonths(selectedMonth, 1) > new Date()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

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