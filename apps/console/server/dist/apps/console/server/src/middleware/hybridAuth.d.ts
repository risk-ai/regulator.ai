/**
 * Hybrid Auth Middleware
 *
 * Accepts BOTH cookie-based sessions AND JWT tokens
 * Prioritizes JWT if present, falls back to cookies
 */
import { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/authService.js';
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        tenantId: string;
        email: string;
        role: string;
    };
    session?: any;
}
/**
 * Create hybrid auth middleware that accepts JWT OR cookies
 */
export declare function createHybridAuthMiddleware(authService: AuthService): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=hybridAuth.d.ts.map