import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isCleaner, loading: roleLoading } = useUserRole();
  const { isCompleted: onboardingCompleted, loading: onboardingLoading } = useOnboardingStatus();
  const location = useLocation();

  if (authLoading || roleLoading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Cleaners skip onboarding check - they don't need it
  if (isCleaner) {
    return <>{children}</>;
  }

  // If onboarding not completed and not already on onboarding page, redirect
  const isOnboardingPage = location.pathname === '/onboarding';
  if (!onboardingCompleted && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
