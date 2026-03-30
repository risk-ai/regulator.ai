export namespace ROLES {
    let OPERATOR: string;
    let APPROVER: string;
    let AUDITOR: string;
    let SERVICE_AGENT: string;
    let PLATFORM_ADMIN: string;
}
/**
 * Permission Definitions
 */
export const PERMISSIONS: {
    'intent:submit': {
        roles: string[];
    };
    'intent:read': {
        roles: string[];
    };
    'intent:list': {
        roles: string[];
    };
    'plan:create': {
        roles: string[];
    };
    'plan:read': {
        roles: string[];
    };
    'plan:list': {
        roles: string[];
    };
    'plan:update': {
        roles: string[];
    };
    'plan:cancel': {
        roles: string[];
    };
    'approval:request': {
        roles: string[];
    };
    'approval:read': {
        roles: string[];
    };
    'approval:list': {
        roles: string[];
    };
    'approval:grant': {
        roles: string[];
    };
    'approval:deny': {
        roles: string[];
    };
    'execution:execute': {
        roles: string[];
    };
    'execution:read': {
        roles: string[];
    };
    'execution:list': {
        roles: string[];
    };
    'execution:cancel': {
        roles: string[];
    };
    'verification:read': {
        roles: string[];
    };
    'verification:list': {
        roles: string[];
    };
    'ledger:query': {
        roles: string[];
    };
    'ledger:read': {
        roles: string[];
    };
    'ledger:export': {
        roles: string[];
    };
    'node:register': {
        roles: string[];
    };
    'node:read': {
        roles: string[];
    };
    'node:list': {
        roles: string[];
    };
    'node:update': {
        roles: string[];
    };
    'node:deregister': {
        roles: string[];
    };
    'lock:acquire': {
        roles: string[];
    };
    'lock:release': {
        roles: string[];
    };
    'lock:read': {
        roles: string[];
    };
    'tenant:create': {
        roles: string[];
    };
    'tenant:read': {
        roles: string[];
    };
    'tenant:update': {
        roles: string[];
    };
    'tenant:delete': {
        roles: string[];
    };
    'plugin:register': {
        roles: string[];
    };
    'plugin:load': {
        roles: string[];
    };
    'plugin:unload': {
        roles: string[];
    };
    'plugin:execute': {
        roles: string[];
    };
};
/**
 * Role Model
 */
export class Role {
    constructor(data: any);
    role_id: any;
    name: any;
    permissions: any;
    tenant_scope: any;
    created_at: any;
    hasPermission(permission: any): any;
    toJSON(): {
        role_id: any;
        name: any;
        permissions: any;
        tenant_scope: any;
        created_at: any;
    };
}
/**
 * Principal (User or Service Account)
 */
export class Principal {
    constructor(data: any);
    id: any;
    type: any;
    name: any;
    roles: any;
    tenant_id: any;
    permissions: any;
    created_at: any;
    hasRole(roleName: any): any;
    hasPermission(permission: any): any;
    toJSON(): {
        id: any;
        type: any;
        name: any;
        roles: any;
        tenant_id: any;
        permissions: any;
        created_at: any;
    };
}
/**
 * RBAC Manager
 */
export class RBACManager {
    principals: Map<any, any>;
    customRoles: Map<any, any>;
    /**
     * Create a principal (user or service account)
     */
    createPrincipal(principalData: any): Principal;
    /**
     * Get principal by ID
     */
    getPrincipal(principalId: any): any;
    /**
     * Assign role to principal
     */
    assignRole(principalId: any, roleName: any): any;
    /**
     * Revoke role from principal
     */
    revokeRole(principalId: any, roleName: any): any;
    /**
     * Grant direct permission to principal
     */
    grantPermission(principalId: any, permission: any): any;
    /**
     * Revoke direct permission from principal
     */
    revokePermission(principalId: any, permission: any): any;
    /**
     * Check if principal has permission
     */
    checkPermission(principalId: any, permission: any): any;
    /**
     * Enforce permission requirement
     */
    requirePermission(principalId: any, permission: any): void;
    /**
     * Create custom role
     */
    createRole(roleData: any): Role;
    /**
     * Get role definition
     */
    getRole(roleId: any): any;
    /**
     * List all principals
     */
    listPrincipals(filters?: {}): any[];
    /**
     * Get permissions for principal
     */
    getPrincipalPermissions(principalId: any): any[];
}
/**
 * Permission Enforcer
 */
export class PermissionEnforcer {
    constructor(rbacManager: any);
    rbacManager: any;
    /**
     * Require permission for API call
     */
    requirePermission(principalId: any, permission: any): void;
    /**
     * Check permission (returns boolean)
     */
    checkPermission(principalId: any, permission: any): any;
    /**
     * Require any of permissions
     */
    requireAnyPermission(principalId: any, permissions: any): void;
    /**
     * Require all permissions
     */
    requireAllPermissions(principalId: any, permissions: any): void;
}
export function getRBACManager(): any;
//# sourceMappingURL=rbac.d.ts.map