/**
 * Encryption Utilities
 * 
 * AES-256-GCM encryption for sensitive data
 * 
 * Uso:
 * import { encrypt, decrypt } from '../_shared/security/encryption.ts';
 * 
 * const encrypted = await encrypt('sensitive data');
 * const decrypted = await decrypt(encrypted);
 */

// ============================================================
// ENCRYPTION CONFIGURATION
// ============================================================

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const TAG_LENGTH = 128; // bits

// ============================================================
// KEY MANAGEMENT
// ============================================================

/**
 * Get encryption key from environment
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get('ENCRYPTION_KEY');
  
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (256 bits)');
  }

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(keyHex.substr(i * 2, 2), 16);
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a new encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return Array.from(key)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================
// ENCRYPTION FUNCTIONS
// ============================================================

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns: iv:tag:ciphertext (all hex encoded)
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  
  // Generate random IV
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);
  
  // Encrypt
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encoder.encode(plaintext)
  );

  // Convert to hex
  const cipherBytes = new Uint8Array(cipherBuffer);
  
  // In AES-GCM, the auth tag is appended to the ciphertext
  // Last 16 bytes are the tag
  const ciphertext = cipherBytes.slice(0, -16);
  const tag = cipherBytes.slice(-16);

  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  
  const tagHex = Array.from(tag)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  
  const ciphertextHex = Array.from(ciphertext)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${ivHex}:${tagHex}:${ciphertextHex}`;
}

/**
 * Decrypt ciphertext encrypted with encrypt()
 * Input format: iv:tag:ciphertext (all hex encoded)
 */
export async function decrypt(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  const decoder = new TextDecoder();
  
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;

  // Convert from hex
  const iv = new Uint8Array(ivHex.length / 2);
  for (let i = 0; i < iv.length; i++) {
    iv[i] = parseInt(ivHex.substr(i * 2, 2), 16);
  }

  const tag = new Uint8Array(tagHex.length / 2);
  for (let i = 0; i < tag.length; i++) {
    tag[i] = parseInt(tagHex.substr(i * 2, 2), 16);
  }

  const ciphertext = new Uint8Array(ciphertextHex.length / 2);
  for (let i = 0; i < ciphertext.length; i++) {
    ciphertext[i] = parseInt(ciphertextHex.substr(i * 2, 2), 16);
  }

  // Combine ciphertext and tag for decryption
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  // Decrypt
  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    combined
  );

  return decoder.decode(plainBuffer);
}

/**
 * Hash sensitive data (one-way, for comparison)
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================
// DATA MASKING
// ============================================================

/**
 * Mask sensitive string (show first/last chars)
 */
export function maskSensitive(value: string, showFirst = 2, showLast = 2): string {
  if (!value || value.length <= showFirst + showLast) {
    return '*'.repeat(value?.length || 0);
  }
  
  const first = value.slice(0, showFirst);
  const last = value.slice(-showLast);
  const middle = '*'.repeat(Math.min(value.length - showFirst - showLast, 8));
  
  return `${first}${middle}${last}`;
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return maskSensitive(email);
  
  const maskedLocal = local.length > 2 
    ? `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}`
    : '*'.repeat(local.length);
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask CPF (Brazilian ID)
 */
export function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '*'.repeat(cpf.length);
  
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '*'.repeat(phone.length);
  
  return `${digits.slice(0, 2)}****${digits.slice(-4)}`;
}
