/**
 * API Key Authentication Middleware — Vienna OS
 *
 * Multi-tenant API key authentication with scope validation and rate limiting.
 * API keys are scoped to a specific tenant and can be bound to specific agents.
 *
 * Usage: Include header `Authorization: Bearer vos_xxxxx` or `X-API-Key: vos_xxxxx`
 */
import crypto from 'crypto';
import { query, queryOne } from '../db/postgres.js';
// Rate limiting store (in-memory, could be moved to Redis in production)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
/**
 * API Key Authentication Middleware
 */
export function apiKeyAuthMiddleware(req, res, next) {
    return async function apiKeyAuth() {
        // Check for API key in headers
        const authHeader = req.headers['authorization'];
        const apiKeyHeader = req.headers['x-api-key'];
        let apiKey = null;
        if (authHeader?.startsWith('Bearer vos_')) {
            apiKey = authHeader.slice(7); // Remove "Bearer "
        }
        else if (apiKeyHeader?.startsWith('vos_')) {
            apiKey = apiKeyHeader;
        }
        if (!apiKey) {
            // No API key — fall through to other auth methods
            return next();
        }
        try {
            // Validate API key
            const keyRecord = await validateApiKey(apiKey);
            if (!keyRecord) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid API key',
                    code: 'INVALID_API_KEY',
                    timestamp: new Date().toISOString(),
                });
            }
            // Check rate limiting
            const rateLimitResult = await checkRateLimit(keyRecord.id, keyRecord.rate_limit);
            if (!rateLimitResult.allowed) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    details: {
                        limit: keyRecord.rate_limit,
                        windowHours: 1,
                        retryAfter: rateLimitResult.retryAfter,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            // Update last_used_at
            await updateLastUsed(keyRecord.id);
            // Attach API key context to request
            req.apiKey = {
                tenantId: keyRecord.tenant_id,
                agentId: keyRecord.agent_id,
                scopes: keyRecord.scopes,
                keyId: keyRecord.id,
                rateLimit: keyRecord.rate_limit,
            };
            next();
        }
        catch (error) {
            console.error('[ApiKeyAuth] Validation error:', error);
            return res.status(500).json({
                success: false,
                error: 'API key validation failed',
                code: 'AUTH_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    }();
}
/**
 * Validate API key against database
 */
async function validateApiKey(apiKey) {
    if (!apiKey.startsWith('vos_') || apiKey.length < 20) {
        return null;
    }
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 8);
    const record = await queryOne(`SELECT id, tenant_id, key_hash, key_prefix, name, scopes, agent_id, 
            rate_limit, last_used_at, expires_at, revoked_at
     FROM api_keys 
     WHERE key_prefix = $1 AND key_hash = $2`, [keyPrefix, keyHash]);
    if (!record) {
        return null;
    }
    // Check if key is revoked
    if (record.revoked_at) {
        return null;
    }
    // Check if key is expired
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
        return null;
    }
    return record;
}
/**
 * Check rate limit for API key
 */
async function checkRateLimit(keyId, limit) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    const existing = rateLimitStore.get(keyId);
    if (!existing || existing.windowStart < windowStart) {
        // Start new window
        rateLimitStore.set(keyId, { count: 1, windowStart: now });
        return { allowed: true };
    }
    if (existing.count >= limit) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((existing.windowStart + RATE_LIMIT_WINDOW - now) / 1000);
        return { allowed: false, retryAfter };
    }
    // Increment count
    existing.count++;
    rateLimitStore.set(keyId, existing);
    return { allowed: true };
}
/**
 * Update last_used_at timestamp for API key
 */
async function updateLastUsed(keyId) {
    try {
        await query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [keyId]);
    }
    catch (error) {
        console.error('[ApiKeyAuth] Failed to update last_used_at:', error);
        // Don't fail the request for this
    }
}
/**
 * Middleware to check if API key has required scope
 */
export function requireScope(requiredScope) {
    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key required',
                code: 'API_KEY_REQUIRED',
                timestamp: new Date().toISOString(),
            });
        }
        if (!req.apiKey.scopes.includes(requiredScope)) {
            return res.status(403).json({
                success: false,
                error: `Insufficient scope. Required: ${requiredScope}`,
                code: 'INSUFFICIENT_SCOPE',
                details: {
                    required: requiredScope,
                    available: req.apiKey.scopes,
                },
                timestamp: new Date().toISOString(),
            });
        }
        next();
    };
}
/**
 * Generate new API key
 */
export function generateApiKey() {
    // Format: vos_[8 chars prefix]_[32 chars random]
    const prefix = 'vos_' + crypto.randomBytes(4).toString('hex');
    const suffix = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${suffix}`;
}
/**
 * Hash API key for database storage
 */
export function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}
/**
 * Create new API key in database
 */
export async function createApiKey(params) {
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);
    const result = await queryOne(`INSERT INTO api_keys (tenant_id, key_hash, key_prefix, name, scopes, agent_id, rate_limit, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`, [
        params.tenantId,
        keyHash,
        keyPrefix,
        params.name,
        JSON.stringify(params.scopes),
        params.agentId || null,
        params.rateLimit || 1000,
        params.expiresAt || null,
        params.createdBy || null,
    ]);
    return {
        apiKey,
        keyId: result?.id || '',
    };
}
/**
 * Revoke API key
 */
export async function revokeApiKey(keyId) {
    try {
        await query(`UPDATE api_keys SET revoked_at = NOW() WHERE id = $1`, [keyId]);
        return true;
    }
    catch (error) {
        console.error('[ApiKeyAuth] Error revoking API key:', error);
        return false;
    }
}
/**
 * Cleanup rate limit store (call periodically)
 */
export function cleanupRateLimitStore() {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [keyId, data] of rateLimitStore.entries()) {
        if (data.windowStart < cutoff) {
            rateLimitStore.delete(keyId);
        }
    }
}
//# sourceMappingURL=apiKeyAuth.js.map