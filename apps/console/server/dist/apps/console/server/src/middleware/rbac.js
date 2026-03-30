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
/**
 * Permission matrix by role
 */
const ROLE_PERMISSIONS = {
    admin: [
        'tenant:manage',
        'users:list', 'users:create', 'users:update', 'users:delete',
        'policies:list', 'policies:create', 'policies:update', 'policies:delete',
        'intents:submit', 'intents:list', 'intents:view',
        'executions:report', 'executions:list', 'executions:view',
        'approvals:list', 'approvals:approve_t1', 'approvals:approve_t2', 'approvals:approve_t3',
        'fleet:list', 'fleet:manage', 'fleet:trust_modify',
        'audit:list', 'audit:export',
        'integrations:list', 'integrations:manage',
        'compliance:view', 'compliance:generate',
        'api_keys:list', 'api_keys:create', 'api_keys:revoke',
        'settings:view', 'settings:manage',
    ],
    operator: [
        'policies:list', 'policies:create', 'policies:update',
        'intents:list', 'intents:view',
        'executions:list', 'executions:view',
        'approvals:list', 'approvals:approve_t1', 'approvals:approve_t2',
        'fleet:list', 'fleet:manage',
        'audit:list',
        'integrations:list',
        'compliance:view', 'compliance:generate',
        'api_keys:list',
        'settings:view',
    ],
    viewer: [
        'policies:list',
        'intents:list', 'intents:view',
        'executions:list', 'executions:view',
        'approvals:list',
        'fleet:list',
        'audit:list',
        'integrations:list',
        'compliance:view',
        'settings:view',
    ],
    agent: [
        'intents:submit',
        'executions:report',
        'fleet:list',
    ],
};
/**
 * Check if a role has a specific permission
 */
export function hasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? permissions.includes(permission) : false;
}
/**
 * Get all permissions for a role
 */
export function getPermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
}
/**
 * Middleware factory: require specific permission(s)
 *
 * Usage:
 *   router.post('/policies', requirePermission('policies:create'), handler);
 *   router.delete('/users/:id', requirePermission('users:delete'), handler);
 */
export function requirePermission(...permissions) {
    return (req, res, next) => {
        const user = req.user;
        const apiKey = req.apiKey;
        // Get role from JWT user or API key
        const role = user?.role || apiKey?.role || 'viewer';
        const missing = permissions.filter(p => !hasPermission(role, p));
        if (missing.length > 0) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                required: missing,
                role,
            });
        }
        next();
    };
}
/**
 * Middleware: require any of the listed permissions (OR logic)
 */
export function requireAnyPermission(...permissions) {
    return (req, res, next) => {
        const user = req.user;
        const apiKey = req.apiKey;
        const role = user?.role || apiKey?.role || 'viewer';
        const hasAny = permissions.some(p => hasPermission(role, p));
        if (!hasAny) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                required_any: permissions,
                role,
            });
        }
        next();
    };
}
/**
 * Middleware: require specific role(s)
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        const apiKey = req.apiKey;
        const role = user?.role || apiKey?.role || 'viewer';
        if (!roles.includes(role)) {
            return res.status(403).json({
                success: false,
                error: `Requires role: ${roles.join(' or ')}`,
                current_role: role,
            });
        }
        next();
    };
}
//# sourceMappingURL=rbac.js.map