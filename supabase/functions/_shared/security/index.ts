/**
 * Security Module - Central Export
 * 
 * Import all security utilities from here:
 * 
 * import { 
 *   createSecureHandler,
 *   validateAuth,
 *   checkResourceAccess,
 *   encrypt,
 *   decrypt
 * } from '../_shared/security/index.ts';
 */

// Middleware and core security
export {
  createSecureHandler,
  generateRequestId,
  sanitizeInput,
  hasNoSqlInjection,
  hasSqlInjection,
  validateRequestBody,
  checkRateLimit,
  validateAuth,
  verifyWebhookSignature,
  verifyWebhookSignatureAsync,
  isWebhookTimestampValid,
  secureLog,
  errorResponse,
  successResponse,
  type SecurityContext,
  type SecureHandler,
  type RateLimitConfig,
} from './middleware.ts';

// Encryption utilities
export {
  encrypt,
  decrypt,
  hashData,
  generateSecureToken,
  generateEncryptionKey,
  maskSensitive,
  maskEmail,
  maskCPF,
  maskPhone,
} from './encryption.ts';

// Authorization
export {
  checkResourceAccess,
  validateStateTransition,
  filterSensitiveData,
  hasPermission,
  logAuthorizationAttempt,
  type ResourceType,
  type ActionType,
  type AppRole,
} from './authorization.ts';
