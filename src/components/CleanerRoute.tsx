import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface CleanerRouteProps {
  children: ReactNode;
}

/**
 * Route that blocks cleaners from accessing certain pages.
 * Cleaners are redirected to home page.
 */
export function CleanerRoute({ children }: CleanerRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isCleaner, hasManagerAccess, loading: roleLoading } = useUserRole();

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

  // Cleaners cannot access these routes - redirect to home
  if (isCleaner && !hasManagerAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
