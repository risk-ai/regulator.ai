/**
 * Tenant-Scoped Policies Routes
 *
 * SECURITY: All routes filter by tenant_id for data isolation
 *
 * GET    /api/v1/policies        - List tenant's policies
 * POST   /api/v1/policies        - Create new policy
 * GET    /api/v1/policies/:id    - Get policy details
 * PUT    /api/v1/policies/:id    - Update policy
 * DELETE /api/v1/policies/:id    - Delete policy
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=policies-tenant.d.ts.map