/**
 * Hybrid Auth Middleware
 * 
 * Accepts BOTH cookie-based sessions AND JWT tokens
 * Prioritizes JWT if present, falls back to cookies
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthService } from '../services/authService.js';

const COOKIE_NAME = 'vienna_session';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[HybridAuth] WARNING: JWT_SECRET not set. JWT auth will be unavailable.');
}

interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

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
export function createHybridAuthMiddleware(authService: AuthService) {
  return async function hybridAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Try JWT first
      const authHeader = req.headers.authorization;
      if (JWT_SECRET && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
          if (decoded.type === 'access') {
            // JWT valid - attach user
            req.user = {
              userId: decoded.userId,
              tenantId: decoded.tenantId,
              email: decoded.email,
              role: decoded.role,
            };
            // Also set session for backwards compatibility
            req.session = {
              sessionId: decoded.userId,
              operator: decoded.email,
              tenantId: decoded.tenantId,
              role: decoded.role,
            };
            return next();
          }
        } catch (error) {
          // JWT invalid, fall through to cookie check
        }
      }

      // Try cookie-based session
      const sessionId = req.cookies[COOKIE_NAME];
      if (sessionId) {
        const session = await authService.validateSession(sessionId);
        if (session) {
          req.session = session;
          // Also set user for consistency
          req.user = {
            userId: session.operator,
            tenantId: session.tenantId,
            email: session.operator,
            role: 'admin',
          };
          return next();
        }
      }

      // DEV MODE: Only bypass auth when explicitly enabled AND not in production
      if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
        req.session = {
          sessionId: 'dev-session',
          operator: 'dev-operator',
          tenantId: 'system',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          lastActivity: new Date().toISOString(),
        };
        req.user = {
          userId: 'dev-user',
          tenantId: 'system',
          email: 'dev@vienna.os',
          role: 'admin',
        };
        return next();
      }

      // No valid auth found
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[HybridAuth] Error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  };
}
