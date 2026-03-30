/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse
 */
/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export declare const apiLimiter: any;
/**
 * Auth endpoint rate limiter
 * Stricter limits for login attempts
 * 5 attempts per 15 minutes per IP
 */
export declare const authLimiter: any;
/**
 * Agent Intent rate limiter
 * Higher limits for agent API (legitimate automation)
 * 1000 requests per 15 minutes per IP
 */
export declare const agentLimiter: any;
//# sourceMappingURL=rateLimiter.d.ts.map