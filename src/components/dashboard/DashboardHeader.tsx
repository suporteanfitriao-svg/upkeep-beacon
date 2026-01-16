import { RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <header className="h-20 bg-card border-b border-border flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {todayCheckoutsCount !== undefined && todayCheckoutsCount > 0 && (
          <Badge className="bg-primary text-primary-foreground text-sm px-2.5 py-0.5">
            <LogOut className="w-3 h-3 mr-1" />
            {todayCheckoutsCount} saída{todayCheckoutsCount > 1 ? 's' : ''} hoje
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        )}
      </div>
    </header>
  );
}
