/**
 * Simple In-Memory Cache Middleware
 * 
 * Caches GET responses for configurable TTL
 */

import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  expiresAt: number;
  contentType: string;
}

const cache = new Map<string, CacheEntry>();

export function createCacheMiddleware(ttlSeconds: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const now = Date.now();

    // Check cache
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', cached.contentType);
      return res.send(cached.data);
    }

    // Intercept response
    const originalSend = res.send.bind(res);
    res.send = function(data: any) {
      // Cache successful responses
      if (res.statusCode === 200) {
        cache.set(key, {
          data,
          expiresAt: now + (ttlSeconds * 1000),
          contentType: res.getHeader('Content-Type') as string || 'application/json',
        });
      }
      res.setHeader('X-Cache', 'MISS');
      return originalSend(data);
    };

    next();
  };
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export function clearCache(pattern?: string) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}
