import { cn } from '@/lib/utils';
import { SuperAdminSection } from '@/pages/SuperAdmin';
import logo from '@/assets/logo.png';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  Shield,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SuperAdminSidebarProps {
  activeSection: SuperAdminSection;
  onSectionChange: (section: SuperAdminSection) => void;
}

const menuItems: { id: SuperAdminSection; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'properties', label: 'Propriedades Globais', icon: Building2 },
  { id: 'users', label: 'Gestão de Usuários', icon: Users },
  { id: 'audit', label: 'Auditoria', icon: FileText },
  { id: 'plans', label: 'Planos & Assinaturas', icon: CreditCard },
  { id: 'security', label: 'Segurança', icon: Shield },
];

export function SuperAdminSidebar({ activeSection, onSectionChange }: SuperAdminSidebarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
    navigate('/auth');
  };

  return (
    <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col shadow-sm">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden">
          <img src={logo} alt="MegaAdmin" className="w-8 h-8 object-contain" />
        </div>
        <h1 className="font-bold text-xl tracking-tight text-foreground">MegaAdmin</h1>
      </div>

      <nav className="mt-4 px-4 flex-1 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                isActive 
                  ? "bg-primary/10 text-primary font-semibold" 
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-border">
        <div className="p-4 bg-muted/50 rounded-2xl mb-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Suporte Enterprise
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Atendimento prioritário disponível 24/7 para sua conta.
          </p>
          <button className="w-full py-2 bg-background border border-border rounded-lg text-xs font-bold shadow-sm hover:bg-muted transition-colors">
            <HelpCircle className="h-3 w-3 inline mr-1" />
            Acessar Ajuda
          </button>
        </div>
        <button 
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sair do Painel</span>
        </button>
      </div>
    </aside>
  );
}
