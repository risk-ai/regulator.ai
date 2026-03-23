/**
 * Auth Service
 * 
 * Single-operator authentication for Vienna Console.
 * Uses secure session cookies, no complex multi-user IAM.
 */

import crypto from 'crypto';

export interface Session {
  sessionId: string;
  operator: {
    name: string;
    tenant_id: string;
    workspace_id?: string;
    user_id?: string;
  };
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}

export interface AuthConfig {
  operatorPassword: string;
  operatorName: string;
  operatorTenantId?: string;
  sessionTTL: number; // milliseconds
  sessionSecret: string;
}

export class AuthService {
  private sessions: Map<string, Session> = new Map();
  private config: AuthConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: AuthConfig) {
    this.config = config;
    
    // Start session cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
  }
  
  /**
   * Stop cleanup interval (for testing/shutdown)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Verify password and create session
   */
  async login(password: string): Promise<Session | null> {
    // Constant-time comparison to prevent timing attacks
    const valid = this.constantTimeCompare(
      password,
      this.config.operatorPassword
    );
    
    if (!valid) {
      return null;
    }
    
    // Create session
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionTTL);
    
    const session: Session = {
      sessionId,
      operator: {
        name: this.config.operatorName,
        tenant_id: this.config.operatorTenantId || 'default-tenant',
      },
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
  async logout(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  /**
   * Validate session and update activity
   */
  async validateSession(sessionId: string): Promise<Session | null> {
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
  async getSession(sessionId: string): Promise<Session | null> {
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
  private generateSessionId(): string {
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
  private constantTimeCompare(a: string, b: string): boolean {
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
  cleanupExpiredSessions(): void {
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
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }
}
