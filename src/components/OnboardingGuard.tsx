/**
 * OnboardingGuard - Bloqueia acesso sem onboarding completo
 * REGRA: Sem onboarding → não usa. Nenhum plano pode ser usado sem onboarding completo.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: ReactNode;
}

// Rotas que não precisam de onboarding
const BYPASS_ROUTES = [
  '/auth',
  '/landing',
  '/install',
  '/pricing',
  '/checkout',
  '/onboarding',
];

/**
 * Componente que garante que Proprietários completem o onboarding antes de usar o sistema.
 * 
 * REGRAS:
 * - Cleaners e Managers NÃO precisam de onboarding (são convidados)
 * - SuperAdmins NÃO precisam de onboarding
 * - Apenas Proprietários (Admin) precisam completar o onboarding
 * - Se onboarding não completo → redireciona para /onboarding
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, isCleaner, isManager, loading: roleLoading } = useUserRole();
  const { isCompleted, loading: onboardingLoading } = useOnboardingStatus();

  // Verifica se está em rota que não precisa de guard
  const isBypassRoute = BYPASS_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  if (isBypassRoute) {
    return <>{children}</>;
  }

  // Aguarda carregamento
  if (authLoading || roleLoading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sem usuário → deixa ProtectedRoute cuidar
  if (!user) {
    return <>{children}</>;
  }

  // SuperAdmins, Cleaners e Managers não precisam de onboarding
  if (isSuperAdmin || isCleaner || isManager) {
    return <>{children}</>;
  }

  // Proprietários (Admin) precisam completar onboarding
  if (isAdmin && !isCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
