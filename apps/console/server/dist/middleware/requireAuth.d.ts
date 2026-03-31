/**
 * Auth Middleware
 *
 * Require valid session for protected routes.
 */
import { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/authService.js';
export declare function createAuthMiddleware(authService: AuthService): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=requireAuth.d.ts.map