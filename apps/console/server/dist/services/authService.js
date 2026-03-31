/**
 * Auth Service
 *
 * Single-operator authentication for Vienna Console.
 * Uses secure session cookies, no complex multi-user IAM.
 */
import crypto from 'crypto';
export class AuthService {
    sessions = new Map();
    config;
    cleanupInterval;
    constructor(config) {
        this.config = config;
        // Start session cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
    }
    /**
     * Stop cleanup interval (for testing/shutdown)
     */
    destroy() {
        clearInterval(this.cleanupInterval);
    }
    /**
     * Verify password and create session
     */
    async login(password) {
        // Constant-time comparison to prevent timing attacks
        const valid = this.constantTimeCompare(password, this.config.operatorPassword);
        if (!valid) {
            return null;
        }
        // Create session
        const sessionId = this.generateSessionId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.config.sessionTTL);
        const session = {
            sessionId,
            operator: this.config.operatorName,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            lastActivity: now.toISOString(),
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    /**
     * Invalidate session
     */
    async logout(sessionId) {
        return this.sessions.delete(sessionId);
    }
    /**
     * Validate session and update activity
     */
    async validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        // Check expiry
        if (new Date() > new Date(session.expiresAt)) {
            this.sessions.delete(sessionId);
            return null;
        }
        // Update last activity
        session.lastActivity = new Date().toISOString();
        return session;
    }
    /**
     * Get session without updating activity
     */
    async getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        // Check expiry
        if (new Date() > new Date(session.expiresAt)) {
            this.sessions.delete(sessionId);
            return null;
        }
        return session;
    }
    /**
     * Generate secure session ID
     */
    generateSessionId() {
        const random = crypto.randomBytes(32);
        const timestamp = Date.now().toString(36);
        return crypto
            .createHmac('sha256', this.config.sessionSecret)
            .update(random)
            .update(timestamp)
            .digest('base64url');
    }
    /**
     * Constant-time string comparison
     */
    constantTimeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        const aBuffer = Buffer.from(a);
        const bBuffer = Buffer.from(b);
        return crypto.timingSafeEqual(aBuffer, bBuffer);
    }
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = new Date();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now > new Date(session.expiresAt)) {
                this.sessions.delete(sessionId);
            }
        }
    }
    /**
     * Get session count (for debugging/monitoring)
     */
    getSessionCount() {
        return this.sessions.size;
    }
    /**
     * Clear all sessions (for testing)
     */
    clearAllSessions() {
        this.sessions.clear();
    }
}
//# sourceMappingURL=authService.js.map