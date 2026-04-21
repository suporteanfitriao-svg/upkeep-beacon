import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mustReset, setMustReset] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setMustReset(false);
      return;
    }
    supabase
      .from('profiles')
      .select('must_reset_password')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMustReset(Boolean(data?.must_reset_password));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || (user && mustReset === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // B6: Force password reset on first login if required
  if (mustReset && location.pathname !== '/auth') {
    return <Navigate to="/auth?reset=true" replace />;
  }

  return <>{children}</>;
}
