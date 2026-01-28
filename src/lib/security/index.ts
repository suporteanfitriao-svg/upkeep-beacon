/**
 * Security Utilities
 * 
 * Centralized exports for all security-related utilities.
 * 
 * REGRAS DE SEGURANÇA IMPLEMENTADAS:
 * - R-GLOBAL-8: Sanitização de inputs (proteção Prototype Pollution)
 * - R-GLOBAL-9: Proteção NoSQL Injection
 * - R-GLOBAL-10: Detecção SQL Injection
 * - R-GLOBAL-11: Proteção Path Traversal
 * - REGRA 1-15: Autorização, IDOR, Multi-tenant, etc.
 * 
 * REGRA DE OURO: NUNCA confiar em front-end para segurança.
 * Backend (RLS + Edge Functions) é a ÚNICA fonte de verdade.
 */

// Input validation and sanitization
export {
  sanitizeHtml,
  escapeHtml,
  sanitizeUrl,
  sanitizeObject,
  hasNoSqlInjectionPattern,
  hasSqlInjectionPattern,
  hasXssPattern,
  hasPathTraversalPattern,
  validateSecureInput,
  emailSchema,
  passwordSchema,
  phoneSchema,
  cpfSchema,
  cepSchema,
  sanitizedTextSchema,
  urlSchema,
  uuidSchema,
  validateInput,
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
