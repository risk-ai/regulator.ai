/**
 * JWT Authentication Middleware — Vienna OS
 * 
 * Handles JWT-based authentication for multi-tenant access.
 * Issues access tokens (15 min TTL) + refresh tokens (7 day TTL).
 * 
 * Token Payload: { userId, tenantId, email, role }
 * Header: Authorization: Bearer <jwt>
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, queryOne } from '../db/postgres.js';

// JWT Configuration
// TEMP FIX: Hardcoded until systemd env passing works
const JWT_SECRET = '6586b367b38f099dde55d31409e558c0d44935feb81dd824f64f9e1a89ebf20d';
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

/**
 * JWT Auth Middleware - Validates JWT access tokens
 */
export function jwtAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  console.log('[JWT] Auth header:', authHeader?.substring(0, 30) + '...');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No JWT token - fall through to other auth methods
    console.log('[JWT] No Bearer token, passing through');
    return next();
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  console.log('[JWT] Token length:', token.length);

  try {
    console.log('[JWT] Verifying with secret length:', JWT_SECRET.length);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log('[JWT] Token verified! User:', decoded.email);
    
    if (decoded.type !== 'access') {
      console.log('[JWT] Wrong token type:', decoded.type);
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
        timestamp: new Date().toISOString(),
      });
    }

    // Attach user context to request
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role,
    };

    console.log('[JWT] User attached to request:', req.user.email);
    next();
  } catch (error) {
    console.log('[JWT] Verification failed:', error.message);
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        timestamp: new Date().toISOString(),
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Token validation failed',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generate JWT Access Token (15 min TTL)
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

/**
 * Generate JWT Refresh Token (7 day TTL)
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

/**
 * Store refresh token in database (hashed)
 */
export async function storeRefreshToken(userId: string, token: string): Promise<string> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);
  
  const result = await queryOne<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt]
  );

  return result?.id || '';
}

/**
 * Validate refresh token and return user data
 */
export async function validateRefreshToken(token: string): Promise<JwtPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    if (decoded.type !== 'refresh') {
      return null;
    }

    // Check if token exists in database and is not revoked
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const dbToken = await queryOne<{ user_id: string; revoked_at: string | null }>(
      `SELECT user_id, revoked_at FROM refresh_tokens 
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );

    if (!dbToken || dbToken.revoked_at) {
      return null;
    }

    // Verify user still exists and get current data
    const user = await queryOne<{
      id: string;
      tenant_id: string;
      email: string;
      role: string;
    }>(
      `SELECT id, tenant_id, email, role FROM users WHERE id = $1`,
      [dbToken.user_id]
    );

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
      type: 'refresh'
    };
  } catch (error) {
    return null;
  }
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await query(
      `UPDATE refresh_tokens 
       SET revoked_at = NOW() 
       WHERE token_hash = $1`,
      [tokenHash]
    );

    return true;
  } catch (error) {
    console.error('Error revoking refresh token:', error);
    return false;
  }
}

/**
 * Cleanup expired refresh tokens (call periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await queryOne<{ count: number }>(
    `DELETE FROM refresh_tokens 
     WHERE expires_at < NOW() OR revoked_at IS NOT NULL
     RETURNING COUNT(*) as count`
  );

  return result?.count || 0;
}