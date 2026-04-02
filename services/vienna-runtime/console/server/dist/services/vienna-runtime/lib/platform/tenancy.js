/**
 * Vienna Tenancy and Workspace Isolation
 *
 * Multi-tenant data isolation and workspace boundaries.
 */
const { getStateGraph } = require('../state/state-graph');
/**
 * Tenant Model
 */
class Tenant {
    constructor(data) {
        this.tenant_id = data.tenant_id;
        this.name = data.name;
        this.status = data.status || 'active';
        this.created_at = data.created_at || new Date().toISOString();
        this.metadata = data.metadata || {};
        this.resource_limits = data.resource_limits || {};
        this.policy_scope = data.policy_scope || 'tenant';
    }
    toJSON() {
        return {
            tenant_id: this.tenant_id,
            name: this.name,
            status: this.status,
            created_at: this.created_at,
            metadata: this.metadata,
            resource_limits: this.resource_limits,
            policy_scope: this.policy_scope
        };
    }
}
/**
 * Workspace Model
 */
class Workspace {
    constructor(data) {
        this.workspace_id = data.workspace_id;
        this.tenant_id = data.tenant_id;
        this.name = data.name;
        this.type = data.type || 'default'; // default, investigation, project
        this.status = data.status || 'active';
        this.created_at = data.created_at || new Date().toISOString();
        this.metadata = data.metadata || {};
    }
    toJSON() {
        return {
            workspace_id: this.workspace_id,
            tenant_id: this.tenant_id,
            name: this.name,
            type: this.type,
            status: this.status,
            created_at: this.created_at,
            metadata: this.metadata
        };
    }
}
/**
 * Tenancy Manager
 */
