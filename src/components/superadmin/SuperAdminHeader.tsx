import { SuperAdminSection } from '@/pages/SuperAdmin';
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface SuperAdminHeaderProps {
  activeSection: SuperAdminSection;
  viewMode: 'global' | 'regional';
  onViewModeChange: (mode: 'global' | 'regional') => void;
}

const sectionTitles: Record<SuperAdminSection, string> = {
  overview: 'Visão Geral Global',
  properties: 'Propriedades Globais',
  users: 'Gestão de Usuários',
  audit: 'Auditoria',
  plans: 'Planos & Assinaturas',
  security: 'Segurança',
};

export function SuperAdminHeader({ activeSection, viewMode, onViewModeChange }: SuperAdminHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-20 bg-card border-b border-border flex items-center justify-between px-6 lg:px-8 shrink-0">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-foreground">
          {sectionTitles[activeSection]}
        </h2>
        <nav className="flex text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
          <span>Admin</span>
          <span className="mx-2">/</span>
          <span className="text-primary">Dashboard</span>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {activeSection === 'overview' && (
          <>
            <div className="flex items-center bg-muted p-1 rounded-xl">
              <button 
                onClick={() => onViewModeChange('global')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'global' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                Global
              </button>
              <button 
                onClick={() => onViewModeChange('regional')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'regional' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                Regional
              </button>
            </div>
            <div className="h-8 w-px bg-border mx-2 hidden lg:block" />
          </>
        )}

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        <div className="flex items-center gap-3 pl-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-foreground">
              {user?.email?.split('@')[0] || 'Admin'}
            </p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Super Admin
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center ring-2 ring-primary/20">
            <User className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
