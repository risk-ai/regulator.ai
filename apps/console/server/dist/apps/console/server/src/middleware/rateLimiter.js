/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse
 */
import rateLimit from 'express-rate-limit';
/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});
/**
 * Auth endpoint rate limiter
 * Stricter limits for login attempts
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: 'Too many login attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});
/**
 * Agent Intent rate limiter
 * Higher limits for agent API (legitimate automation)
 * 1000 requests per 15 minutes per IP
 */
export const agentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
        success: false,
        error: 'Agent rate limit exceeded',
        code: 'AGENT_RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimiter.js.map