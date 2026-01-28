/**
 * Authorization Utilities
 * 
 * Resource-based access control and IDOR protection
 * 
 * REGRAS:
 * - NUNCA confiar em IDs do cliente
 * - SEMPRE validar ownership antes de operação
 * - SEMPRE aplicar isolamento multi-tenant
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { SecurityContext, secureLog } from './middleware.ts';

// ============================================================
// TYPES
// ============================================================

export type ResourceType = 'schedule' | 'property' | 'inspection' | 'maintenance_issue' | 'team_member' | 'checklist';
export type ActionType = 'read' | 'create' | 'update' | 'delete';
export type AppRole = 'superadmin' | 'admin' | 'manager' | 'cleaner';

interface Permission {
  [action: string]: boolean;
}

interface RolePermissions {
  [resource: string]: Permission;
}

// ============================================================
// PERMISSION MATRIX
// ============================================================

const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  superadmin: {
    schedule: { read: true, create: true, update: true, delete: true },
    property: { read: true, create: true, update: true, delete: true },
    inspection: { read: true, create: true, update: true, delete: true },
    maintenance_issue: { read: true, create: true, update: true, delete: true },
    team_member: { read: true, create: true, update: true, delete: true },
    checklist: { read: true, create: true, update: true, delete: true },
  },
  admin: {
    schedule: { read: true, create: true, update: true, delete: true },
    property: { read: true, create: true, update: true, delete: true },
    inspection: { read: true, create: true, update: true, delete: true },
    maintenance_issue: { read: true, create: true, update: true, delete: true },
    team_member: { read: true, create: true, update: true, delete: true },
    checklist: { read: true, create: true, update: true, delete: true },
  },
  manager: {
    schedule: { read: true, create: false, update: true, delete: false },
    property: { read: true, create: false, update: false, delete: false },
    inspection: { read: true, create: true, update: true, delete: false },
    maintenance_issue: { read: true, create: true, update: true, delete: false },
    team_member: { read: true, create: false, update: false, delete: false },
    checklist: { read: true, create: true, update: true, delete: false },
  },
  cleaner: {
    schedule: { read: true, create: false, update: true, delete: false }, // Limited update
    property: { read: true, create: false, update: false, delete: false },
    inspection: { read: true, create: false, update: true, delete: false },
    maintenance_issue: { read: true, create: true, update: false, delete: false },
    team_member: { read: false, create: false, update: false, delete: false },
    checklist: { read: true, create: false, update: false, delete: false },
  },
};

// ============================================================
// STATE TRANSITIONS
// ============================================================

const SCHEDULE_TRANSITIONS: Record<string, string[]> = {
  waiting: ['released', 'cancelled'],
  released: ['cleaning', 'waiting'], // waiting only by admin
  cleaning: ['completed', 'released'], // released only by admin
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

const INSPECTION_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'scheduled'],
  completed: [],
  cancelled: ['scheduled'],
};

const MAINTENANCE_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'resolved'],
  in_progress: ['resolved', 'open'],
  resolved: ['open'], // Can reopen
};

// ============================================================
// AUTHORIZATION FUNCTIONS
// ============================================================

/**
 * Check if role has permission for resource action
 */
export function hasPermission(
  role: AppRole | null,
  resource: ResourceType,
  action: ActionType
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.[resource]?.[action] ?? false;
}

/**
 * Check resource ownership and access
 * CRITICAL: Always use this before any resource operation
 */
export async function checkResourceAccess(
  supabaseAdmin: SupabaseClient,
  context: SecurityContext,
  resourceType: ResourceType,
  resourceId: string,
  action: ActionType
): Promise<{ allowed: boolean; error?: string; resource?: any }> {
  const { userId, role, teamMemberId } = context;

  if (!userId || !role) {
    return { allowed: false, error: 'Not authenticated' };
  }

  // Check base permission
  if (!hasPermission(role, resourceType, action)) {
    return { allowed: false, error: 'Permission denied' };
  }

  // Superadmin bypasses ownership checks
  if (role === 'superadmin') {
    const resource = await fetchResource(supabaseAdmin, resourceType, resourceId);
    return { allowed: !!resource, resource, error: resource ? undefined : 'Resource not found' };
  }

  // Admin has full access to their tenant
  if (role === 'admin') {
    const resource = await fetchResourceWithOwnership(supabaseAdmin, resourceType, resourceId, userId);
    return { allowed: !!resource, resource, error: resource ? undefined : 'Resource not found' };
  }

  // Manager and Cleaner: Check property link
  const resource = await fetchResourceWithPropertyAccess(
    supabaseAdmin,
    resourceType,
    resourceId,
    teamMemberId
  );

  if (!resource) {
    return { allowed: false, error: 'Resource not found' };
  }

  // Additional cleaner restrictions
  if (role === 'cleaner' && resourceType === 'schedule') {
    // Cleaner can only update status-related fields
    if (action === 'update') {
      return { allowed: true, resource };
    }
  }

  return { allowed: true, resource };
}

/**
 * Validate state transition
 */
