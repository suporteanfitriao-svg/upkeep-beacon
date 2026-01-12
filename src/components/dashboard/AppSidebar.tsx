import { Home, Users, ClipboardCheck, LogOut, Building2, Wrench } from 'lucide-react';
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
import logo from '@/assets/logo.png';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
  { title: 'Inicio', url: '/', icon: Home },
  { title: 'Propriedades', url: '/propriedades', icon: Building2, adminOnly: true },
  { title: 'Inspeção', url: '/inspecoes', icon: ClipboardCheck, adminOnly: true },
  { title: 'Equipe', url: '/equipe', icon: Users, adminOnly: true },
  { title: 'Manutenção', url: '/manutencao', icon: Wrench, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const { isCleaner } = useUserRole();
  const navigate = useNavigate();

  // Filter menu items based on role
  const menuItems = allMenuItems.filter(item => !item.adminOnly || !isCleaner);

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
            <h1 className="font-bold text-lg tracking-tight text-foreground">AdminPanel</h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
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
              ))}
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
