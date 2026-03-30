/**
 * Rate Limiting Middleware
 * Protects Vienna OS API from abuse and DDoS
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Rate limit middleware
 */
export declare function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function blockIP(ip: string, durationMs?: number): void;
export declare function ipBlockMiddleware(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
//# sourceMappingURL=rate-limiter.d.ts.map