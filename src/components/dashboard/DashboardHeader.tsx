import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  onRefresh: () => void;
}

export function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
  const today = new Date();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Dashboard Operacional
        </h1>
        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">
            {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>
      <Button variant="outline" onClick={onRefresh} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Atualizar
      </Button>
    </header>
  );
}
