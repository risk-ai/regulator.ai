/**
 * Tenant Context Middleware
 * 
 * Extracts tenantId from authenticated JWT token and adds to request.
 * Ensures all data queries are scoped to the user's tenant.
 * 
 * SECURITY: This middleware is CRITICAL for multi-tenant data isolation.
 * Must be used on ALL routes that access tenant-specific data.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './jwtAuth.js';

export interface TenantRequest extends AuthenticatedRequest {
  tenantId: string;
}

/**
 * Extract tenant ID from authenticated user
 * 
 * Requirements:
 * - Must be used AFTER jwtAuthMiddleware
 * - User must have tenantId in JWT payload
 * 
 * @throws 401 if no authentication or missing tenantId
 */
export function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  
  // Verify authentication
  if (!authReq.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Verify tenant context
  if (!authReq.user.tenantId) {
    console.error('[TenantContext] Missing tenantId in JWT payload:', authReq.user);
    res.status(401).json({
      success: false,
      error: 'Invalid authentication token (missing tenant context)',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Add tenantId to request
  (req as TenantRequest).tenantId = authReq.user.tenantId;
  
  // Debug logging (remove in production)
  console.log(`[TenantContext] Request scoped to tenant: ${authReq.user.tenantId}`);
  
  next();
}

/**
 * Helper to get tenant ID from request
 * Use this in route handlers after tenantContextMiddleware
 */
export function getTenantId(req: Request): string {
  const tenantReq = req as TenantRequest;
  if (!tenantReq.tenantId) {
    throw new Error('Tenant context not available. Did you forget tenantContextMiddleware?');
  }
  return tenantReq.tenantId;
}

/**
 * Helper to get user ID from request
 */
export function getUserId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user || !authReq.user.userId) {
    throw new Error('User context not available. Did you forget jwtAuthMiddleware?');
  }
  return authReq.user.userId;
}
