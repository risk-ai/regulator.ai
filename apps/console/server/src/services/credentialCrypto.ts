/**
 * Credential Crypto — AES-256-GCM
 * 
 * Phase 4A: Encrypt/decrypt credentials for adapter_configs.
 * 
 * Storage format: base64(iv):base64(ciphertext+authTag)
 * Key source: VIENNA_CREDENTIAL_KEY env var (64-char hex = 32 bytes)
 * 
 * SECURITY:
 * - Unique 12-byte IV per encryption
 * - 16-byte auth tag for tamper detection
 * - Key never logged, never persisted, never in API output
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_ENV = 'VIENNA_CREDENTIAL_KEY';

/**
 * Get the encryption key from environment.
 * Throws if not configured or invalid length.
 */
function getKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new Error(
      `${KEY_ENV} not set. Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  // Accept hex (64 chars) or base64 (44 chars)
  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }

  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be exactly 32 bytes (got ${key.length}). Use 64-char hex or 44-char base64.`);
  }

  return key;
}

/**
 * Encrypt plaintext credential.
 * Returns storage string: base64(iv):base64(ciphertext+authTag)
 */
export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine ciphertext + authTag for storage
  const combined = Buffer.concat([encrypted, authTag]);

  return `${iv.toString('base64')}:${combined.toString('base64')}`;
}

/**
 * Decrypt stored credential.
 * Input format: base64(iv):base64(ciphertext+authTag)
 * Returns plaintext string.
 */
export function decryptCredential(stored: string): string {
  const key = getKey();

  const parts = stored.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid credential format: expected iv:ciphertext');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const combined = Buffer.from(parts[1], 'base64');

  if (iv.length !== IV_BYTES) {
    throw new Error(`Invalid IV length: expected ${IV_BYTES}, got ${iv.length}`);
  }

  if (combined.length < AUTH_TAG_BYTES + 1) {
    throw new Error('Ciphertext too short');
  }

  // Split combined into ciphertext + authTag
  const ciphertext = combined.subarray(0, combined.length - AUTH_TAG_BYTES);
  const authTag = combined.subarray(combined.length - AUTH_TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Test if a VIENNA_CREDENTIAL_KEY is configured and valid.
 */
export function isCredentialKeyConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new credential key (for setup/rotation).
 * Returns 64-char hex string.
 */
export function generateCredentialKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
