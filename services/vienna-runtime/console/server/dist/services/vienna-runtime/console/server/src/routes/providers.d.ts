/**
 * Provider Routes
 *
 * Model provider status and health.
 */
import { Router } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { ProviderHealthService } from '../services/providerHealthService.js';
export declare function createProvidersRouter(vienna: ViennaRuntimeService, providerHealthService?: ProviderHealthService): Router;
//# sourceMappingURL=providers.d.ts.map