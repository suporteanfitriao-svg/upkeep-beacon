import { 
  Home, 
  Building2, 
  ClipboardCheck, 
  Users, 
  LogOut,
  UserCog,
  Wrench,
  Crown,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { Skeleton } from '@/components/ui/skeleton';
import logo from '@/assets/logo.png';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  ownerOnly?: boolean; // REGRA: Bloqueado para Anfitrião - apenas Owner/Admin
  superAdminOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
  { title: 'Inicio', url: '/', icon: Home },
  // REGRA: Propriedades e Equipe são bloqueados para Anfitrião
  { title: 'Propriedades', url: '/propriedades', icon: Building2, ownerOnly: true },
  { title: 'Equipe', url: '/equipe', icon: Users, ownerOnly: true },
  // REGRA: Inspeção e Relatórios são permitidos para Anfitrião
  { title: 'Inspeção', url: '/inspecoes', icon: ClipboardCheck, adminOnly: true },
  { title: 'Relatórios', url: '/manutencao', icon: Wrench, adminOnly: true },
  { title: 'Minha Conta', url: '/minha-conta', icon: UserCog },
  { title: 'Super Admin', url: '/super-admin', icon: Crown, superAdminOnly: true },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const { isCleaner, isSuperAdmin, isAdmin, hasManagerAccess, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    // SuperAdmin-only items
    if (item.superAdminOnly && !isSuperAdmin) return false;
    // Owner-only items - REGRA: Bloqueado para Anfitrião (manager), apenas admin/superadmin
    if (item.ownerOnly && !isAdmin && !isSuperAdmin) return false;
    // Admin-only items (allows manager) - hide for cleaners
    if (item.adminOnly && isCleaner) return false;
    if (item.adminOnly && !hasManagerAccess) return false;
    return true;
  });

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
    navigate('/auth');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border shadow-lg bg-card">
      <SidebarHeader className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
            <img src={logo} alt="Super Host Lab" className="w-8 h-8 object-contain" />
          </div>
          {!collapsed && (
            <h1 className="font-bold text-lg tracking-tight text-foreground">Minhas Propriedades</h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        {/* View Mode Switcher for SuperAdmin */}
        {isSuperAdmin && (
          <div className="mb-4">
            <ViewModeSwitcher collapsed={collapsed} />
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {roleLoading ? (
                // Show skeleton while loading roles
                <>
                  {[1, 2, 3].map((i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex items-center gap-4 px-4 py-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        {!collapsed && <Skeleton className="h-4 w-24" />}
                      </div>
                    </SidebarMenuItem>
                  ))}
                </>
              ) : (
                menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        end={item.url === '/'} 
                        className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-muted-foreground hover:bg-muted hover:text-primary"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut}
              tooltip="Sair"
              className="flex items-center gap-4 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}