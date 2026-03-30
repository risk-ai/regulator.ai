/**
 * Hybrid Auth Middleware
 *
 * Accepts BOTH cookie-based sessions AND JWT tokens
 * Prioritizes JWT if present, falls back to cookies
 */
import jwt from 'jsonwebtoken';
const COOKIE_NAME = 'vienna_session';
const JWT_SECRET = process.env.JWT_SECRET || '6586b367b38f099dde55d31409e558c0d44935feb81dd824f64f9e1a89ebf20d';
/**
 * Create hybrid auth middleware that accepts JWT OR cookies
 */
export function createHybridAuthMiddleware(authService) {
    return async function hybridAuth(req, res, next) {
        try {
            // Try JWT first
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
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
                }
                catch (error) {
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
                        userId: session.operator || session.userId,
                        tenantId: session.tenantId,
                        email: session.operator || session.email,
                        role: session.role || 'admin',
                    };
                    return next();
                }
            }
            // DEV MODE: Bypass auth for localhost testing
            if (process.env.NODE_ENV === 'development' || process.env.DISABLE_AUTH === 'true') {
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
        }
        catch (error) {
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
//# sourceMappingURL=hybridAuth.js.map