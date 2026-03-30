/**
 * Simple In-Memory Cache Middleware
 *
 * Caches GET responses for configurable TTL
 */
import { Request, Response, NextFunction } from 'express';
export declare function createCacheMiddleware(ttlSeconds?: number): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function clearCache(pattern?: string): void;
//# sourceMappingURL=cache.d.ts.map