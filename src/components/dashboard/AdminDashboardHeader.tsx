import { Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

interface AdminDashboardHeaderProps {
  onRefresh?: () => void;
}

export function AdminDashboardHeader({ onRefresh }: AdminDashboardHeaderProps) {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const userName = user?.email?.split('@')[0] || 'Admin User';
  const userInitials = userName.substring(0, 2).toUpperCase();

  return (
    <header className="flex items-center justify-between gap-4 mb-6 pb-4 border-b">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Painel Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão Operacional de Imóveis
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="rounded-full"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        
        <div className="flex items-center gap-3 pl-3 border-l">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">Gerente</p>
          </div>
          <Avatar className="h-10 w-10">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
