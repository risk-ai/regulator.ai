/**
 * Service Management Routes
 *
 * System service status and control.
 * Service restarts route through Vienna Core governance.
 *
 * AUTHORITY BOUNDARY:
 * - This route calls ViennaRuntimeService only
 * - ViennaRuntimeService creates governed recovery objectives
 * - Never call service adapters directly
 */
import { Router } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
export declare function createServicesRouter(vienna: ViennaRuntimeService): Router;
//# sourceMappingURL=services.d.ts.map