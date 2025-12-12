import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import logo from '@/assets/logo.png';

interface DashboardHeaderProps {
  onRefresh: () => void;
}

export function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
  const today = new Date();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border/50">
      <div className="flex items-center gap-3 sm:gap-4">
        <SidebarTrigger className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors" />
        
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 p-2 shadow-lg shadow-primary/25">
            <img src={logo} alt="Super Host Lab" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary to-orange-500 bg-clip-text text-transparent">
              Dashboard Operacional
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-sm capitalize">
                {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={onRefresh} 
        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Atualizar</span>
      </Button>
    </header>
  );
}
