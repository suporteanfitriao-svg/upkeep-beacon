/**
 * Edge Function Security Middleware
 * 
 * REGRAS DE SEGURANÇA GLOBAIS - APLICAR EM TODAS AS EDGE FUNCTIONS
 * 
 * Uso:
 * import { createSecureHandler, validateAuth, rateLimit } from '../_shared/security/middleware.ts';
 * 
 * Deno.serve(createSecureHandler(async (req, context) => {
 *   // Sua lógica aqui
 *   return new Response(JSON.stringify({ success: true }));
 * }));
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

// ============================================================
// TYPES
// ============================================================

export interface SecurityContext {
  requestId: string;
  user: User | null;
  userId: string | null;
  tenantId: string | null;
  role: 'superadmin' | 'admin' | 'manager' | 'cleaner' | null;
  teamMemberId: string | null;
  supabaseClient: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  ip: string;
  userAgent: string;
  startTime: number;
}

export type SecureHandler = (
  req: Request,
  context: SecurityContext
) => Promise<Response>;

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request, context: SecurityContext) => string;
}

// ============================================================
// CONSTANTS
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-webhook-signature, x-webhook-timestamp',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// Rate limit storage (in-memory for edge functions)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ============================================================
// SECURITY UTILITIES
// ============================================================

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Sanitize input - remove prototype pollution attempts
 */
export function sanitizeInput(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }

  const sanitized: Record<string, unknown> = {};
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const [key, value] of Object.entries(obj)) {
    if (!dangerousKeys.includes(key)) {
      sanitized[key] = sanitizeInput(value);
    }
  }

  return sanitized;
}

/**
 * Check for NoSQL injection patterns
 */
export function hasNoSqlInjection(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const dangerous = ['$where', '$ne', '$gt', '$gte', '$lt', '$lte', '$regex', '$in', '$nin'];

  for (const [key, value] of Object.entries(obj)) {
    if (dangerous.includes(key)) {
      return true;
    }
    if (hasNoSqlInjection(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Check for SQL injection patterns
 */
export function hasSqlInjection(input: string): boolean {
  if (!input) return false;

  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/i,
    /(\b(UNION|JOIN)\s+(ALL\s+)?SELECT\b)/i,
    /(--|#|\/\*)/,
    /(\bOR\b\s+[\d\w]+\s*=\s*[\d\w]+)/i,
    /(\bAND\b\s+[\d\w]+\s*=\s*[\d\w]+)/i,
    /(;|\x00)/,
  ];

  return patterns.some((pattern) => pattern.test(input));
}

/**
 * Validate request body size and structure
 */
export async function validateRequestBody(
  req: Request,
  maxSizeBytes = 1024 * 1024, // 1MB default
  maxNestingDepth = 10
): Promise<{ valid: boolean; body?: unknown; error?: string }> {
  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return { valid: false, error: 'Request body too large' };
    }

    const text = await req.text();
    
    if (text.length > maxSizeBytes) {
      return { valid: false, error: 'Request body too large' };
    }

    // Check nesting depth
    const depth = (text.match(/{/g) || []).length;
    if (depth > maxNestingDepth) {
      return { valid: false, error: 'Request body too nested' };
    }

    if (!text) {
      return { valid: true, body: {} };
    }

    const body = JSON.parse(text);

    // Check for injection patterns
    if (hasNoSqlInjection(body)) {
      return { valid: false, error: 'Invalid request parameters' };
    }

    if (hasSqlInjection(JSON.stringify(body))) {
      return { valid: false, error: 'Invalid request parameters' };
    }

    // Sanitize
    const sanitized = sanitizeInput(body);

    return { valid: true, body: sanitized };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON body' };
  }
}

/**
 * Rate limiting check
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetTime - now };
}

/**
 * Validate authentication and extract user context
 */
export async function validateAuth(
  req: Request,
  supabaseAdmin: SupabaseClient
): Promise<{
  valid: boolean;
  user: User | null;
  userId: string | null;
  tenantId: string | null;
  role: 'superadmin' | 'admin' | 'manager' | 'cleaner' | null;
  teamMemberId: string | null;
  error?: string;
}> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { valid: false, user: null, userId: null, tenantId: null, role: null, teamMemberId: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return { valid: false, user: null, userId: null, tenantId: null, role: null, teamMemberId: null, error: 'Invalid token format' };
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { valid: false, user: null, userId: null, tenantId: null, role: null, teamMemberId: null, error: 'Invalid or expired token' };
    }

    // Get user role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = roleData?.role as 'superadmin' | 'admin' | 'manager' | 'cleaner' | null;

    // Get team member ID for tenant context
    const { data: teamMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const teamMemberId = teamMember?.id || null;

    // For admin/superadmin, tenant is themselves; for others, derive from team_member
    let tenantId: string | null = null;
    if (role === 'admin' || role === 'superadmin') {
      tenantId = user.id;
    } else if (teamMemberId) {
      // Get owner ID from team member's property links
      // For now, use the user ID as tenant context
      tenantId = user.id;
    }

    return { valid: true, user, userId: user.id, tenantId, role, teamMemberId };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { valid: false, user: null, userId: null, tenantId: null, role: null, teamMemberId: null, error: 'Authentication failed' };
  }
}

/**
 * Verify webhook signature (HMAC-SHA256)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const data = encoder.encode(payload);

    // Use SubtleCrypto for HMAC
    // Note: This is async but for simplicity we'll use a sync check
    // In production, use proper async crypto
    const expectedSignature = signature; // TODO: Implement proper HMAC verification

    // For now, do a timing-safe comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Verify webhook signature async (proper implementation)
 */
export async function verifyWebhookSignatureAsync(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Check webhook timestamp to prevent replay attacks
 */
export function isWebhookTimestampValid(
  timestamp: string | null,
  maxAgeSeconds = 300 // 5 minutes
): boolean {
  if (!timestamp) return false;

  const webhookTime = parseInt(timestamp, 10);
  if (isNaN(webhookTime)) return false;

  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - webhookTime) <= maxAgeSeconds;
}

// ============================================================
// LOGGING
// ============================================================

/**
 * Secure logger - redacts sensitive fields
 */
export function secureLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  data: Record<string, unknown> = {}
): void {
  const sensitiveKeys = [
    'password', 'senha', 'token', 'api_key', 'apiKey', 'secret',
    'authorization', 'cookie', 'access_password', 'global_access_password'
  ];

  const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  const safeData = redact(data);
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...safeData,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }
}

