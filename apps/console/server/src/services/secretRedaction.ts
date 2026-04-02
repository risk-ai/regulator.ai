/**
 * Secret Redaction — Phase 4A
 * 
 * Deep-walk any object and redact sensitive values before persistence.
 * Called at EVERY persistence boundary (execution_log, execution_steps,
 * execution_ledger_events, audit_log, SSE broadcast).
 * 
 * RULES:
 * 1. Keys matching sensitive patterns → value replaced with [REDACTED:key_name]
 * 2. Values matching known resolved secrets → replaced with [REDACTED:credential:<config_id>]
 * 3. Never mutates input — returns new object
 * 4. Handles nested objects, arrays, and circular references
 */

/** Keys whose values should always be redacted */
const SENSITIVE_KEY_PATTERNS = [
  /^authorization$/i,
  /^x-api-key$/i,
  /^api[_-]?key$/i,
  /^token$/i,
  /^secret$/i,
  /^password$/i,
  /^credential$/i,
  /^bearer$/i,
  /^x-auth/i,
  /^x-secret/i,
  /^x-token/i,
  /^private[_-]?key$/i,
  /^access[_-]?token$/i,
  /^refresh[_-]?token$/i,
  /^client[_-]?secret$/i,
  /^webhook[_-]?secret$/i,
  /^signing[_-]?key$/i,
  /^hmac/i,
  /^encrypted/i,
];

/** Value patterns that look like secrets (Bearer tokens, long hex strings, etc.) */
const SENSITIVE_VALUE_PATTERNS = [
  /^Bearer\s+\S+/i,
  /^Basic\s+\S+/i,
  /^sk[_-][a-zA-Z0-9]{20,}/,       // Stripe-style keys
  /^pk[_-][a-zA-Z0-9]{20,}/,
  /^ghp_[a-zA-Z0-9]{20,}/,          // GitHub PATs
  /^gho_[a-zA-Z0-9]{20,}/,
  /^xox[bpsar]-[a-zA-Z0-9\-]+/,     // Slack tokens
];

/**
 * Known resolved secrets for exact-match redaction.
 * Map of plaintext → adapter_config_id
 */
export interface ResolvedSecretMap {
  [plaintext: string]: string;  // plaintext → config_id for traceability
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(p => p.test(key));
}

function isSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some(p => p.test(value));
}

/**
 * Deep-walk an object and redact sensitive values.
 * 
 * @param obj - The object to redact (not mutated)
 * @param resolvedSecrets - Optional map of known secret plaintext → config_id
 * @param maxDepth - Maximum recursion depth (default 20)
 * @returns New object with sensitive values redacted
 */
export function redactSecrets(
  obj: any,
  resolvedSecrets?: ResolvedSecretMap,
  maxDepth: number = 20,
): any {
  const seen = new WeakSet();
  return _redact(obj, resolvedSecrets || {}, seen, 0, maxDepth);
}

function _redact(
  obj: any,
  secrets: ResolvedSecretMap,
  seen: WeakSet<object>,
  depth: number,
  maxDepth: number,
): any {
  // Primitives
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;

  // String: check if it matches a known secret
  if (typeof obj === 'string') {
    // Exact match against known secrets
    if (secrets[obj]) {
      return `[REDACTED:credential:${secrets[obj]}]`;
    }
    // Pattern match for secret-looking values
    if (isSensitiveValue(obj)) {
      return '[REDACTED:value]';
    }
    return obj;
  }

  // Depth guard
  if (depth >= maxDepth) return '[REDACTED:depth_exceeded]';

  // Circular reference guard
  if (typeof obj === 'object') {
    if (seen.has(obj)) return '[REDACTED:circular]';
    seen.add(obj);
  }

  // Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => _redact(item, secrets, seen, depth + 1, maxDepth));
  }

  // Date
  if (obj instanceof Date) return obj.toISOString();

  // Objects
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      // Redact by key name
      if (typeof value === 'string' && value.length > 0) {
        result[key] = `[REDACTED:${key}]`;
      } else if (value !== null && value !== undefined) {
        result[key] = `[REDACTED:${key}]`;
      } else {
        result[key] = value;
      }
    } else {
      result[key] = _redact(value, secrets, seen, depth + 1, maxDepth);
    }
  }

  return result;
}

/**
 * Validate that an object contains no sensitive values.
 * Used in tests to assert redaction completeness.
 * 
 * Returns list of paths where sensitive data was found.
 */
export function findLeakedSecrets(
  obj: any,
  resolvedSecrets?: ResolvedSecretMap,
): string[] {
  const leaks: string[] = [];
  _findLeaks(obj, resolvedSecrets || {}, '', leaks, new WeakSet(), 0);
  return leaks;
}

function _findLeaks(
  obj: any,
  secrets: ResolvedSecretMap,
  path: string,
  leaks: string[],
  seen: WeakSet<object>,
  depth: number,
): void {
  if (depth > 20 || obj === null || obj === undefined) return;

  if (typeof obj === 'string') {
    // Check against known secrets
    if (secrets[obj]) {
      leaks.push(`${path}: matches secret for config ${secrets[obj]}`);
    }
    // Check patterns
    if (isSensitiveValue(obj)) {
      leaks.push(`${path}: matches sensitive value pattern`);
    }
    return;
  }

  if (typeof obj !== 'object') return;
  if (seen.has(obj)) return;
  seen.add(obj);

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => _findLeaks(item, secrets, `${path}[${i}]`, leaks, seen, depth + 1));
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const keyPath = path ? `${path}.${key}` : key;
    if (isSensitiveKey(key) && value && typeof value === 'string' && !value.startsWith('[REDACTED')) {
      leaks.push(`${keyPath}: sensitive key with unredacted value`);
    }
    _findLeaks(value, secrets, keyPath, leaks, seen, depth + 1);
  }
}
