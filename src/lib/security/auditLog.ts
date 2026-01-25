/**
 * Audit Logging Utilities
 * 
 * Client-side helpers for tracking security-relevant events.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================
// AUDIT EVENT TYPES
// ============================================================

export type AuditAction =
  | 'login'
  | 'logout'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_viewed'
  | 'property_password_viewed'
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_deleted'
  | 'schedule_status_changed'
  | 'property_created'
  | 'property_updated'
  | 'property_deleted'
  | 'team_member_created'
  | 'team_member_updated'
  | 'team_member_deactivated'
  | 'team_member_role_changed'
  | 'inspection_started'
  | 'inspection_completed'
  | 'maintenance_reported'
  | 'maintenance_resolved'
  | 'config_changed'
  | 'bulk_data_accessed'
  | 'export_requested'
  | 'unauthorized_access_attempt';

export type ResourceType =
  | 'auth'
  | 'schedule'
  | 'property'
  | 'team_member'
  | 'inspection'
  | 'maintenance'
  | 'config'
  | 'system';

export interface AuditEventData {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, unknown>;
}

// ============================================================
// AUDIT LOGGING FUNCTIONS
// ============================================================

/**
 * Log a security audit event
 * Uses the database function for secure logging
 */
export async function logSecurityEvent(event: AuditEventData): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_security_event', {
      p_action: event.action,
      p_resource_type: event.resourceType,
      p_resource_id: event.resourceId ?? null,
      p_details: JSON.parse(JSON.stringify(event.details ?? {})),
    });

    if (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to log security event:', error);
    }
  } catch (err) {
    console.error('Error logging security event:', err);
  }
}

/**
 * Log password access (uses dedicated audit table)
 */
export async function logPasswordAccess(
  scheduleId: string | null,
  propertyId: string,
  action: 'password_viewed' | 'property_password_viewed'
): Promise<void> {
  try {
    // Get team member ID
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', session.session.user.id)
      .single();

    if (!teamMember) return;

    await supabase.rpc('log_password_action', {
      p_schedule_id: scheduleId,
      p_property_id: propertyId,
      p_team_member_id: teamMember.id,
      p_action: action,
    });
  } catch (err) {
    console.error('Error logging password access:', err);
  }
}

/**
 * Log configuration change
 */
export async function logConfigChange(
  propertyId: string,
  configKey: string,
  previousValue: string | null,
  newValue: string
): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', session.session.user.id)
      .single();

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.session.user.id);

    const role = roles?.[0]?.role ?? 'unknown';

    await supabase.from('property_config_audit_logs').insert({
      property_id: propertyId,
      user_id: session.session.user.id,
      team_member_id: teamMember?.id,
      role,
      config_key: configKey,
      previous_value: previousValue,
      new_value: newValue,
    });
  } catch (err) {
    console.error('Error logging config change:', err);
  }
}

/**
 * Log team member action
 */
export async function logTeamMemberAction(
  teamMemberId: string | null,
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;

    await supabase.from('team_member_audit_logs').insert([{
      team_member_id: teamMemberId,
      user_id: session.session.user.id,
      action,
      details: JSON.parse(JSON.stringify(details)),
    }]);
  } catch (err) {
    console.error('Error logging team member action:', err);
  }
}

// ============================================================
// BULK ACCESS TRACKING
// ============================================================

const bulkAccessThreshold = 50;
const bulkAccessWindow = 60000; // 1 minute
const accessCounts = new Map<string, { count: number; firstAccess: number }>();

/**
 * Track and alert on bulk data access patterns
 */
export function trackDataAccess(resourceType: ResourceType, count: number): void {
  const key = resourceType;
  const now = Date.now();
  const entry = accessCounts.get(key);

  if (!entry || now - entry.firstAccess > bulkAccessWindow) {
    accessCounts.set(key, { count, firstAccess: now });
    return;
  }

  entry.count += count;

  if (entry.count > bulkAccessThreshold) {
    // Log bulk access attempt
    logSecurityEvent({
      action: 'bulk_data_accessed',
      resourceType,
      details: {
        recordCount: entry.count,
        timeWindowMs: now - entry.firstAccess,
      },
    });

    // Reset counter
    accessCounts.delete(key);
  }
}
