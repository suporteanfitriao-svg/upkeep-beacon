/**
 * Security Utilities
 * 
 * Centralized exports for all security-related utilities.
 */

// Input validation and sanitization
export {
  sanitizeHtml,
  escapeHtml,
  sanitizeUrl,
  emailSchema,
  passwordSchema,
  phoneSchema,
  cpfSchema,
  cepSchema,
  sanitizedTextSchema,
  urlSchema,
  uuidSchema,
  validateInput,
  hasSqlInjectionPattern,
  hasXssPattern,
  checkRateLimit,
  teamMemberFormSchema,
  propertyFormSchema,
  maintenanceIssueFormSchema,
  waitlistFormSchema,
} from './inputValidation';

// Access control and permissions
export {
  type AppRole,
  type Permission,
  type RouteAccess,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasRolePriority,
  getHighestRole,
  canAccessRoute,
  canManageResource,
  canDeleteResource,
  canSeeSensitiveField,
  filterSensitiveData,
  ROUTE_ACCESS,
  SENSITIVE_FIELDS,
} from './accessControl';

// Audit logging
export {
  type AuditAction,
  type ResourceType,
  type AuditEventData,
  logSecurityEvent,
  logPasswordAccess,
  logConfigChange,
  logTeamMemberAction,
  trackDataAccess,
} from './auditLog';
