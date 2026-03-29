/**
 * Rate Limiting Middleware
 * Protects Vienna OS API from abuse and DDoS
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';

// In-memory rate limiter (development)
const rateLimiterMemory = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Redis rate limiter (production)
let rateLimiterRedis: RateLimiterRedis | null = null;

if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  const redisClient = new Redis(process.env.REDIS_URL);

  rateLimiterRedis = new RateLimiterRedis({
    storeClient: redisClient,
    points: 100,
    duration: 60,
    keyPrefix: 'vienna_rl',
  });
}

const rateLimiter = rateLimiterRedis || rateLimiterMemory;

// Tier-based rate limits
const tierLimits = {
  intent: { points: 10, duration: 60 }, // 10 intents/min
  approval: { points: 50, duration: 60 }, // 50 approval actions/min
  read: { points: 200, duration: 60 }, // 200 reads/min
};

/**
 * Rate limit middleware
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Determine rate limit tier
    const tier = getRateLimitTier(req.path);
    const limits = tierLimits[tier] || { points: 100, duration: 60 };

    // Use IP + user agent as key (or tenant_id if authenticated)
    const key = req.headers['x-tenant-id'] as string || 
                `${req.ip}_${req.headers['user-agent']}`;

    // Consume rate limit
    await rateLimiter.consume(key, 1);

    // Add rate limit headers
    const rateLimitInfo = await rateLimiter.get(key);
    if (rateLimitInfo) {
      res.setHeader('X-RateLimit-Limit', limits.points);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString());
    }

    next();
  } catch (error: any) {
    if (error.msBeforeNext) {
      // Rate limit exceeded
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: Math.ceil(error.msBeforeNext / 1000),
        timestamp: new Date().toISOString()
      });
    } else {
      // Other error
      console.error('[RateLimiter] Error:', error);
      next(error);
    }
  }
}

function getRateLimitTier(path: string): 'intent' | 'approval' | 'read' {
  if (path.includes('/intent')) return 'intent';
  if (path.includes('/approval')) return 'approval';
  return 'read';
}

/**
 * IP-based blocking for severe abuse
 */
const blockedIPs = new Set<string>();

export function blockIP(ip: string, durationMs: number = 3600000) {
  blockedIPs.add(ip);
  setTimeout(() => blockedIPs.delete(ip), durationMs);
}

export function ipBlockMiddleware(req: Request, res: Response, next: NextFunction) {
  if (blockedIPs.has(req.ip)) {
    return res.status(403).json({
      success: false,
      error: 'IP blocked due to abuse',
      code: 'IP_BLOCKED',
      timestamp: new Date().toISOString()
    });
  }
  next();
}
