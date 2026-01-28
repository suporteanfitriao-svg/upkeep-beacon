/**
 * SubscriptionGuard - Bloqueia acesso sem plano ativo
 * REGRA: Sem plano → não entra
 * 
 * NOTA: Esta verificação é mais permissiva durante desenvolvimento.
 * Em produção, todos os Proprietários devem ter um plano ativo.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: ReactNode;
  /** Se true, permite acesso mesmo sem subscription (para desenvolvimento) */
  allowWithoutSubscription?: boolean;
}

// Rotas que não precisam de subscription
const BYPASS_ROUTES = [
  '/auth',
  '/landing',
  '/install',
  '/pricing',
  '/checkout',
  '/onboarding',
];

/**
 * Componente que garante que Proprietários tenham um plano ativo.
 * 
 * REGRAS:
 * - Cleaners e Managers NÃO precisam de plano próprio (são parte do time de um Proprietário)
 * - SuperAdmins NÃO precisam de plano
 * - Apenas Proprietários (Admin) precisam de plano ativo
 */
export function SubscriptionGuard({ 
  children, 
  allowWithoutSubscription = true // TODO: Mudar para false em produção
}: SubscriptionGuardProps) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, isCleaner, isManager, loading: roleLoading } = useUserRole();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscription();

  // Verifica se está em rota que não precisa de guard
  const isBypassRoute = BYPASS_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  if (isBypassRoute) {
    return <>{children}</>;
  }

  // Aguarda carregamento
  if (authLoading || roleLoading || subscriptionLoading) {
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

  // SuperAdmins, Cleaners e Managers não precisam de subscription própria
  if (isSuperAdmin || isCleaner || isManager) {
    return <>{children}</>;
  }

  // Proprietários (Admin) precisam de plano ativo
  // NOTA: allowWithoutSubscription=true durante desenvolvimento
  if (isAdmin && !hasActiveSubscription && !allowWithoutSubscription) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
}
