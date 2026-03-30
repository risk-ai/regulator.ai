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
export declare function tenantContextMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Helper to get tenant ID from request
 * Use this in route handlers after tenantContextMiddleware
 */
export declare function getTenantId(req: Request): string;
/**
 * Helper to get user ID from request
 */
export declare function getUserId(req: Request): string;
//# sourceMappingURL=tenantContext.d.ts.map