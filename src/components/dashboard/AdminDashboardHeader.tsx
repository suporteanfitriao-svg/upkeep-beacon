import { Bell, Moon, Sun, RefreshCw, Calendar, Eye, Building2, UserCog, Brush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useViewMode, ViewMode } from '@/hooks/useViewMode';
import { cn } from '@/lib/utils';

interface AdminDashboardHeaderProps {
  onRefresh?: () => void;
  lastSyncTime?: Date | null;
  newReservationsCount?: number;
}

const viewModeConfig: Record<ViewMode, { label: string; icon: typeof Building2; description: string }> = {
  owner: { label: 'Proprietário', icon: Building2, description: 'Visão completa de gestão' },
  manager: { label: 'Anfitrião', icon: UserCog, description: 'Visão de operações' },
  cleaner: { label: 'Cleaner', icon: Brush, description: 'Visão mobile de execução' },
};

export function AdminDashboardHeader({ onRefresh, lastSyncTime, newReservationsCount = 0 }: AdminDashboardHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { viewMode, setViewMode, canSwitchView } = useViewMode();
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
    <header className="bg-card border-b border-border">
      {/* View Mode Tabs for SuperAdmin */}
      {canSwitchView && (
        <div className="border-b border-border bg-amber-50/50 dark:bg-amber-900/10">
          <div className="px-8 flex items-center gap-2 h-12">
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mr-4">
              Simulação de Visão:
            </span>
            <div className="flex items-center gap-1">
              {(Object.entries(viewModeConfig) as [ViewMode, typeof viewModeConfig.owner][]).map(([mode, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      viewMode === mode
                        ? "bg-amber-500 text-white shadow-md"
                        : "text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="h-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Painel Admin</h2>
            <p className="text-sm text-muted-foreground">Gestão Operacional de Imóveis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Sync info and refresh button */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
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
            {lastSyncTime && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Última sync: {formatLastSync(lastSyncTime)}</span>
              </div>
            )}
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
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">Gerente</p>
            </div>
            <button 
              onClick={() => navigate('/minha-conta')}
              className="relative cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              title="Minha Conta"
            >
              <Avatar className="h-10 w-10 border-2 border-muted">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-status-completed border-2 border-card rounded-full" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}