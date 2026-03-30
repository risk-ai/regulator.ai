/**
 * Action Types Routes
 *
 * Custom Action Type Registry for Vienna OS.
 * Allows operators to define ANY action type beyond the preset 11.
 *
 * GET    /api/v1/action-types              — List all (filterable by category, enabled)
 * GET    /api/v1/action-types/categories   — List all categories
 * POST   /api/v1/action-types/validate     — Validate payload against schema
 * GET    /api/v1/action-types/:id          — Get single with usage stats
 * POST   /api/v1/action-types              — Create custom action type
 * PUT    /api/v1/action-types/:id          — Update (builtins: enabled toggle only)
 * DELETE /api/v1/action-types/:id          — Delete (custom only)
 * GET    /api/v1/action-types/:id/usage    — Usage history
 */
import { Router } from 'express';
export declare function createActionTypesRouter(): Router;
//# sourceMappingURL=action-types.d.ts.map