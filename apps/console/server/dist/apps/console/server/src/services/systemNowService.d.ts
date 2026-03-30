/**
 * System "Now" Service
 * Phase 5E: Operator "Now" View
 *
 * Aggregates current execution state from all observability layers.
 * Answers: What is happening right now? What needs attention?
 */
import type { SystemNowSnapshot, ActivityEvent } from '../types/systemNow.js';
import type { ViennaRuntimeService } from './viennaRuntime.js';
import type { RuntimeStatsService } from './runtimeStatsService.js';
import type { ProviderHealthService } from './providerHealthService.js';
import type { ObjectivesService } from './objectivesService.js';
/**
 * Configuration for attention thresholds
 */
interface AttentionConfig {
    queueCapacityThreshold: number;
    stalledExecutionMs: number;
    retryLoopThreshold: number;
    deadLetterGrowthWindow: number;
    failureRateThreshold: number;
}
export declare class SystemNowService {
    private viennaRuntime;
    private runtimeStats;
    private providerHealth?;
    private objectivesService?;
    private config;
    private recentEvents;
    private maxEventHistory;
    private lastEventAt?;
    private sseConnected;
    constructor(viennaRuntime: ViennaRuntimeService, runtimeStats: RuntimeStatsService, providerHealth?: ProviderHealthService, objectivesService?: ObjectivesService, config?: AttentionConfig);
    /**
     * Record SSE connection state
     */
    setSSEConnected(connected: boolean): void;
    /**
     * Record activity event
     */
    recordEvent(event: ActivityEvent): void;
    /**
     * Get unified "now" snapshot
     */
    getSystemNow(): Promise<SystemNowSnapshot>;
    /**
     * Get recent events with optional filtering
     */
    getRecentEventsFiltered(limit?: number, failuresOnly?: boolean): ActivityEvent[];
    /**
     * Get system state
     */
    private getSystemState;
    /**
     * Derive system state from runtime status
     */
    private deriveSystemState;
    /**
     * Get queue health snapshot
     */
    private getQueueHealth;
    /**
     * Get currently executing work
     */
    private getCurrentWork;
    /**
     * Get recent failures
     */
    private getRecentFailures;
    /**
     * Get dead letter statistics
     */
    private getDeadLetterStats;
    /**
     * Get provider health summary
     */
    private getProviderHealthSummary;
    /**
     * Get attention items
     */
    private getAttentionItems;
}
export {};
//# sourceMappingURL=systemNowService.d.ts.map