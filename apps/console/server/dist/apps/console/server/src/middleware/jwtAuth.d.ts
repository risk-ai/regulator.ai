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
export declare function jwtAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
/**
 * Generate JWT Access Token (15 min TTL)
 */
export declare function generateAccessToken(payload: Omit<JwtPayload, 'type'>): string;
/**
 * Generate JWT Refresh Token (7 day TTL)
 */
export declare function generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string;
/**
 * Store refresh token in database (hashed)
 */
export declare function storeRefreshToken(userId: string, token: string): Promise<string>;
/**
 * Validate refresh token and return user data
 */
export declare function validateRefreshToken(token: string): Promise<JwtPayload | null>;
/**
 * Revoke refresh token
 */
export declare function revokeRefreshToken(token: string): Promise<boolean>;
/**
 * Cleanup expired refresh tokens (call periodically)
 */
export declare function cleanupExpiredTokens(): Promise<number>;
//# sourceMappingURL=jwtAuth.d.ts.map