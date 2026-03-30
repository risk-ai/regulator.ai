/**
 * Intent Routes
 *
 * Phase 11: Canonical action ingress for Vienna OS
 * All operator actions should route through Intent Gateway
 *
 * Enhanced: Dynamic action type lookup from action_types table.
 * Unknown action types are rejected; disabled ones return 403.
 */
import { Router } from 'express';
export declare function createIntentRouter(): Router;
//# sourceMappingURL=intent.d.ts.map