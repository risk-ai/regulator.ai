/**
 * Auth Middleware
 *
 * Require valid session for protected routes.
 */
const COOKIE_NAME = 'vienna_session';
export function createAuthMiddleware(authService) {
    return async function requireAuth(req, res, next) {
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
            req.session = session;
            next();
        }
        catch (error) {
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
//# sourceMappingURL=requireAuth.js.map