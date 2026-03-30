/**
 * Tenant-Scoped Agents Routes
 *
 * SECURITY: All routes filter by tenant_id for data isolation
 *
 * GET    /api/v1/agents          - List tenant's agents
 * POST   /api/v1/agents          - Register new agent
 * GET    /api/v1/agents/:id      - Get agent details
 * POST   /api/v1/agents/:id/heartbeat - Agent heartbeat
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=agents-tenant.d.ts.map