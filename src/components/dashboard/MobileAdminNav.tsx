import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  ClipboardCheck, 
  Users, 
  Wrench, 
  Package, 
  UserCog, 
  Crown,
  HelpCircle,
  LogOut,
  Menu,
  X,
  History
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useViewMode } from '@/hooks/useViewMode';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresSuperAdmin?: boolean;
  requiresOwner?: boolean;
  requiresManager?: boolean;
  cleanerVisible?: boolean;
}

const menuItems: MenuItem[] = [
  { title: 'Início', url: '/', icon: Home, cleanerVisible: true },
  { title: 'Propriedades', url: '/propriedades', icon: Building2, requiresOwner: true },
  { title: 'Equipe', url: '/equipe', icon: Users, requiresOwner: true },
  { title: 'Inspeção', url: '/inspecoes', icon: ClipboardCheck, requiresManager: true },
  { title: 'Inventário', url: '/inventario', icon: Package, requiresManager: true },
  { title: 'Relatórios', url: '/manutencao', icon: Wrench, requiresManager: true },
  { title: 'Histórico', url: '/historico-limpezas', icon: History, cleanerVisible: true },
  { title: 'Minha Conta', url: '/minha-conta', icon: UserCog, cleanerVisible: true },
  { title: 'Super Admin', url: '/super-admin', icon: Crown, requiresSuperAdmin: true },
];

export function MobileAdminNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin, isAdmin, hasManagerAccess, isCleaner } = useUserRole();
  const { viewMode, canSwitchView } = useViewMode();

  const handleNavigate = useCallback((url: string) => {
    setOpen(false);
    requestAnimationFrame(() => {
      navigate(url);
    });
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    await signOut();
    toast.success('Logout realizado com sucesso');
    navigate('/auth');
  }, [signOut, navigate]);

  // Determine effective role considering view mode simulation
  const isSimulatingCleaner = canSwitchView && viewMode === 'cleaner';
  const effectiveIsCleaner = (isCleaner && !canSwitchView) || isSimulatingCleaner;

  // Filter menu items based on role (or simulated view mode)
  const visibleItems = menuItems.filter(item => {
    if (effectiveIsCleaner) {
      return item.cleanerVisible === true;
    }
    if (item.requiresSuperAdmin && !isSuperAdmin) return false;
    if (item.requiresOwner && !isAdmin && !isSuperAdmin) return false;
    if (item.requiresManager && !hasManagerAccess) return false;
    return true;
  });

  // Don't show for pure cleaners (no view switching) - they use mobile dashboard bottom nav
  if (isCleaner && !canSwitchView) return null;

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-10 w-10"
          aria-label="Menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
              <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <SheetTitle className="font-bold text-lg tracking-tight text-foreground">
              Minhas Propriedades
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {visibleItems.map((item) => (
            <button
              key={item.url}
              onClick={() => handleNavigate(item.url)}
              className={cn(
                "flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-colors text-left",
                isActive(item.url)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-border p-4 mt-auto">
          <button
            onClick={() => handleNavigate('/ajuda')}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
            <span>Ajuda</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
