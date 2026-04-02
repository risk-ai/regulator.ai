/**
 * Provider Health Service
 * Phase 5D: Provider Health Truthfulness
 *
 * Derives provider health from runtime metrics, not config.
 * Tracks health transitions and enforces truthfulness principles.
 */
import type { ProviderHealth as LibProviderHealth, ProviderHealthTransition } from '../../../../lib/providers/types.js';
import type { ProviderManagerBridge } from '../integrations/providerManager.js';
export type ProviderHealthState = 'healthy' | 'degraded' | 'unavailable' | 'unknown';
/**
 * Enhanced provider health with runtime metrics
 */
export interface ProviderHealthDetail extends LibProviderHealth {
    metrics: {
        requestCount: number;
        failureCount: number;
        timeoutCount: number;
        avgLatencyMs: number;
        successRate: number;
    };
    activeExecutions: number;
    staleTelemetry: boolean;
    lastErrorMessage?: string;
    transitions: ProviderHealthTransition[];
}
/**
 * Provider health aggregation
 */
export interface ProvidersHealthSnapshot {
    timestamp: string;
    providers: Record<string, ProviderHealthDetail>;
    degraded: boolean;
    degradedReasons?: string[];
}
/**
 * Provider Health Service
 *
 * TRUTHFULNESS PRINCIPLES:
 * - Show "unknown" when evidence insufficient
 * - Show "degraded" when reachable but unhealthy
 * - Show "unavailable" when checks fail
 * - Never show "healthy" from stale/missing data
 */
export declare class ProviderHealthService {
    private providerManager?;
    private executionHistory;
    private healthTransitions;
    private activeExecutions;
    private maxHistoryPerProvider;
    private maxTransitionsPerProvider;
    private staleTelemetryThresholdMs;
    constructor(providerManager?: ProviderManagerBridge);
    /**
     * Get comprehensive health snapshot for all providers
     */
    getProvidersHealth(): Promise<ProvidersHealthSnapshot>;
    /**
     * Get detailed health for specific provider
     */
    getProviderHealth(providerName: string): Promise<ProviderHealthDetail | null>;
    /**
     * Calculate provider health from runtime metrics
     *
     * TRUTHFULNESS RULES:
     * - Unknown: no recent executions AND no base status
     * - Unavailable: base status unavailable OR >50% failures OR in cooldown
     * - Degraded: >20% failures OR high latency OR recent failures
     * - Healthy: active success with acceptable metrics
     */
    private calculateProviderHealth;
    /**
     * Record provider execution
     */
    recordExecution(execution: {
        provider: string;
        success: boolean;
        durationMs: number;
        timeout?: boolean;
        errorMessage?: string;
    }): void;
    /**
     * Record start of execution (for active execution tracking)
     */
    recordExecutionStart(provider: string): void;
    /**
     * Record end of execution (for active execution tracking)
     */
    recordExecutionEnd(provider: string): void;
    /**
     * Record health transition
     */
    private recordTransition;
    /**
     * Get current status for provider (for transition tracking)
     */
    private getCurrentStatus;
    /**
     * Get transition reason
     */
    private getTransitionReason;
    /**
     * Cleanup old execution records
     */
    cleanup(maxAgeMs?: number): void;
}
//# sourceMappingURL=providerHealthService.d.ts.map