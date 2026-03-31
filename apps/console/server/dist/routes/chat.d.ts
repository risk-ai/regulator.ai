/**
 * Chat Routes
 *
 * Operator chat interface to Vienna.
 * Phase 6.6: Routes general chat through LLM providers.
 *
 * AUTHORITY BOUNDARY:
 * - This route calls ViennaRuntimeService directly for Phase 6.6
 * - ViennaRuntimeService calls Vienna Core
 * - Never import adapters here
 */
import { Router } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
export declare function createChatRouter(vienna: ViennaRuntimeService, providerHealthService?: any): Router;
//# sourceMappingURL=chat.d.ts.map