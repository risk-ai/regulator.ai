/**
 * Enhanced Rate Limiter
 *
 * Per-endpoint rate limiting with different tiers for different operations.
 * Prevents abuse while allowing legitimate high-frequency operations.
 */
/**
 * Strict rate limiter for auth endpoints
 * Prevents brute force attacks
 */
export declare const authRateLimiter: any;
/**
 * Moderate rate limiter for API endpoints
 * Allows normal usage while preventing abuse
 */
export declare const apiRateLimiter: any;
/**
 * Strict rate limiter for agent operations
 * Prevents runaway agents
 */
export declare const agentRateLimiter: any;
/**
 * Permissive rate limiter for read-only endpoints
 * Higher limits for dashboards/monitoring
 */
export declare const readOnlyRateLimiter: any;
/**
 * Very strict rate limiter for expensive operations
 * File uploads, large queries, etc.
 */
export declare const expensiveOpRateLimiter: any;
//# sourceMappingURL=enhancedRateLimiter.d.ts.map