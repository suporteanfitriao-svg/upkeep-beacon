import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, RefreshCw, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import logo from '@/assets/logo.png';

interface DashboardHeaderProps {
  onRefresh: () => void;
}

export function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
  const today = new Date();

  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2">
          <Menu className="w-5 h-5" />
        </SidebarTrigger>
        
        <div className="flex items-center gap-3">
          <img src={logo} alt="Super Host Lab" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Dashboard Operacional
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span className="text-xs">
                {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        <span className="hidden sm:inline">Atualizar</span>
      </Button>
    </header>
  );
}
