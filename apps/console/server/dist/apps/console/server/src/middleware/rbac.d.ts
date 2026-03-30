/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Roles: admin, operator, viewer, agent
 *
 * Permission matrix:
 * - admin: full access (manage users, policies, settings, approve all tiers)
 * - operator: manage policies, approve T1/T2, view fleet, view audit
 * - viewer: read-only access to dashboard, fleet, audit
 * - agent: API-only, submit intents, report executions
 */
import { Request, Response, NextFunction } from 'express';
export type Role = 'admin' | 'operator' | 'viewer' | 'agent';
export type Permission = 'tenant:manage' | 'users:list' | 'users:create' | 'users:update' | 'users:delete' | 'policies:list' | 'policies:create' | 'policies:update' | 'policies:delete' | 'intents:submit' | 'intents:list' | 'intents:view' | 'executions:report' | 'executions:list' | 'executions:view' | 'approvals:list' | 'approvals:approve_t1' | 'approvals:approve_t2' | 'approvals:approve_t3' | 'fleet:list' | 'fleet:manage' | 'fleet:trust_modify' | 'audit:list' | 'audit:export' | 'integrations:list' | 'integrations:manage' | 'compliance:view' | 'compliance:generate' | 'api_keys:list' | 'api_keys:create' | 'api_keys:revoke' | 'settings:view' | 'settings:manage';
/**
 * Check if a role has a specific permission
 */
export declare function hasPermission(role: Role, permission: Permission): boolean;
/**
 * Get all permissions for a role
 */
export declare function getPermissions(role: Role): Permission[];
/**
 * Middleware factory: require specific permission(s)
 *
 * Usage:
 *   router.post('/policies', requirePermission('policies:create'), handler);
 *   router.delete('/users/:id', requirePermission('users:delete'), handler);
 */
export declare function requirePermission(...permissions: Permission[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Middleware: require any of the listed permissions (OR logic)
 */
export declare function requireAnyPermission(...permissions: Permission[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Middleware: require specific role(s)
 */
export declare function requireRole(...roles: Role[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=rbac.d.ts.map