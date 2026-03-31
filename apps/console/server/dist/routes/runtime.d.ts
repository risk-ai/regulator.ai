/**
 * Runtime Routes
 *
 * Real-time execution visibility for Envelope Visualizer.
 * Shows envelope state, dependencies, warrants, verification.
 */
import { Router } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { RuntimeStatsService } from '../services/runtimeStatsService.js';
export declare function createRuntimeRouter(vienna: ViennaRuntimeService, statsService?: RuntimeStatsService): Router;
//# sourceMappingURL=runtime.d.ts.map