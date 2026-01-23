import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'superadmin' | 'admin' | 'manager' | 'cleaner';

// Role priority: superadmin > admin > manager > cleaner
const ROLE_PRIORITY: Record<AppRole, number> = {
  superadmin: 4,
  admin: 3,
  manager: 2,
  cleaner: 1,
};

interface UserRoleState {
  role: AppRole | null;
  roles: AppRole[];
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
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoles() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch ALL roles for the user (can have multiple)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching roles:', error);
          setRoles([]);
        } else {
          const userRoles = (data || []).map(r => r.role as AppRole);
          setRoles(userRoles);
        }
      } catch (err) {
        console.error('Error:', err);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRoles();
  }, [user]);

  // Get the highest priority role as the "primary" role
  const role = roles.length > 0
    ? roles.sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a])[0]
    : null;

  // Check if user has any of these roles
  const isSuperAdmin = roles.includes('superadmin');
  const isAdmin = roles.includes('admin');
  const isManager = roles.includes('manager');
  const isCleaner = roles.includes('cleaner');

  return {
    role,
    roles,
    loading,
    isSuperAdmin,
    isAdmin,
    isManager,
    isCleaner,
    hasAdminAccess: isSuperAdmin || isAdmin,
    hasManagerAccess: isSuperAdmin || isAdmin || isManager,
  };
}
