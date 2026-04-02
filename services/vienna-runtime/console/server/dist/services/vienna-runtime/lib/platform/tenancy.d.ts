/**
 * Tenant Model
 */
export class Tenant {
    constructor(data: any);
    tenant_id: any;
    name: any;
    status: any;
    created_at: any;
    metadata: any;
    resource_limits: any;
    policy_scope: any;
    toJSON(): {
        tenant_id: any;
        name: any;
        status: any;
        created_at: any;
        metadata: any;
        resource_limits: any;
        policy_scope: any;
    };
}
/**
 * Workspace Model
 */
export class Workspace {
    constructor(data: any);
    workspace_id: any;
    tenant_id: any;
    name: any;
    type: any;
    status: any;
    created_at: any;
    metadata: any;
    toJSON(): {
        workspace_id: any;
        tenant_id: any;
        name: any;
        type: any;
        status: any;
        created_at: any;
        metadata: any;
    };
}
/**
 * Tenancy Manager
 */
export class TenancyManager {
    stateGraph: any;
    /**
     * Create a new tenant
     */
    createTenant(tenantData: any): Promise<Tenant>;
    /**
     * Get tenant by ID
     */
    getTenant(tenantId: any): Promise<Tenant>;
    /**
     * List tenants
     */
    listTenants(filters?: {}): Promise<any>;
    /**
     * Update tenant
     */
    updateTenant(tenantId: any, updates: any): Promise<Tenant>;
    /**
     * Create a workspace
     */
    createWorkspace(workspaceData: any): Promise<Workspace>;
    /**
     * Get workspace by ID
     */
    getWorkspace(workspaceId: any): Promise<Workspace>;
    /**
     * List workspaces for a tenant
     */
    listWorkspaces(tenantId: any, filters?: {}): Promise<any>;
    /**
     * Enforce tenant boundary
     */
    enforceTenantBoundary(entity: any, expectedTenantId: any): void;
    /**
     * Check if tenant has access to resource
     */
    checkAccess(tenantId: any, resourceType: any, resourceId: any): Promise<boolean>;
    /**
     * Generate tenant ID
     */
    _generateTenantId(): string;
    /**
     * Generate workspace ID
     */
    _generateWorkspaceId(): string;
}
/**
 * Tenant Isolation Enforcer
 */
export class TenantIsolationEnforcer {
    /**
     * Add tenant_id to all State Graph queries
     */
    static enforceTenantFilter(query: any, tenantId: any): any;
    /**
     * Validate tenant_id on entity creation
     */
    static validateTenantId(entity: any, expectedTenantId: any): void;
    /**
     * Filter results by tenant
     */
    static filterByTenant(results: any, tenantId: any): any;
}
export function getTenancyManager(): any;
//# sourceMappingURL=tenancy.d.ts.map