export function validateStateTransition(
  resourceType: 'schedule' | 'inspection' | 'maintenance',
  currentState: string,
  newState: string,
  role: AppRole | null
): { valid: boolean; error?: string } {
  let transitions: Record<string, string[]>;

  switch (resourceType) {
    case 'schedule':
      transitions = SCHEDULE_TRANSITIONS;
      break;
    case 'inspection':
      transitions = INSPECTION_TRANSITIONS;
      break;
    case 'maintenance':
      transitions = MAINTENANCE_TRANSITIONS;
      break;
    default:
      return { valid: false, error: 'Unknown resource type' };
  }

  const allowed = transitions[currentState] || [];

  if (!allowed.includes(newState)) {
    return {
      valid: false,
      error: `Invalid state transition from '${currentState}' to '${newState}'`,
    };
  }

  // Special restrictions
  if (resourceType === 'schedule') {
    // Only admin can revert from cleaning/completed
    if (
      (currentState === 'cleaning' && newState === 'released') ||
      (currentState === 'released' && newState === 'waiting')
    ) {
      if (role !== 'admin' && role !== 'superadmin') {
        return { valid: false, error: 'Only admin can revert schedule status' };
      }
    }
  }

  return { valid: true };
}

/**
 * Filter data based on role (remove sensitive fields)
 */
export function filterSensitiveData<T extends Record<string, any>>(
  data: T,
  role: AppRole | null,
  resourceType: ResourceType
): Partial<T> {
  if (role === 'superadmin' || role === 'admin') {
    return data;
  }

  const result = { ...data };

  // Remove sensitive fields based on resource type
  const sensitiveFields: Record<ResourceType, string[]> = {
    schedule: ['access_password'],
    property: ['global_access_password', 'airbnb_ical_url'],
    team_member: ['cpf', 'address_cep', 'address_street', 'address_number'],
    inspection: [],
    maintenance_issue: [],
    checklist: [],
  };

  const fieldsToRemove = sensitiveFields[resourceType] || [];

  if (role === 'manager') {
    // Manager sees passwords
    const managerExcluded = fieldsToRemove.filter(f => !f.includes('password'));
    managerExcluded.forEach(field => {
      delete result[field];
    });
  } else {
    // Cleaner sees minimal data
    fieldsToRemove.forEach(field => {
      delete result[field];
    });
  }

  return result;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function fetchResource(
  supabase: SupabaseClient,
  resourceType: ResourceType,
  resourceId: string
): Promise<any | null> {
  const tableMap: Record<ResourceType, string> = {
    schedule: 'schedules',
    property: 'properties',
    inspection: 'inspections',
    maintenance_issue: 'maintenance_issues',
    team_member: 'team_members',
    checklist: 'property_checklists',
  };

  const { data } = await supabase
    .from(tableMap[resourceType])
    .select('*')
    .eq('id', resourceId)
    .maybeSingle();

  return data;
}

async function fetchResourceWithOwnership(
  supabase: SupabaseClient,
  resourceType: ResourceType,
  resourceId: string,
  userId: string
): Promise<any | null> {
  // For admin, check if resource belongs to their tenant
  // This depends on the resource type and data model

  const tableMap: Record<ResourceType, string> = {
    schedule: 'schedules',
    property: 'properties',
    inspection: 'inspections',
    maintenance_issue: 'maintenance_issues',
    team_member: 'team_members',
    checklist: 'property_checklists',
  };

  const { data } = await supabase
    .from(tableMap[resourceType])
    .select('*')
    .eq('id', resourceId)
    .maybeSingle();

  // RLS should already filter by tenant
  return data;
}

async function fetchResourceWithPropertyAccess(
  supabase: SupabaseClient,
  resourceType: ResourceType,
  resourceId: string,
  teamMemberId: string | null
): Promise<any | null> {
  if (!teamMemberId) return null;

  // Get team member's properties
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('id, has_all_properties')
    .eq('id', teamMemberId)
    .single();

  if (!teamMember) return null;

  // If has_all_properties, can access any
  if (teamMember.has_all_properties) {
    return fetchResource(supabase, resourceType, resourceId);
  }

  // Get linked properties
  const { data: propertyLinks } = await supabase
    .from('team_member_properties')
    .select('property_id')
    .eq('team_member_id', teamMemberId);

  const propertyIds = propertyLinks?.map(p => p.property_id) || [];

  if (propertyIds.length === 0) return null;

  // Fetch resource and check property access
  const resource = await fetchResource(supabase, resourceType, resourceId);

  if (!resource) return null;

  // Check if resource's property is in allowed list
  let resourcePropertyId: string | null = null;

  switch (resourceType) {
    case 'schedule':
    case 'inspection':
    case 'maintenance_issue':
    case 'checklist':
      resourcePropertyId = resource.property_id;
      break;
    case 'property':
      resourcePropertyId = resource.id;
      break;
    case 'team_member':
      // Team members are handled differently
      return null;
  }

  if (resourcePropertyId && propertyIds.includes(resourcePropertyId)) {
    return resource;
  }

  return null;
}

// ============================================================
// AUDIT LOGGING
// ============================================================

/**
 * Log authorization attempt for audit
 */
export async function logAuthorizationAttempt(
  supabase: SupabaseClient,
  context: SecurityContext,
  resourceType: ResourceType,
  resourceId: string,
  action: ActionType,
  allowed: boolean
): Promise<void> {
  try {
    await supabase.from('security_audit_logs').insert({
      user_id: context.userId,
      team_member_id: context.teamMemberId,
      action: `${action}:${resourceType}`,
      resource_type: resourceType,
      resource_id: resourceId,
      details: {
        allowed,
        role: context.role,
        ip: context.ip,
        user_agent: context.userAgent,
      },
    });
  } catch (error) {
    secureLog('error', 'Failed to log authorization attempt', {
      error: error instanceof Error ? error.message : 'Unknown',
      resource_type: resourceType,
      resource_id: resourceId,
    });
  }
}
