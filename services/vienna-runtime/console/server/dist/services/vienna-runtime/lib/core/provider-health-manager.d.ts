/**
 * Provider Health Manager
 * Phase 6B: Provider Health Enforcement
 *
 * Makes provider health authoritative - blocks execution on unhealthy providers.
 *
 * Features:
 * - Provider quarantine after consecutive failures
 * - Cooldown timers before recovery attempts
 * - Health gating before execution
 * - Provider recovery tracking
 * - Structured health events
 */
export class ProviderHealthManager {
    constructor(options?: {});
    maxConsecutiveFailures: any;
    quarantineDurationMs: any;
    cooldownDurationMs: any;
    healthCheckIntervalMs: any;
    staleTelemetryThresholdMs: any;
    providers: Map<any, any>;
    quarantined: Set<any>;
    eventEmitter: any;
    stateGraph: any;
    stateGraphWritesEnabled: boolean;
    healthCheckTimer: NodeJS.Timeout;
    running: boolean;
    /**
     * Set event emitter for health events
     */
    setEventEmitter(emitter: any): void;
    /**
     * Set State Graph for persistent storage (Phase 7.2)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {boolean} writesEnabled - Enable State Graph writes (default: false)
     */
    setStateGraph(stateGraph: StateGraph, writesEnabled?: boolean): void;
    /**
     * Write provider state to State Graph (Phase 7.2 Stage 2)
     *
     * Non-blocking: logs and continues on failure.
     * Idempotent: safe to call repeatedly with same data.
     *
     * @param {string} name - Provider name
     * @param {object} state - Provider health state
     */
    _writeProviderState(name: string, state: object): Promise<void>;
    /**
     * Map internal status to State Graph status enum
     */
    _mapStateToStatus(status: any): any;
    /**
     * Map internal status to State Graph health enum
     */
    _mapStateToHealth(status: any): any;
    /**
     * Register a provider for health management
     *
     * @param {string} name - Provider name
     * @param {object} provider - Provider instance
     */
    registerProvider(name: string, provider: object): void;
    /**
     * Start health monitoring
     */
    start(): void;
    /**
     * Stop health monitoring
     */
    stop(): void;
    /**
     * Reconcile State Graph with actual provider health (Phase 7.2 Stage 2)
     *
     * Called on startup to ensure State Graph matches current provider state.
     * Runs fresh health checks and writes results.
     */
    reconcileStateGraph(): Promise<void>;
    /**
     * Run health checks on all providers
     */
    runHealthChecks(): Promise<void>;
    /**
     * Check if a provider can be used for execution
     *
     * @param {string} name - Provider name
     * @returns {object} Availability check result
     */
    checkAvailability(name: string): object;
    /**
     * Record successful provider operation
     *
     * @param {string} name - Provider name
     * @param {number} latencyMs - Operation latency (optional)
     */
    recordSuccess(name: string, latencyMs?: number): Promise<void>;
    /**
     * Record provider failure
     *
     * @param {string} name - Provider name
     * @param {Error} error - Error details
     */
    recordFailure(name: string, error: Error): Promise<void>;
    /**
     * Quarantine a provider after repeated failures
     *
     * @param {string} name - Provider name
     */
    quarantineProvider(name: string): Promise<void>;
    /**
     * Attempt to recover a quarantined provider
     *
     * @param {string} name - Provider name
     */
    attemptRecovery(name: string): Promise<void>;
    /**
     * Check if provider is quarantined
     */
    isQuarantined(name: any): boolean;
    /**
     * Check if quarantine has expired
     */
    hasQuarantineExpired(name: any): boolean;
    /**
     * Check if provider is in cooldown
     */
    isInCooldown(name: any): boolean;
    /**
     * Check if provider has stale telemetry
     */
    hasStaleTelemetry(name: any): boolean;
    /**
     * Check all providers for stale telemetry
     */
    checkStaleTelemetry(): void;
    /**
     * Get health status for a provider
     */
    getHealth(name: any): {
        provider: any;
        status: any;
        consecutive_failures: any;
        consecutive_successes: any;
        last_health_check: any;
        last_success: any;
        last_failure: any;
        quarantined: boolean;
        quarantine_until: any;
        cooldown_until: any;
        in_cooldown: boolean;
        stale_telemetry: boolean;
        total_requests: any;
        total_successes: any;
        total_failures: any;
        error_rate: number;
    };
    /**
     * Get health for all providers
     */
    getAllHealth(): {};
    /**
     * Emit provider health event
     */
    emitProviderEvent(eventType: any, data: any): void;
    /**
     * Get runtime health summary
     */
    getRuntimeHealth(): {
        total_providers: number;
        healthy_count: number;
        degraded_count: number;
        quarantined_count: number;
        unknown_count: number;
        runtime_status: string;
    };
    /**
     * Determine overall runtime status
     */
    getRuntimeStatus(providers: any): "degraded" | "critical" | "no_providers" | "operational";
}
//# sourceMappingURL=provider-health-manager.d.ts.map