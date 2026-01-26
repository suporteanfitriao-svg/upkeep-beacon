import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface OwnerRouteProps {
  children: ReactNode;
}

/**
 * Route that requires Owner (admin) or SuperAdmin access.
 * Blocks Managers (Anfitrião) and Cleaners from accessing structural configuration routes:
 * - /equipe (Team management)
 * - /propriedades (Property settings)
 * - /configuracoes (Settings)
 * - /onboarding
 * 
 * REGRA: Anfitrião não pode acessar configurações estruturais da propriedade.
 */
export function OwnerRoute({ children }: OwnerRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Only admins and superadmins can access owner routes
  // Managers (Anfitrião) and cleaners are blocked
  if (!isAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