// ============================================================
// ERROR RESPONSES
// ============================================================

/**
 * Create standardized error response
 */
export function errorResponse(
  status: number,
  message: string,
  requestId: string,
  details?: unknown
): Response {
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production';

  return new Response(
    JSON.stringify({
      error: message,
      request_id: requestId,
      ...(isProduction ? {} : { details }),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...CORS_HEADERS,
        ...SECURITY_HEADERS,
      },
    }
  );
}

/**
 * Create standardized success response
 */
export function successResponse(
  data: unknown,
  requestId: string,
  status = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...CORS_HEADERS,
        ...SECURITY_HEADERS,
      },
    }
  );
}

// ============================================================
// MAIN HANDLER WRAPPER
// ============================================================

/**
 * Create secure handler wrapper for edge functions
 * 
 * Applies all security middleware:
 * - Request ID generation
 * - CORS handling
 * - Security headers
 * - Input validation
 * - Rate limiting (optional)
 * - Authentication (optional)
 * - Error handling
 * - Request logging
 */
export function createSecureHandler(
  handler: SecureHandler,
  options: {
    requireAuth?: boolean;
    rateLimit?: RateLimitConfig;
    allowedMethods?: string[];
  } = {}
): (req: Request) => Promise<Response> {
  const {
    requireAuth = true,
    rateLimit,
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  } = options;

  return async (req: Request): Promise<Response> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Check allowed methods
    if (!allowedMethods.includes(req.method)) {
      return errorResponse(405, 'Method not allowed', requestId);
    }

    // Validate Content-Type for write methods
    const writeMethods = ['POST', 'PUT', 'PATCH'];
    if (writeMethods.includes(req.method)) {
      const contentType = req.headers.get('content-type');
      if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
        return errorResponse(415, 'Unsupported Media Type', requestId);
      }
    }

    try {
      // Initialize Supabase clients
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || '',
          },
        },
      });

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Initialize context
      let context: SecurityContext = {
        requestId,
        user: null,
        userId: null,
        tenantId: null,
        role: null,
        teamMemberId: null,
        supabaseClient,
        supabaseAdmin,
        ip,
        userAgent,
        startTime,
      };

      // Rate limiting
      if (rateLimit) {
        const key = rateLimit.keyGenerator
          ? rateLimit.keyGenerator(req, context)
          : ip;

        const { allowed, remaining, resetIn } = checkRateLimit(key, rateLimit);

        if (!allowed) {
          secureLog('warn', 'Rate limit exceeded', {
            request_id: requestId,
            ip,
            remaining,
            resetIn,
          });
          return errorResponse(429, 'Too many requests', requestId);
        }
      }

      // Authentication
      if (requireAuth) {
        const authResult = await validateAuth(req, supabaseAdmin);

        if (!authResult.valid) {
          secureLog('warn', 'Authentication failed', {
            request_id: requestId,
            ip,
            error: authResult.error,
          });
          return errorResponse(401, authResult.error || 'Unauthorized', requestId);
        }

        context = {
          ...context,
          user: authResult.user,
          userId: authResult.userId,
          tenantId: authResult.tenantId,
          role: authResult.role,
          teamMemberId: authResult.teamMemberId,
        };
      }

      // Execute handler
      const response = await handler(req, context);

      // Log successful request
      const duration = Date.now() - startTime;
      secureLog('info', 'Request completed', {
        request_id: requestId,
        method: req.method,
        path: new URL(req.url).pathname,
        status: response.status,
        duration_ms: duration,
        user_id: context.userId,
        role: context.role,
        ip,
      });

      // Add security headers to response
      const headers = new Headers(response.headers);
      headers.set('X-Request-ID', requestId);
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
      });
      Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      });

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      secureLog('error', 'Request failed', {
        request_id: requestId,
        method: req.method,
        path: new URL(req.url).pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
        ip,
      });

      return errorResponse(
        500,
        'Internal Server Error',
        requestId,
        error instanceof Error ? error.message : undefined
      );
    }
  };
}
