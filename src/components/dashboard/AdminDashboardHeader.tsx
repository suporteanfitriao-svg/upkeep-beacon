import { Bell, Moon, Sun, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminDashboardHeaderProps {
  onRefresh?: () => void;
  lastSyncTime?: Date | null;
  newReservationsCount?: number;
}

export function AdminDashboardHeader({ onRefresh, lastSyncTime, newReservationsCount = 0 }: AdminDashboardHeaderProps) {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const userName = user?.email?.split('@')[0] || 'Admin User';
  const userInitials = userName.substring(0, 2).toUpperCase();

  const formatLastSync = (date: Date) => {
    return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <header className="h-20 bg-card border-b border-border flex items-center justify-between px-8 mb-6 -mx-6 -mt-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2 md:hidden" />
        
        <div>
          <h2 className="text-2xl font-bold text-foreground">Painel Admin</h2>
          <p className="text-sm text-muted-foreground">Gestão Operacional de Imóveis</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Sync info and refresh button */}
        <div className="flex items-center gap-3">
          {lastSyncTime && (
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Última sync: {formatLastSync(lastSyncTime)}</span>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
            {newReservationsCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs bg-primary">
                +{newReservationsCount}
              </Badge>
            )}
          </Button>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="rounded-full text-muted-foreground hover:text-primary hover:bg-muted"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-full relative text-muted-foreground hover:text-primary">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
        </Button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-foreground">Admin User</p>
            <p className="text-xs text-muted-foreground">Gerente</p>
          </div>
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-muted">
              <AvatarImage src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnwibARpZ3nGPa0lil8MyTuRYfmBm8TiWYhkJivKL95XoNdzgh3JS6Vn6Z-o5w72gEEEuR9WgmXwYZXh1SsHbZXyz6PfdjODOCqDuqQob5wnR3nj_ZnAsTPEz_8vl7NDqCiqr315tnDh_FqUlBcMNj-fqoztJ06ckDNfm2C1-sqn0jJ8Wrqo6-LguiqHsACXN1O2c6eC6Z11TrhdoHs_tMUYAet8m-SEExoEdNYJCFM1RDJwkOwVP3YlVaPae6bGzoF_M-Fa0h-34" />
              <AvatarFallback className="bg-primary/10 text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-status-completed border-2 border-card rounded-full" />
          </div>
        </div>
      </div>
    </header>
  );
}