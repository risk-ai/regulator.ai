/**
 * Vienna Role-Based Access Control (RBAC)
 *
 * Role definitions, permission management, and access enforcement.
 */
/**
 * System Roles
 */
const ROLES = {
    OPERATOR: 'operator',
    APPROVER: 'approver',
    AUDITOR: 'auditor',
    SERVICE_AGENT: 'service_agent',
    PLATFORM_ADMIN: 'platform_admin'
};
/**
 * Permission Definitions
 */
const PERMISSIONS = {
    // Intent permissions
    'intent:submit': { roles: [ROLES.OPERATOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'intent:read': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'intent:list': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    // Plan permissions
    'plan:create': { roles: [ROLES.OPERATOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'plan:read': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'plan:list': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'plan:update': { roles: [ROLES.OPERATOR, ROLES.PLATFORM_ADMIN] },
    'plan:cancel': { roles: [ROLES.OPERATOR, ROLES.PLATFORM_ADMIN] },
    // Approval permissions
    'approval:request': { roles: [ROLES.OPERATOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'approval:read': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.PLATFORM_ADMIN] },
    'approval:list': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.PLATFORM_ADMIN] },
    'approval:grant': { roles: [ROLES.APPROVER, ROLES.PLATFORM_ADMIN] },
    'approval:deny': { roles: [ROLES.APPROVER, ROLES.PLATFORM_ADMIN] },
    // Execution permissions
    'execution:execute': { roles: [ROLES.OPERATOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'execution:read': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'execution:list': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'execution:cancel': { roles: [ROLES.OPERATOR, ROLES.PLATFORM_ADMIN] },
    // Verification permissions
    'verification:read': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'verification:list': { roles: [ROLES.OPERATOR, ROLES.APPROVER, ROLES.AUDITOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    // Ledger permissions
    'ledger:query': { roles: [ROLES.OPERATOR, ROLES.AUDITOR, ROLES.PLATFORM_ADMIN] },
    'ledger:read': { roles: [ROLES.OPERATOR, ROLES.AUDITOR, ROLES.PLATFORM_ADMIN] },
    'ledger:export': { roles: [ROLES.AUDITOR, ROLES.PLATFORM_ADMIN] },
    // Node permissions
    'node:register': { roles: [ROLES.PLATFORM_ADMIN] },
    'node:read': { roles: [ROLES.OPERATOR, ROLES.PLATFORM_ADMIN] },
    'node:list': { roles: [ROLES.OPERATOR, ROLES.PLATFORM_ADMIN] },
    'node:update': { roles: [ROLES.PLATFORM_ADMIN] },
    'node:deregister': { roles: [ROLES.PLATFORM_ADMIN] },
    // Lock permissions
    'lock:acquire': { roles: [ROLES.OPERATOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'lock:release': { roles: [ROLES.OPERATOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] },
    'lock:read': { roles: [ROLES.OPERATOR, ROLES.AUDITOR, ROLES.PLATFORM_ADMIN] },
    // Tenant permissions
    'tenant:create': { roles: [ROLES.PLATFORM_ADMIN] },
    'tenant:read': { roles: [ROLES.OPERATOR, ROLES.PLATFORM_ADMIN] },
    'tenant:update': { roles: [ROLES.PLATFORM_ADMIN] },
    'tenant:delete': { roles: [ROLES.PLATFORM_ADMIN] },
    // Plugin permissions
    'plugin:register': { roles: [ROLES.PLATFORM_ADMIN] },
    'plugin:load': { roles: [ROLES.PLATFORM_ADMIN] },
    'plugin:unload': { roles: [ROLES.PLATFORM_ADMIN] },
    'plugin:execute': { roles: [ROLES.OPERATOR, ROLES.SERVICE_AGENT, ROLES.PLATFORM_ADMIN] }
};
/**
 * Role Model
 */
class Role {
    constructor(data) {
        this.role_id = data.role_id;
        this.name = data.name;
        this.permissions = data.permissions || [];
        this.tenant_scope = data.tenant_scope || 'global';
        this.created_at = data.created_at || new Date().toISOString();
    }
    hasPermission(permission) {
        return this.permissions.includes(permission) ||
            this.permissions.includes('*') ||
            this.permissions.includes(permission.split(':')[0] + ':*');
    }
    toJSON() {
        return {
            role_id: this.role_id,
            name: this.name,
            permissions: this.permissions,
            tenant_scope: this.tenant_scope,
            created_at: this.created_at
        };
    }
}
/**
 * Principal (User or Service Account)
 */
class Principal {
    constructor(data) {
        this.id = data.id;
        this.type = data.type; // 'user' or 'service'
        this.name = data.name;
        this.roles = data.roles || [];
        this.tenant_id = data.tenant_id;
        this.permissions = data.permissions || [];
        this.created_at = data.created_at || new Date().toISOString();
    }
    hasRole(roleName) {
        return this.roles.includes(roleName);
    }
    hasPermission(permission) {
        // Direct permission grant
        if (this.permissions.includes(permission) ||
            this.permissions.includes('*') ||
            this.permissions.includes(permission.split(':')[0] + ':*')) {
            return true;
        }
        // Permission via role
        const permissionDef = PERMISSIONS[permission];
        if (!permissionDef) {
            return false;
        }
        return this.roles.some(role => permissionDef.roles.includes(role));
    }
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            roles: this.roles,
            tenant_id: this.tenant_id,
            permissions: this.permissions,
            created_at: this.created_at
        };
    }
}
/**
 * RBAC Manager
 */
class RBACManager {
    constructor() {
        this.principals = new Map();
        this.customRoles = new Map();
    }
    /**
     * Create a principal (user or service account)
     */
    createPrincipal(principalData) {
        const principal = new Principal(principalData);
        this.principals.set(principal.id, principal);
        return principal;
    }
    /**
     * Get principal by ID
     */
    getPrincipal(principalId) {
        return this.principals.get(principalId);
    }
    /**
     * Assign role to principal
     */
    assignRole(principalId, roleName) {
        const principal = this.getPrincipal(principalId);
        if (!principal) {
            throw new Error(`PRINCIPAL_NOT_FOUND: ${principalId}`);
        }
        if (!Object.values(ROLES).includes(roleName)) {
            throw new Error(`UNKNOWN_ROLE: ${roleName}`);
        }
        if (!principal.roles.includes(roleName)) {
            principal.roles.push(roleName);
        }
        return principal;
    }
    /**
     * Revoke role from principal
     */
    revokeRole(principalId, roleName) {
        const principal = this.getPrincipal(principalId);
        if (!principal) {
            throw new Error(`PRINCIPAL_NOT_FOUND: ${principalId}`);
        }
        principal.roles = principal.roles.filter(r => r !== roleName);
        return principal;
    }
    /**
     * Grant direct permission to principal
     */
    grantPermission(principalId, permission) {
        const principal = this.getPrincipal(principalId);
        if (!principal) {
            throw new Error(`PRINCIPAL_NOT_FOUND: ${principalId}`);
        }
        if (!principal.permissions.includes(permission)) {
            principal.permissions.push(permission);
        }
        return principal;
    }
    /**
     * Revoke direct permission from principal
     */
    revokePermission(principalId, permission) {
        const principal = this.getPrincipal(principalId);
        if (!principal) {
            throw new Error(`PRINCIPAL_NOT_FOUND: ${principalId}`);
        }
        principal.permissions = principal.permissions.filter(p => p !== permission);
        return principal;
    }
    /**
     * Check if principal has permission
     */
    checkPermission(principalId, permission) {
        const principal = this.getPrincipal(principalId);
        if (!principal) {
            return false;
        }
        return principal.hasPermission(permission);
    }
    /**
     * Enforce permission requirement
     */
    requirePermission(principalId, permission) {
        if (!this.checkPermission(principalId, permission)) {
            throw new Error(`PERMISSION_DENIED: ${principalId} does not have ${permission}`);
        }
    }
    /**
     * Create custom role
     */
    createRole(roleData) {
        const role = new Role(roleData);
        this.customRoles.set(role.role_id, role);
        return role;
    }
    /**
     * Get role definition
     */
    getRole(roleId) {
        return this.customRoles.get(roleId);
    }
    /**
     * List all principals
     */
    listPrincipals(filters = {}) {
        let principals = Array.from(this.principals.values());
        if (filters.type) {
            principals = principals.filter(p => p.type === filters.type);
        }
        if (filters.tenant_id) {
            principals = principals.filter(p => p.tenant_id === filters.tenant_id);
        }
        if (filters.role) {
            principals = principals.filter(p => p.hasRole(filters.role));
        }
        return principals;
    }
    /**
     * Get permissions for principal
     */
    getPrincipalPermissions(principalId) {
        const principal = this.getPrincipal(principalId);
        if (!principal) {
            return [];
        }
        const permissions = new Set(principal.permissions);
        // Add role-based permissions
        for (const role of principal.roles) {
            for (const [permission, def] of Object.entries(PERMISSIONS)) {
                if (def.roles.includes(role)) {
                    permissions.add(permission);
                }
            }
        }
        return Array.from(permissions);
    }
}
/**
 * Permission Enforcer
 */
class PermissionEnforcer {
    constructor(rbacManager) {
        this.rbacManager = rbacManager;
    }
    /**
     * Require permission for API call
     */
    requirePermission(principalId, permission) {
        this.rbacManager.requirePermission(principalId, permission);
    }
    /**
     * Check permission (returns boolean)
     */
    checkPermission(principalId, permission) {
        return this.rbacManager.checkPermission(principalId, permission);
    }
    /**
     * Require any of permissions
     */
    requireAnyPermission(principalId, permissions) {
        const hasAny = permissions.some(p => this.checkPermission(principalId, p));
        if (!hasAny) {
            throw new Error(`PERMISSION_DENIED: ${principalId} does not have any of [${permissions.join(', ')}]`);
        }
    }
    /**
     * Require all permissions
     */
    requireAllPermissions(principalId, permissions) {
        for (const permission of permissions) {
            this.requirePermission(principalId, permission);
        }
    }
}
/**
 * Global RBAC manager instance
 */
let globalRBACManager = null;
function getRBACManager() {
    if (!globalRBACManager) {
        globalRBACManager = new RBACManager();
    }
    return globalRBACManager;
}
module.exports = {
    ROLES,
    PERMISSIONS,
    Role,
    Principal,
    RBACManager,
    PermissionEnforcer,
    getRBACManager
};
//# sourceMappingURL=rbac.js.map