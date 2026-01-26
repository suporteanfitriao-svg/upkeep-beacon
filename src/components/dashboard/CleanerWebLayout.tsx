import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LogOut, User, Home, History } from 'lucide-react';
import logo from '@/assets/logo.png';

interface CleanerWebLayoutProps {
  children: ReactNode;
}

export function CleanerWebLayout({ children }: CleanerWebLayoutProps) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header for cleaners */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
              <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <h1 className="font-bold text-lg text-foreground">Meus Agendamentos</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Início</span>
            </button>

            <button
              onClick={() => navigate('/historico-limpezas')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </button>

            <button
              onClick={() => navigate('/minha-conta')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
