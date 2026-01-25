/**
 * Access Control Utilities
 * 
 * Client-side access control helpers.
 * Server-side RLS is the authoritative check.
 */

import type { User } from '@supabase/supabase-js';

// ============================================================
// ROLE DEFINITIONS
// ============================================================

export type AppRole = 'superadmin' | 'admin' | 'manager' | 'cleaner';

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  superadmin: 4,
  admin: 3,
  manager: 2,
  cleaner: 1,
};

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Proprietário',
  manager: 'Anfitrião',
  cleaner: 'Limpeza',
};

// ============================================================
// PERMISSION DEFINITIONS
// ============================================================

export type Permission =
  | 'view:dashboard'
  | 'view:properties'
  | 'view:team'
  | 'view:schedules'
  | 'view:inspections'
  | 'view:maintenance'
  | 'view:inventory'
  | 'view:reports'
  | 'view:superadmin'
  | 'manage:properties'
  | 'manage:team'
  | 'manage:schedules'
  | 'manage:inspections'
  | 'manage:maintenance'
  | 'manage:inventory'
  | 'manage:checklists'
  | 'manage:settings'
  | 'delete:properties'
  | 'delete:team'
  | 'delete:schedules';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  superadmin: [
    'view:dashboard',
    'view:properties',
    'view:team',
    'view:schedules',
    'view:inspections',
    'view:maintenance',
    'view:inventory',
    'view:reports',
    'view:superadmin',
    'manage:properties',
    'manage:team',
    'manage:schedules',
    'manage:inspections',
    'manage:maintenance',
    'manage:inventory',
    'manage:checklists',
    'manage:settings',
    'delete:properties',
    'delete:team',
    'delete:schedules',
  ],
  admin: [
    'view:dashboard',
    'view:properties',
    'view:team',
    'view:schedules',
    'view:inspections',
    'view:maintenance',
    'view:inventory',
    'view:reports',
    'manage:properties',
    'manage:team',
    'manage:schedules',
    'manage:inspections',
    'manage:maintenance',
    'manage:inventory',
    'manage:checklists',
    'manage:settings',
    'delete:properties',
    'delete:team',
    'delete:schedules',
  ],
  manager: [
    'view:dashboard',
    'view:properties',
    'view:team',
    'view:schedules',
    'view:inspections',
    'view:maintenance',
    'view:inventory',
    'view:reports',
    'manage:schedules',
    'manage:inspections',
    'manage:maintenance',
    'manage:checklists',
  ],
  cleaner: [
    'view:dashboard',
    'view:schedules',
    'view:inspections',
  ],
};

// ============================================================
// ACCESS CONTROL HELPERS
// ============================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: AppRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(role: AppRole | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: AppRole | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if role1 has higher or equal priority than role2
 */
export function hasRolePriority(role1: AppRole | null, role2: AppRole): boolean {
  if (!role1) return false;
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}

/**
 * Get the highest priority role from a list
 */
export function getHighestRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;
  return roles.sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a])[0];
}

// ============================================================
// ROUTE ACCESS DEFINITIONS
// ============================================================

export type RouteAccess = 'public' | 'authenticated' | 'admin' | 'superadmin';

export const ROUTE_ACCESS: Record<string, RouteAccess> = {
  '/': 'authenticated',
  '/auth': 'public',
  '/landing': 'public',
  '/install': 'public',
  '/propriedades': 'admin',
  '/equipe': 'admin',
  '/inspecoes': 'admin',
  '/inventario': 'admin',
  '/manutencao': 'admin',
  '/minha-conta': 'authenticated',
  '/ajuda': 'authenticated',
  '/historico': 'authenticated',
  '/configuracoes': 'admin',
  '/super-admin': 'superadmin',
  '/onboarding': 'admin',
};

/**
 * Check if user can access a route
 */
export function canAccessRoute(
  user: User | null,
  roles: AppRole[],
  route: string
): boolean {
  const access = ROUTE_ACCESS[route] ?? 'authenticated';
  
  if (access === 'public') return true;
  if (!user) return false;
  if (access === 'authenticated') return true;
  
  const highestRole = getHighestRole(roles);
  
  if (access === 'superadmin') {
    return highestRole === 'superadmin';
  }
  
  if (access === 'admin') {
    return hasRolePriority(highestRole, 'manager');
  }
  
  return false;
}

// ============================================================
// RESOURCE ACCESS HELPERS
// ============================================================

/**
 * Check if user can manage a specific resource
 */
export function canManageResource(
  role: AppRole | null,
  resource: 'property' | 'team' | 'schedule' | 'inspection' | 'maintenance'
): boolean {
  const permissionMap: Record<string, Permission> = {
    property: 'manage:properties',
    team: 'manage:team',
    schedule: 'manage:schedules',
    inspection: 'manage:inspections',
    maintenance: 'manage:maintenance',
  };
  
  return hasPermission(role, permissionMap[resource]);
}

/**
 * Check if user can delete a specific resource
 */
export function canDeleteResource(
  role: AppRole | null,
  resource: 'property' | 'team' | 'schedule'
): boolean {
  const permissionMap: Record<string, Permission> = {
    property: 'delete:properties',
    team: 'delete:team',
    schedule: 'delete:schedules',
  };
  
  return hasPermission(role, permissionMap[resource]);
}

// ============================================================
// SENSITIVE DATA ACCESS
// ============================================================

/**
 * Fields that should be hidden from certain roles
 */
export const SENSITIVE_FIELDS: Record<string, AppRole[]> = {
  'team_members.cpf': ['superadmin', 'admin'],
  'team_members.address_cep': ['superadmin', 'admin'],
  'team_members.address_street': ['superadmin', 'admin'],
  'properties.global_access_password': ['superadmin', 'admin', 'manager'],
  'schedules.access_password': ['superadmin', 'admin', 'manager', 'cleaner'],
  'cleaning_rates.rate_value': ['superadmin', 'admin'],
};

/**
 * Check if user can see a sensitive field
 */
export function canSeeSensitiveField(
  role: AppRole | null,
  fieldPath: string
): boolean {
  if (!role) return false;
  const allowedRoles = SENSITIVE_FIELDS[fieldPath];
  if (!allowedRoles) return true; // Not a sensitive field
  return allowedRoles.includes(role);
}

/**
 * Filter object to remove sensitive fields based on role
 */
export function filterSensitiveData<T extends Record<string, unknown>>(
  data: T,
  role: AppRole | null,
  tableName: string
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const fieldPath = `${tableName}.${key}`;
    if (canSeeSensitiveField(role, fieldPath)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  
  return result;
}
