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
import crypto from 'crypto';
export class AuthService {
    // In-memory fallback for sessions (used when no stateGraph)
    sessions = new Map();
    // In-memory operator store (loaded from SQLite on init)
    operators = new Map();
    // API keys
    apiKeys = new Map();
    config;
    cleanupInterval;
    dbReady = false;
    constructor(config) {
        this.config = config;
        this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60000);
        // Initialize database tables if stateGraph available
        if (config.stateGraph) {
            this.initDatabase().catch(err => {
                console.error('[AuthService] DB init failed, using in-memory:', err.message);
            });
        }
    }
    /**
     * Initialize SQLite tables for operators, sessions, and API keys
     */
    async initDatabase() {
        const db = this.config.stateGraph;
        if (!db?.run)
            return;
        try {
            // Operators table
            await db.run(`CREATE TABLE IF NOT EXISTS operators (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        company TEXT,
        password_hash TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        plan TEXT DEFAULT 'community',
        created_at TEXT NOT NULL,
        active INTEGER DEFAULT 1
      )`);
            // Sessions table (persistent across restarts)
            await db.run(`CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        operator_username TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_activity TEXT NOT NULL
      )`);
            // API keys table
            await db.run(`CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key_hash TEXT UNIQUE NOT NULL,
        operator_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        active INTEGER DEFAULT 1,
        FOREIGN KEY (operator_id) REFERENCES operators(id)
      )`);
            this.dbReady = true;
            // Load existing operators
            await this.loadOperators();
            console.log('[AuthService] Database tables initialized');
        }
        catch (err) {
            console.error('[AuthService] DB init error:', err);
        }
    }
    async loadOperators() {
        const db = this.config.stateGraph;
        if (!db?.all)
            return;
        try {
            const rows = await db.all('SELECT * FROM operators WHERE active = 1');
            if (rows) {
                for (const row of rows) {
                    this.operators.set(row.username, {
                        id: row.id,
                        username: row.username,
                        email: row.email,
                        company: row.company,
                        passwordHash: row.password_hash,
                        tenantId: row.tenant_id,
                        plan: row.plan,
                        createdAt: row.created_at,
                        active: Boolean(row.active),
                    });
                }
            }
        }
        catch (err) {
            // Table may not exist yet
        }
    }
    destroy() {
        clearInterval(this.cleanupInterval);
    }
    // ========================================
    // Password Hashing (scrypt — no dependencies)
    // ========================================
    async hashPassword(password) {
        return new Promise((resolve, reject) => {
            const salt = crypto.randomBytes(16);
            crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                if (err)
                    reject(err);
                resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
            });
        });
    }
    async verifyPassword(password, hash) {
        return new Promise((resolve, reject) => {
            const [saltHex, keyHex] = hash.split(':');
            if (!saltHex || !keyHex) {
                resolve(false);
                return;
            }
            const salt = Buffer.from(saltHex, 'hex');
            const key = Buffer.from(keyHex, 'hex');
            crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                if (err)
                    reject(err);
                resolve(crypto.timingSafeEqual(key, derivedKey));
            });
        });
    }
    // ========================================
    // Registration
    // ========================================
    async register(params) {
        const { username, password, email, company, plan } = params;
        // Validate
        if (!username || username.length < 3) {
            return { error: 'Username must be at least 3 characters' };
        }
        if (!password || password.length < 8) {
            return { error: 'Password must be at least 8 characters' };
        }
        if (this.operators.has(username)) {
            return { error: 'Username already taken' };
        }
        // Also block registration with the default operator name
        if (username === this.config.operatorName) {
            return { error: 'Username reserved' };
        }
        const passwordHash = await this.hashPassword(password);
        const id = crypto.randomUUID();
        const tenantId = `tenant-${username}-${crypto.randomBytes(4).toString('hex')}`;
        const now = new Date().toISOString();
        const operator = {
            id,
            username,
            email,
            company,
            passwordHash,
            tenantId,
            plan: plan || 'community',
            createdAt: now,
            active: true,
        };
        // Save to DB if available
        if (this.dbReady && this.config.stateGraph?.run) {
            try {
                await this.config.stateGraph.run(`INSERT INTO operators (id, username, email, company, password_hash, tenant_id, plan, created_at, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`, [id, username, email || null, company || null, passwordHash, tenantId, plan || 'community', now]);
            }
            catch (err) {
                if (err.message?.includes('UNIQUE constraint')) {
                    return { error: 'Username already taken' };
                }
                console.error('[AuthService] Registration DB error:', err.message);
            }
        }
        // Save in memory
        this.operators.set(username, operator);
        // Auto-login
        const session = await this.loginWithOperator(operator);
        return { operator, session };
    }
    // ========================================
    // Login
    // ========================================
    async login(password, username) {
        // If username provided, try registered operator first
        if (username && this.operators.has(username)) {
            const operator = this.operators.get(username);
            const valid = await this.verifyPassword(password, operator.passwordHash);
            if (valid) {
                return this.loginWithOperator(operator);
            }
            return null;
        }
        // Fallback: default operator from env var (backward compatible)
        if (!username || username === this.config.operatorName) {
            const valid = this.constantTimeCompare(password, this.config.operatorPassword);
            if (valid) {
                return this.createSession(this.config.operatorName, 'system');
            }
        }
        // If username provided but not found, check if it's the default
        if (username) {
            // Try default operator
            const valid = this.constantTimeCompare(password, this.config.operatorPassword);
            if (valid && username === this.config.operatorName) {
                return this.createSession(this.config.operatorName, 'system');
            }
        }
        return null;
    }
    async loginWithOperator(operator) {
        return this.createSession(operator.username, operator.tenantId);
    }
    createSession(operator, tenantId) {
        const sessionId = this.generateSessionId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.config.sessionTTL);
        const session = {
            sessionId,
            operator,
            tenantId,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            lastActivity: now.toISOString(),
        };
        this.sessions.set(sessionId, session);
        // Persist to DB if available
        if (this.dbReady && this.config.stateGraph?.run) {
            this.config.stateGraph.run(`INSERT OR REPLACE INTO sessions (session_id, operator_username, tenant_id, created_at, expires_at, last_activity)
         VALUES (?, ?, ?, ?, ?, ?)`, [sessionId, operator, tenantId, session.createdAt, session.expiresAt, session.lastActivity]).catch(() => { }); // Non-blocking
        }
        return session;
    }
    // ========================================
    // API Key Auth
    // ========================================
    async createApiKey(operatorId, label) {
        // Find operator
        let operator;
        for (const op of this.operators.values()) {
            if (op.id === operatorId) {
                operator = op;
                break;
            }
        }
        if (!operator)
            return null;
        const rawKey = `vos_${crypto.randomBytes(24).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const apiKey = {
            id,
            key: rawKey.slice(0, 8) + '...', // Truncated for display
            keyHash,
            operatorId,
            tenantId: operator.tenantId,
            label,
            createdAt: now,
            active: true,
        };
        this.apiKeys.set(keyHash, apiKey);
        if (this.dbReady && this.config.stateGraph?.run) {
            await this.config.stateGraph.run(`INSERT INTO api_keys (id, key_hash, operator_id, tenant_id, label, created_at, active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`, [id, keyHash, operatorId, operator.tenantId, label, now]).catch(() => { });
        }
        return { key: rawKey, apiKey };
    }
    async validateApiKey(rawKey) {
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const apiKey = this.apiKeys.get(keyHash);
        if (!apiKey || !apiKey.active)
            return null;
        // Update last used
        apiKey.lastUsedAt = new Date().toISOString();
        return { tenantId: apiKey.tenantId, operatorId: apiKey.operatorId };
    }
    // ========================================
    // Session Management (unchanged API)
    // ========================================
    async logout(sessionId) {
        const deleted = this.sessions.delete(sessionId);
        if (this.dbReady && this.config.stateGraph?.run) {
            this.config.stateGraph.run('DELETE FROM sessions WHERE session_id = ?', [sessionId]).catch(() => { });
        }
        return deleted;
    }
    async validateSession(sessionId) {
        let session = this.sessions.get(sessionId);
        // Try DB if not in memory
        if (!session && this.dbReady && this.config.stateGraph?.get) {
            try {
                const row = await this.config.stateGraph.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId]);
                if (row) {
                    session = {
                        sessionId: row.session_id,
                        operator: row.operator_username,
                        tenantId: row.tenant_id,
                        createdAt: row.created_at,
                        expiresAt: row.expires_at,
                        lastActivity: row.last_activity,
                    };
                    this.sessions.set(sessionId, session);
                }
            }
            catch { }
        }
        if (!session)
            return null;
        if (new Date() > new Date(session.expiresAt)) {
            this.sessions.delete(sessionId);
            return null;
        }
        session.lastActivity = new Date().toISOString();
        return session;
    }
    async getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        if (new Date() > new Date(session.expiresAt)) {
            this.sessions.delete(sessionId);
            return null;
        }
        return session;
    }
    // ========================================
    // Utilities
    // ========================================
    generateSessionId() {
        const random = crypto.randomBytes(32);
        const timestamp = Date.now().toString(36);
        return crypto
            .createHmac('sha256', this.config.sessionSecret)
            .update(random)
            .update(timestamp)
            .digest('base64url');
    }
    constantTimeCompare(a, b) {
        if (a.length !== b.length)
            return false;
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
    cleanupExpiredSessions() {
        const now = new Date();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now > new Date(session.expiresAt)) {
                this.sessions.delete(sessionId);
            }
        }
        if (this.dbReady && this.config.stateGraph?.run) {
            this.config.stateGraph.run('DELETE FROM sessions WHERE expires_at < ?', [now.toISOString()]).catch(() => { });
        }
    }
    getSessionCount() { return this.sessions.size; }
    getOperatorCount() { return this.operators.size; }
    clearAllSessions() { this.sessions.clear(); }
}
//# sourceMappingURL=authService.js.map