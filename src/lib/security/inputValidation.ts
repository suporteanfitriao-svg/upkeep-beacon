/**
 * Input Validation Utilities
 * 
 * Client-side validation as first line of defense.
 * Server-side validation (RLS/Edge Functions) is the authoritative check.
 */

import { z } from 'zod';

// ============================================================
// SANITIZATION FUNCTIONS
// ============================================================

/**
 * Remove potentially dangerous HTML/script content
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

/**
 * Escape special characters for safe display
 */
export function escapeHtml(input: string): string {
  if (!input) return '';
  
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }
  
  // Ensure URL is valid
  try {
    new URL(url);
    return url;
  } catch {
    // If not absolute, check if it's a valid relative path
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return url;
    }
    return '';
  }
}

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Email inválido')
  .max(255, 'Email muito longo')
  .transform((val) => val.toLowerCase().trim());

/**
 * Password validation schema with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128, 'Máximo 128 caracteres')
  .refine((val) => /[A-Z]/.test(val), 'Deve conter letra maiúscula')
  .refine((val) => /[a-z]/.test(val), 'Deve conter letra minúscula')
  .refine((val) => /[0-9]/.test(val), 'Deve conter número')
  .refine((val) => /[^A-Za-z0-9]/.test(val), 'Deve conter caractere especial');

/**
 * Brazilian phone number validation
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Telefone inválido')
  .transform((val) => val.replace(/\D/g, ''));

/**
 * Brazilian CPF validation
 */
export const cpfSchema = z
  .string()
  .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
  .refine((cpf) => {
    // CPF validation algorithm
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cpf.charAt(10));
  }, 'CPF inválido');

/**
 * Brazilian CEP validation
 */
export const cepSchema = z
  .string()
  .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos')
  .transform((val) => val.replace(/\D/g, ''));

/**
 * Generic text field with sanitization
 */
export const sanitizedTextSchema = (maxLength = 1000) =>
  z
    .string()
    .max(maxLength, `Máximo ${maxLength} caracteres`)
    .transform(sanitizeHtml);

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .url('URL inválida')
  .max(2048, 'URL muito longa')
  .refine((url) => sanitizeUrl(url) !== '', 'URL não permitida');

/**
 * UUID validation schema
 */
export const uuidSchema = z
  .string()
  .uuid('ID inválido');

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Validate and return result with error messages
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map((e) => e.message),
  };
}

/**
 * Check if input contains SQL injection patterns
 */
export function hasSqlInjectionPattern(input: string): boolean {
  if (!input) return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/i,
    /(\b(UNION|JOIN)\s+(ALL\s+)?SELECT\b)/i,
    /(--|#|\/\*)/,
    /(\bOR\b\s+[\d\w]+\s*=\s*[\d\w]+)/i,
    /(\bAND\b\s+[\d\w]+\s*=\s*[\d\w]+)/i,
    /(;|\x00)/,
  ];
  
  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check if input contains XSS patterns
 */
export function hasXssPattern(input: string): boolean {
  if (!input) return false;
  
  const xssPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
  ];
  
  return xssPatterns.some((pattern) => pattern.test(input));
}

// ============================================================
// RATE LIMITING (Client-side)
// ============================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple client-side rate limiting
 * Note: Server-side rate limiting is the authoritative check
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
}

// ============================================================
// FORM VALIDATION SCHEMAS
// ============================================================

/**
 * Team member form validation
 */
export const teamMemberFormSchema = z.object({
  name: sanitizedTextSchema(100),
  email: emailSchema,
  cpf: cpfSchema,
  whatsapp: phoneSchema,
  role: z.enum(['admin', 'manager', 'cleaner']),
  address_cep: cepSchema.optional(),
  address_street: sanitizedTextSchema(200).optional(),
  address_number: sanitizedTextSchema(20).optional(),
  address_complement: sanitizedTextSchema(100).optional(),
  address_district: sanitizedTextSchema(100).optional(),
  address_city: sanitizedTextSchema(100).optional(),
  address_state: sanitizedTextSchema(2).optional(),
});

/**
 * Property form validation
 */
export const propertyFormSchema = z.object({
  name: sanitizedTextSchema(100),
  address: sanitizedTextSchema(300).optional(),
  default_check_in_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  default_check_out_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

/**
 * Maintenance issue form validation
 */
export const maintenanceIssueFormSchema = z.object({
  category: sanitizedTextSchema(50),
  description: sanitizedTextSchema(1000),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

/**
 * Waitlist form validation
 */
export const waitlistFormSchema = z.object({
  name: sanitizedTextSchema(100),
  email: emailSchema,
  whatsapp: phoneSchema,
  property_count: z.string().max(20),
  challenges: sanitizedTextSchema(500).optional(),
  city: sanitizedTextSchema(100).optional(),
  state: sanitizedTextSchema(2).optional(),
  property_type: z.string().max(50).optional(),
  property_type_other: sanitizedTextSchema(100).optional(),
  property_link: urlSchema.optional().or(z.literal('')),
});
