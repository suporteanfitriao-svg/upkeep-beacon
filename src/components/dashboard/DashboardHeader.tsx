import { RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileAdminNav } from './MobileAdminNav';

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  todayCheckoutsCount?: number;
}

export function DashboardHeader({ 
  title = 'Dashboard',
  subtitle,
  onRefresh, 
  todayCheckoutsCount 
}: DashboardHeaderProps) {
  return (
    <header className="h-16 md:h-20 bg-card border-b border-border flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3 md:gap-4">
        <MobileAdminNav />
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h2>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {todayCheckoutsCount !== undefined && todayCheckoutsCount > 0 && (
          <Badge className="bg-primary text-primary-foreground text-xs md:text-sm px-2 py-0.5 hidden sm:flex">
            <LogOut className="w-3 h-3 mr-1" />
            {todayCheckoutsCount} saída{todayCheckoutsCount > 1 ? 's' : ''} hoje
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 h-9 px-3">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        )}
      </div>
    </header>
  );
}
