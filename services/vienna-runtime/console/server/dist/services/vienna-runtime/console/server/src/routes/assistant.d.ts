/**
 * Assistant Status Routes
 * Phase 1: State Truth Model
 *
 * Provides unified assistant availability status (separate from provider health)
 */
import { Router } from 'express';
import type { ProviderHealthService } from '../services/providerHealthService.js';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
export type AssistantUnavailableReason = 'provider_cooldown' | 'runtime_degraded' | 'no_providers' | 'service_unavailable';
export interface AssistantStatusResponse {
    available: boolean;
    reason: AssistantUnavailableReason | null;
    cooldown_until: string | null;
    providers: Record<string, string>;
    degraded: boolean;
    timestamp: string;
}
export declare function createAssistantRouter(vienna: ViennaRuntimeService, providerHealthService?: ProviderHealthService): Router;
//# sourceMappingURL=assistant.d.ts.map