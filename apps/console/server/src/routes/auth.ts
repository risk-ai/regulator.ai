/**
 * Auth Routes — Vienna OS
 * 
 * Multi-tenant authentication with JWT tokens and API key management.
 * Registration, login, logout, session check, API key management.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '../db/postgres.js';
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  jwtAuthMiddleware,
  AuthenticatedRequest,
} from '../middleware/jwtAuth.js';
import {
  createApiKey,
  revokeApiKey,
  apiKeyAuthMiddleware,
  AuthenticatedApiRequest,
} from '../middleware/apiKeyAuth.js';

const router = Router();

// Legacy cookie-based session for backward compatibility
const COOKIE_NAME = 'vienna_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  company?: string;
  plan?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/v1/auth/register
 * Create tenant + first admin user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, company, plan = 'community' }: RegisterRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        code: 'USER_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await transaction(async () => {
      // Create tenant
      const tenantSlug = company ? 
        company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') :
        email.split('@')[0].replace(/[^a-z0-9]+/g, '-');

      // Ensure unique slug
      let finalSlug = tenantSlug;
      let counter = 1;
      while (await queryOne('SELECT id FROM tenants WHERE slug = $1', [finalSlug])) {
        finalSlug = `${tenantSlug}-${counter}`;
        counter++;
      }

      const tenant = await queryOne<{ id: string }>(
        `INSERT INTO tenants (name, slug, plan, max_agents, max_policies, settings)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          company || `${name || email}'s Organization`,
          finalSlug,
          plan,
          plan === 'enterprise' ? 100 : plan === 'business' ? 25 : plan === 'team' ? 10 : 5,
          plan === 'enterprise' ? 1000 : plan === 'business' ? 100 : plan === 'team' ? 50 : 10,
          JSON.stringify({}),
        ]
      );

      if (!tenant) {
        throw new Error('Failed to create tenant');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await queryOne<{ id: string }>(
        `INSERT INTO users (tenant_id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [tenant.id, email.toLowerCase(), passwordHash, name || null, 'admin']
      );

      if (!user) {
        throw new Error('Failed to create user');
      }

      return { tenantId: tenant.id, userId: user.id, tenantSlug: finalSlug };
    });

    // Generate tokens
    const tokenPayload = {
      userId: result.userId,
      tenantId: result.tenantId,
      email: email.toLowerCase(),
      role: 'admin',
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    // Store refresh token
    await storeRefreshToken(result.userId, refreshToken);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.userId,
          email: email.toLowerCase(),
          name: name || null,
          role: 'admin',
        },
        tenant: {
          id: result.tenantId,
          slug: result.tenantSlug,
          plan,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AuthRoute] Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Email/password → JWT access + refresh tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // Find user
    const user = await queryOne<{
      id: string;
      tenant_id: string;
      email: string;
      password_hash: string;
      name: string;
      role: string;
    }>(
      `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.name, u.role
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        timestamp: new Date().toISOString(),
      });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: user.tenant_id,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AuthRoute] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh token → new access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    const tokenData = await validateRefreshToken(refreshToken);
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: tokenData.userId,
      tenantId: tokenData.tenantId,
      email: tokenData.email,
      role: tokenData.role,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: 900, // 15 minutes
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AuthRoute] Refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Revoke refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // Clear legacy cookie if present
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AuthRoute] Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Current user info (requires JWT auth)
 */
router.get('/me', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
      });
    }

    // Get fresh user data
    const user = await queryOne<{
      id: string;
      email: string;
      name: string;
      role: string;
      last_login_at: string;
      created_at: string;
    }>(
      `SELECT id, email, name, role, last_login_at, created_at 
       FROM users 
       WHERE id = $1`,
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Get tenant data
    const tenant = await queryOne<{
      id: string;
      name: string;
      slug: string;
      plan: string;
      max_agents: number;
      max_policies: number;
    }>(
      `SELECT id, name, slug, plan, max_agents, max_policies 
       FROM tenants 
       WHERE id = $1`,
      [req.user.tenantId]
    );

    res.json({
      success: true,
      data: {
        user,
        tenant,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AuthRoute] Me endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/v1/auth/api-keys
 * Create API key (returns key once, stores hash)
 */
router.post('/api-keys', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
      });
    }

    const { name, scopes = ['intent:submit', 'execution:report'], agentId, rateLimit, expiresAt } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'API key name required',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate scopes
    const validScopes = ['intent:submit', 'execution:report', 'policy:read', 'policy:write', 'admin:read', 'admin:write'];
    const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope));
    
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid scopes: ${invalidScopes.join(', ')}`,
        code: 'INVALID_SCOPES',
        details: { validScopes },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await createApiKey({
      tenantId: req.user.tenantId,
      name,
      scopes,
      agentId,
      rateLimit: rateLimit || 1000,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: req.user.userId,
    });

    res.status(201).json({
      success: true,
      data: {
        id: result.keyId,
        name,
        apiKey: result.apiKey, // Only returned once
        scopes,
        agentId,
        rateLimit: rateLimit || 1000,
        expiresAt,
        message: 'Store this API key securely. It will not be shown again.',
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AuthRoute] Create API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/auth/api-keys
 * List API keys (without secrets)
 */
router.get('/api-keys', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
      });
    }

    const apiKeys = await query<{
      id: string;
      name: string;
      key_prefix: string;
      scopes: string[];
      agent_id?: string;
      rate_limit: number;
      last_used_at?: string;
      expires_at?: string;
      revoked_at?: string;
      created_at: string;
    }>(
      `SELECT id, name, key_prefix, scopes, agent_id, rate_limit, 
              last_used_at, expires_at, revoked_at, created_at
       FROM api_keys 
       WHERE tenant_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [req.user.tenantId]
    );

    res.json({
      success: true,
      data: {
        apiKeys: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.key_prefix,
          scopes: key.scopes,
          agentId: key.agent_id,
          rateLimit: key.rate_limit,
          lastUsedAt: key.last_used_at,
          expiresAt: key.expires_at,
          createdAt: key.created_at,
        })),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AuthRoute] List API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/v1/auth/api-keys/:id
 * Revoke API key
 */
router.delete('/api-keys/:id', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;

    // Verify API key belongs to user's tenant
    const apiKey = await queryOne(
      'SELECT id FROM api_keys WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenantId]
    );

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const success = await revokeApiKey(id);
    
    if (!success) {
      throw new Error('Failed to revoke API key');
    }

    res.json({
      success: true,
      data: { message: 'API key revoked successfully' },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[AuthRoute] Revoke API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;