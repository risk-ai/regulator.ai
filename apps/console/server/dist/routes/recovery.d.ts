/**
 * Recovery Routes (Phase 6.5)
 *
 * Operator recovery copilot interface.
 * Provides diagnostic intelligence and recovery proposals.
 *
 * Design constraints:
 * - AI explains, runtime executes, operator approves
 * - No autonomous recovery execution
 * - Recovery copilot = diagnostic intelligence + proposals
 */
import { Router } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
export declare function createRecoveryRouter(vienna: ViennaRuntimeService): Router;
//# sourceMappingURL=recovery.d.ts.map