/**
 * Auth Routes
 *
 * Operator authentication endpoints.
 */
import { Router } from 'express';
const COOKIE_NAME = 'vienna_session';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
};
export function createAuthRouter(authService) {
    const router = Router();
    /**
     * POST /api/v1/auth/login
     * Authenticate operator and create session
     */
    router.post('/login', async (req, res) => {
        try {
            const { password } = req.body;
            if (!password) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required field: password',
                    code: 'INVALID_REQUEST',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const session = await authService.login(password);
            if (!session) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            // Set session cookie
            res.cookie(COOKIE_NAME, session.sessionId, COOKIE_OPTIONS);
            res.json({
                success: true,
                data: {
                    operator: session.operator.name,
                    tenant_id: session.operator.tenant_id,
                    sessionId: session.sessionId,
                    expiresAt: session.expiresAt,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
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
     * Invalidate session
     */
    router.post('/logout', async (req, res) => {
        try {
            const sessionId = req.cookies[COOKIE_NAME];
            if (sessionId) {
                await authService.logout(sessionId);
            }
            // Clear cookie
            res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
            res.json({
                success: true,
                data: {
                    message: 'Logged out successfully',
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[AuthRoute] Logout error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'AUTH_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/auth/session
     * Check current session status
     */
    router.get('/session', async (req, res) => {
        try {
            const sessionId = req.cookies[COOKIE_NAME];
            if (!sessionId) {
                res.json({
                    success: true,
                    data: {
                        authenticated: false,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const session = await authService.getSession(sessionId);
            if (!session) {
                // Clear invalid cookie
                res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
                res.json({
                    success: true,
                    data: {
                        authenticated: false,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    authenticated: true,
                    operator: session.operator.name,
                    tenant_id: session.operator.tenant_id,
                    expiresAt: session.expiresAt,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[AuthRoute] Session check error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'AUTH_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=auth.js.map