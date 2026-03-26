/**
 * API Key Authentication Middleware — Vienna OS
 * 
 * Allows agents to authenticate via API key header instead of session cookie.
 * API keys are scoped to a specific operator/tenant.
 * 
 * Usage: Include header `Authorization: Bearer vos_xxxxx` or `X-API-Key: vos_xxxxx`
 */

import { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../services/authService.js';

export function createApiKeyMiddleware(authService: AuthService) {
  return async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
    // Check for API key in headers
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'] as string;

    let apiKey: string | null = null;

    if (authHeader?.startsWith('Bearer vos_')) {
      apiKey = authHeader.slice(7); // Remove "Bearer "
    } else if (apiKeyHeader?.startsWith('vos_')) {
      apiKey = apiKeyHeader;
    }

    if (!apiKey) {
      // No API key — fall through to session auth
      next();
      return;
    }

    // Validate API key
    const result = await authService.validateApiKey(apiKey);

    if (!result) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Attach tenant context to request
    (req as any).tenantId = result.tenantId;
    (req as any).operatorId = result.operatorId;
    (req as any).authMethod = 'api_key';

    next();
  };
}
