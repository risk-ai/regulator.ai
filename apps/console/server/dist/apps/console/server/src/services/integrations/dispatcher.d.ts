/**
 * Integration Dispatcher — Vienna OS
 *
 * Dispatches governance events to matching integrations in parallel.
 * Handles logging, circuit breaking, and failure tracking.
 */
import type { IntegrationEvent } from './types.js';
/**
 * Dispatch a governance event to all matching integrations
 */
export declare function dispatchEvent(event: IntegrationEvent): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{
        integration_id: string;
        name: string;
        type: string;
        success: boolean;
        error?: string;
    }>;
}>;
/**
 * Reset circuit breaker for an integration (re-enable after fixing)
 */
export declare function resetCircuitBreaker(integrationId: string): Promise<void>;
/**
 * Get dispatch statistics for an integration
 */
export declare function getIntegrationStats(integrationId: string): Promise<{
    total_events: number;
    success_count: number;
    failure_count: number;
    avg_latency_ms: number;
}>;
//# sourceMappingURL=dispatcher.d.ts.map