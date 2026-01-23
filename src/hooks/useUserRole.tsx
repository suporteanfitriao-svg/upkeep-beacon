import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'superadmin' | 'admin' | 'manager' | 'cleaner';

interface UserRoleState {
  role: AppRole | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isCleaner: boolean;
  /** Returns true if user is superadmin or admin */
  hasAdminAccess: boolean;
  /** Returns true if user is superadmin, admin or manager */
  hasManagerAccess: boolean;
}

export function useUserRole(): UserRoleState {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching role:', error);
          setRole(null);
        } else {
          setRole(data?.role as AppRole || null);
        }
      } catch (err) {
        console.error('Error:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isCleaner = role === 'cleaner';

  return {
    role,
    loading,
    isSuperAdmin,
    isAdmin,
    isManager,
    isCleaner,
    hasAdminAccess: isSuperAdmin || isAdmin,
    hasManagerAccess: isSuperAdmin || isAdmin || isManager,
  };
}
