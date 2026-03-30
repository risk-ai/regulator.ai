/**
 * Auth Service — Vienna OS
 *
 * Multi-operator authentication with:
 * - Password hashing (scrypt — Node.js native, no dependencies)
 * - SQLite-backed sessions (persist across restarts)
 * - Per-operator tenant isolation
 * - API key auth for agents
 * - Backward compatible with single-operator env var mode
 */
export interface Session {
    sessionId: string;
    operator: string;
    tenantId: string;
    createdAt: string;
    expiresAt: string;
    lastActivity: string;
}
export interface Operator {
    id: string;
    username: string;
    email?: string;
    company?: string;
    passwordHash: string;
    tenantId: string;
    plan: string;
    createdAt: string;
    active: boolean;
}
export interface ApiKey {
    id: string;
    key: string;
    keyHash: string;
    operatorId: string;
    tenantId: string;
    label: string;
    createdAt: string;
    lastUsedAt?: string;
    active: boolean;
}
export interface AuthConfig {
    operatorPassword: string;
    operatorName: string;
    sessionTTL: number;
    sessionSecret: string;
    stateGraph?: any;
}
export declare class AuthService {
    private sessions;
    private operators;
    private apiKeys;
    private config;
    private cleanupInterval;
    private dbReady;
    constructor(config: AuthConfig);
    /**
     * Initialize SQLite tables for operators, sessions, and API keys
     */
    private initDatabase;
    private loadOperators;
    destroy(): void;
    private hashPassword;
    private verifyPassword;
    register(params: {
        username: string;
        password: string;
        email?: string;
        company?: string;
        plan?: string;
    }): Promise<{
        operator: Operator;
        session: Session;
    } | {
        error: string;
    }>;
    login(password: string, username?: string): Promise<Session | null>;
    private loginWithOperator;
    private createSession;
    createApiKey(operatorId: string, label: string): Promise<{
        key: string;
        apiKey: ApiKey;
    } | null>;
    validateApiKey(rawKey: string): Promise<{
        tenantId: string;
        operatorId: string;
    } | null>;
    logout(sessionId: string): Promise<boolean>;
    validateSession(sessionId: string): Promise<Session | null>;
    getSession(sessionId: string): Promise<Session | null>;
    private generateSessionId;
    private constantTimeCompare;
    cleanupExpiredSessions(): void;
    getSessionCount(): number;
    getOperatorCount(): number;
    clearAllSessions(): void;
}
//# sourceMappingURL=authService.d.ts.map