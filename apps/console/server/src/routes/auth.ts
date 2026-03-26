/**
 * Auth Routes — Vienna OS
 * 
 * Registration, login, logout, session check, API key management.
 */

import { Router, Request, Response } from 'express';
import type { AuthService } from '../services/authService.js';

const COOKIE_NAME = 'vienna_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  /**
   * POST /api/v1/auth/register
   * Create a new operator account
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { username, password, email, company, plan } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Username and password required',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await authService.register({ username, password, email, company, plan });

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          code: 'REGISTRATION_FAILED',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Set session cookie (auto-login after registration)
      res.cookie(COOKIE_NAME, result.session.sessionId, COOKIE_OPTIONS);

      res.status(201).json({
        success: true,
        data: {
          operator: result.operator.username,
          tenantId: result.operator.tenantId,
          plan: result.operator.plan,
          sessionId: result.session.sessionId,
          expiresAt: result.session.expiresAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AuthRoute] Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        code: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/v1/auth/login
   * Authenticate operator (supports username or default operator)
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: password',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const session = await authService.login(password, username);

      if (!session) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.cookie(COOKIE_NAME, session.sessionId, COOKIE_OPTIONS);

      res.json({
        success: true,
        data: {
          operator: session.operator,
          tenantId: session.tenantId,
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AuthRoute] Login error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/v1/auth/logout
   */
  router.post('/logout', async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies[COOKIE_NAME];
      if (sessionId) {
        await authService.logout(sessionId);
      }
      res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AuthRoute] Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/auth/session
   * Check current session
   */
  router.get('/session', async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies[COOKIE_NAME];

      if (!sessionId) {
        res.json({
          success: true,
          data: { authenticated: false },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const session = await authService.getSession(sessionId);

      if (!session) {
        res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
        res.json({
          success: true,
          data: { authenticated: false },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: {
          authenticated: true,
          operator: session.operator,
          tenantId: session.tenantId,
          expiresAt: session.expiresAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AuthRoute] Session check error:', error);
      res.status(500).json({
        success: false,
        error: 'Session check failed',
        code: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