class TenancyManager {
    constructor() {
        this.stateGraph = getStateGraph();
    }
    /**
     * Create a new tenant
     */
    async createTenant(tenantData) {
        const tenant = new Tenant({
            tenant_id: tenantData.tenant_id || this._generateTenantId(),
            ...tenantData
        });
        // Store in State Graph
        await this.stateGraph.db.run(`INSERT INTO tenants (tenant_id, name, status, created_at, metadata, resource_limits, policy_scope)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            tenant.tenant_id,
            tenant.name,
            tenant.status,
            tenant.created_at,
            JSON.stringify(tenant.metadata),
            JSON.stringify(tenant.resource_limits),
            tenant.policy_scope
        ]);
        return tenant;
    }
    /**
     * Get tenant by ID
     */
    async getTenant(tenantId) {
        const row = await this.stateGraph.db.get('SELECT * FROM tenants WHERE tenant_id = ?', [tenantId]);
        if (!row) {
            return null;
        }
        return new Tenant({
            tenant_id: row.tenant_id,
            name: row.name,
            status: row.status,
            created_at: row.created_at,
            metadata: JSON.parse(row.metadata || '{}'),
            resource_limits: JSON.parse(row.resource_limits || '{}'),
            policy_scope: row.policy_scope
        });
    }
    /**
     * List tenants
     */
    async listTenants(filters = {}) {
        let query = 'SELECT * FROM tenants WHERE 1=1';
        const params = [];
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        const rows = await this.stateGraph.db.all(query, params);
        return rows.map(row => new Tenant({
            tenant_id: row.tenant_id,
            name: row.name,
            status: row.status,
            created_at: row.created_at,
            metadata: JSON.parse(row.metadata || '{}'),
            resource_limits: JSON.parse(row.resource_limits || '{}'),
            policy_scope: row.policy_scope
        }));
    }
    /**
     * Update tenant
     */
    async updateTenant(tenantId, updates) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`TENANT_NOT_FOUND: ${tenantId}`);
        }
        const setClauses = [];
        const params = [];
        if (updates.name) {
            setClauses.push('name = ?');
            params.push(updates.name);
        }
        if (updates.status) {
            setClauses.push('status = ?');
            params.push(updates.status);
        }
        if (updates.metadata) {
            setClauses.push('metadata = ?');
            params.push(JSON.stringify(updates.metadata));
        }
        if (updates.resource_limits) {
            setClauses.push('resource_limits = ?');
            params.push(JSON.stringify(updates.resource_limits));
        }
        if (updates.policy_scope) {
            setClauses.push('policy_scope = ?');
            params.push(updates.policy_scope);
        }
        params.push(tenantId);
        await this.stateGraph.db.run(`UPDATE tenants SET ${setClauses.join(', ')} WHERE tenant_id = ?`, params);
        return await this.getTenant(tenantId);
    }
    /**
     * Create a workspace
     */
    async createWorkspace(workspaceData) {
        // Validate tenant exists
        const tenant = await this.getTenant(workspaceData.tenant_id);
        if (!tenant) {
            throw new Error(`TENANT_NOT_FOUND: ${workspaceData.tenant_id}`);
        }
        const workspace = new Workspace({
            workspace_id: workspaceData.workspace_id || this._generateWorkspaceId(),
            ...workspaceData
        });
        await this.stateGraph.db.run(`INSERT INTO workspaces (workspace_id, tenant_id, name, type, status, created_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            workspace.workspace_id,
            workspace.tenant_id,
            workspace.name,
            workspace.type,
            workspace.status,
            workspace.created_at,
            JSON.stringify(workspace.metadata)
        ]);
        return workspace;
    }
    /**
     * Get workspace by ID
     */
    async getWorkspace(workspaceId) {
        const row = await this.stateGraph.db.get('SELECT * FROM workspaces WHERE workspace_id = ?', [workspaceId]);
        if (!row) {
            return null;
        }
        return new Workspace({
            workspace_id: row.workspace_id,
            tenant_id: row.tenant_id,
            name: row.name,
            type: row.type,
            status: row.status,
            created_at: row.created_at,
            metadata: JSON.parse(row.metadata || '{}')
        });
    }
    /**
     * List workspaces for a tenant
     */
    async listWorkspaces(tenantId, filters = {}) {
        let query = 'SELECT * FROM workspaces WHERE tenant_id = ?';
        const params = [tenantId];
        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        const rows = await this.stateGraph.db.all(query, params);
        return rows.map(row => new Workspace({
            workspace_id: row.workspace_id,
            tenant_id: row.tenant_id,
            name: row.name,
            type: row.type,
            status: row.status,
            created_at: row.created_at,
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }
    /**
     * Enforce tenant boundary
     */
    enforceTenantBoundary(entity, expectedTenantId) {
        if (!entity) {
            throw new Error('ENTITY_NOT_FOUND');
        }
        if (entity.tenant_id !== expectedTenantId) {
            throw new Error(`TENANT_BOUNDARY_VIOLATION: Entity belongs to tenant ${entity.tenant_id}, expected ${expectedTenantId}`);
        }
    }
    /**
     * Check if tenant has access to resource
     */
    async checkAccess(tenantId, resourceType, resourceId) {
        // Implementation depends on resource type
        switch (resourceType) {
            case 'plan':
                const plan = await this.stateGraph.getPlan(resourceId);
                return plan && plan.tenant_id === tenantId;
            case 'execution':
                const execution = await this.stateGraph.getExecution(resourceId);
                return execution && execution.tenant_id === tenantId;
            case 'workspace':
                const workspace = await this.getWorkspace(resourceId);
                return workspace && workspace.tenant_id === tenantId;
            default:
                throw new Error(`UNKNOWN_RESOURCE_TYPE: ${resourceType}`);
        }
    }
    /**
     * Generate tenant ID
     */
    _generateTenantId() {
        return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate workspace ID
     */
    _generateWorkspaceId() {
        return `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
/**
 * Tenant Isolation Enforcer
 */
class TenantIsolationEnforcer {
    /**
     * Add tenant_id to all State Graph queries
     */
    static enforceTenantFilter(query, tenantId) {
        if (!query.tenant_id) {
            query.tenant_id = tenantId;
        }
        else if (query.tenant_id !== tenantId) {
            throw new Error('TENANT_MISMATCH: Query tenant_id does not match session tenant_id');
        }
        return query;
    }
    /**
     * Validate tenant_id on entity creation
     */
    static validateTenantId(entity, expectedTenantId) {
        if (!entity.tenant_id) {
            throw new Error('MISSING_TENANT_ID: Entity must have tenant_id');
        }
        if (entity.tenant_id !== expectedTenantId) {
            throw new Error(`TENANT_MISMATCH: Entity tenant_id ${entity.tenant_id} does not match expected ${expectedTenantId}`);
        }
    }
    /**
     * Filter results by tenant
     */
    static filterByTenant(results, tenantId) {
        return results.filter(r => r.tenant_id === tenantId);
    }
}
/**
 * Global tenancy manager instance
 */
let globalTenancyManager = null;
function getTenancyManager() {
    if (!globalTenancyManager) {
        globalTenancyManager = new TenancyManager();
    }
    return globalTenancyManager;
}
module.exports = {
    Tenant,
    Workspace,
    TenancyManager,
    TenantIsolationEnforcer,
    getTenancyManager
};
//# sourceMappingURL=tenancy.js.map