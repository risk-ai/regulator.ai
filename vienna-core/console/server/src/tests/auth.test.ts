/**
 * Auth Integration Tests
 * 
 * Tests authentication flow, session management, and route protection.
 */

import { AuthService } from '../services/authService.js';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService({
      operatorPassword: 'test_password_123',
      operatorName: 'test_operator',
      sessionTTL: 60000, // 1 minute
      sessionSecret: 'test_secret_key_for_testing',
    });
  });
  
  afterEach(() => {
    authService.clearAllSessions();
    authService.destroy();
  });
  
  describe('login', () => {
    it('should create session with valid password', async () => {
      const session = await authService.login('test_password_123');
      
      expect(session).not.toBeNull();
      expect(session?.operator).toBe('test_operator');
      expect(session?.sessionId).toBeDefined();
      expect(session?.expiresAt).toBeDefined();
    });
    
    it('should reject invalid password', async () => {
      const session = await authService.login('wrong_password');
      
      expect(session).toBeNull();
    });
    
    it('should reject empty password', async () => {
      const session = await authService.login('');
      
      expect(session).toBeNull();
    });
  });
  
  describe('validateSession', () => {
    it('should validate active session', async () => {
      const loginSession = await authService.login('test_password_123');
      expect(loginSession).not.toBeNull();
      
      const session = await authService.validateSession(loginSession!.sessionId);
      
      expect(session).not.toBeNull();
      expect(session?.operator).toBe('test_operator');
    });
    
    it('should reject invalid session ID', async () => {
      const session = await authService.validateSession('invalid_session_id');
      
      expect(session).toBeNull();
    });
    
    it('should update last activity on validation', async () => {
      const loginSession = await authService.login('test_password_123');
      expect(loginSession).not.toBeNull();
      
      const firstActivity = loginSession!.lastActivity;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const session = await authService.validateSession(loginSession!.sessionId);
      
      expect(session).not.toBeNull();
      expect(session!.lastActivity).not.toBe(firstActivity);
    });
  });
  
  describe('logout', () => {
    it('should invalidate session', async () => {
      const loginSession = await authService.login('test_password_123');
      expect(loginSession).not.toBeNull();
      
      const result = await authService.logout(loginSession!.sessionId);
      expect(result).toBe(true);
      
      const session = await authService.validateSession(loginSession!.sessionId);
      expect(session).toBeNull();
    });
    
    it('should return false for non-existent session', async () => {
      const result = await authService.logout('non_existent_session');
      
      expect(result).toBe(false);
    });
  });
  
  describe('session expiry', () => {
    it('should reject expired session', async () => {
      // Create service with very short TTL
      const shortTTLService = new AuthService({
        operatorPassword: 'test_password_123',
        operatorName: 'test_operator',
        sessionTTL: 100, // 100ms
        sessionSecret: 'test_secret_key_for_testing',
      });
      
      const loginSession = await shortTTLService.login('test_password_123');
      expect(loginSession).not.toBeNull();
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const session = await shortTTLService.validateSession(loginSession!.sessionId);
      
      expect(session).toBeNull();
      
      // Clean up
      shortTTLService.destroy();
    });
  });
  
  describe('session management', () => {
    it('should track multiple sessions', async () => {
      const session1 = await authService.login('test_password_123');
      const session2 = await authService.login('test_password_123');
      
      expect(session1).not.toBeNull();
      expect(session2).not.toBeNull();
      expect(session1!.sessionId).not.toBe(session2!.sessionId);
      
      expect(authService.getSessionCount()).toBe(2);
    });
    
    it('should clean up expired sessions', async () => {
      // Create service with very short TTL
      const shortTTLService = new AuthService({
        operatorPassword: 'test_password_123',
        operatorName: 'test_operator',
        sessionTTL: 100, // 100ms
        sessionSecret: 'test_secret_key_for_testing',
      });
      
      await shortTTLService.login('test_password_123');
      expect(shortTTLService.getSessionCount()).toBe(1);
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Explicitly trigger cleanup
      shortTTLService.cleanupExpiredSessions();
      
      // Sessions should be cleaned up
      expect(shortTTLService.getSessionCount()).toBe(0);
      
      // Clean up interval
      shortTTLService.destroy();
    });
  });
});
