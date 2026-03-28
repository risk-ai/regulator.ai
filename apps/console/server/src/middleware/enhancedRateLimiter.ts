/**
 * Enhanced Rate Limiter
 * 
 * Per-endpoint rate limiting with different tiers for different operations.
 * Prevents abuse while allowing legitimate high-frequency operations.
 */

import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for auth endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Moderate rate limiter for API endpoints
 * Allows normal usage while preventing abuse
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests, please slow down',
    code: 'API_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for agent operations
 * Prevents runaway agents
 */
export const agentRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 agent operations per minute
  message: {
    success: false,
    error: 'Too many agent operations, please wait',
    code: 'AGENT_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Permissive rate limiter for read-only endpoints
 * Higher limits for dashboards/monitoring
 */
export const readOnlyRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: {
    success: false,
    error: 'Too many requests, please slow down',
    code: 'READ_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Very strict rate limiter for expensive operations
 * File uploads, large queries, etc.
 */
export const expensiveOpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 expensive operations per minute
  message: {
    success: false,
    error: 'Too many expensive operations, please wait',
    code: 'EXPENSIVE_OP_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
