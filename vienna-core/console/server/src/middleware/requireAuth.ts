/**
 * Auth Middleware
 * 
 * Require valid session for protected routes.
 */

import { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/authService.js';

const COOKIE_NAME = 'vienna_session';

export function createAuthMiddleware(authService: AuthService) {
  return async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.cookies[COOKIE_NAME];
      
      if (!sessionId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const session = await authService.validateSession(sessionId);
      
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired session',
          code: 'SESSION_EXPIRED',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Attach session to request for downstream handlers
      (req as any).session = session;
      
      next();
    } catch (error) {
      console.error('[AuthMiddleware] Error:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  };
}
