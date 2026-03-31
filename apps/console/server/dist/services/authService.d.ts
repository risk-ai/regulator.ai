/**
 * Auth Service
 *
 * Single-operator authentication for Vienna Console.
 * Uses secure session cookies, no complex multi-user IAM.
 */
export interface Session {
    sessionId: string;
    operator: string;
    createdAt: string;
    expiresAt: string;
    lastActivity: string;
}
export interface AuthConfig {
    operatorPassword: string;
    operatorName: string;
    sessionTTL: number;
    sessionSecret: string;
}
export declare class AuthService {
    private sessions;
    private config;
    private cleanupInterval;
    constructor(config: AuthConfig);
    /**
     * Stop cleanup interval (for testing/shutdown)
     */
    destroy(): void;
    /**
     * Verify password and create session
     */
    login(password: string): Promise<Session | null>;
    /**
     * Invalidate session
     */
    logout(sessionId: string): Promise<boolean>;
    /**
     * Validate session and update activity
     */
    validateSession(sessionId: string): Promise<Session | null>;
    /**
     * Get session without updating activity
     */
    getSession(sessionId: string): Promise<Session | null>;
    /**
     * Generate secure session ID
     */
    private generateSessionId;
    /**
     * Constant-time string comparison
     */
    private constantTimeCompare;
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): void;
    /**
     * Get session count (for debugging/monitoring)
     */
    getSessionCount(): number;
    /**
     * Clear all sessions (for testing)
     */
    clearAllSessions(): void;
}
//# sourceMappingURL=authService.d.ts.map