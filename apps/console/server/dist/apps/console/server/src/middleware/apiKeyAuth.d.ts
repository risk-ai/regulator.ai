/**
 * API Key Authentication Middleware — Vienna OS
 *
 * Multi-tenant API key authentication with scope validation and rate limiting.
 * API keys are scoped to a specific tenant and can be bound to specific agents.
 *
 * Usage: Include header `Authorization: Bearer vos_xxxxx` or `X-API-Key: vos_xxxxx`
 */
import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedApiRequest extends Request {
    apiKey?: {
        tenantId: string;
        agentId?: string;
        scopes: string[];
        keyId: string;
        rateLimit: number;
    };
}
/**
 * API Key Authentication Middleware
 */
export declare function apiKeyAuthMiddleware(req: AuthenticatedApiRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware to check if API key has required scope
 */
export declare function requireScope(requiredScope: string): (req: AuthenticatedApiRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Generate new API key
 */
export declare function generateApiKey(): string;
/**
 * Hash API key for database storage
 */
export declare function hashApiKey(apiKey: string): string;
/**
 * Create new API key in database
 */
export declare function createApiKey(params: {
    tenantId: string;
    name: string;
    scopes: string[];
    agentId?: string;
    rateLimit?: number;
    expiresAt?: Date;
    createdBy?: string;
}): Promise<{
    apiKey: string;
    keyId: string;
}>;
/**
 * Revoke API key
 */
export declare function revokeApiKey(keyId: string): Promise<boolean>;
/**
 * Cleanup rate limit store (call periodically)
 */
export declare function cleanupRateLimitStore(): void;
//# sourceMappingURL=apiKeyAuth.d.ts.map