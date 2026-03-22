/**
 * Runtime Integrity Guard
 * Phase 6E: System Hardening
 *
 * Continuous runtime sanity checks to detect anomalies.
 *
 * Monitors:
 * - Queue depth mismatches
 * - Executor stalls
 * - DLQ growth spikes
 * - Event emitter failures
 * - Memory pressure
 * - Provider outages
 *
 * Behavior:
 * - Emit alerts on anomalies
 * - Mark runtime degraded when issues detected
 * - Surface alerts in Now view
 */
export class RuntimeIntegrityGuard {
    constructor(options?: {});
    enabled: boolean;
    checkIntervalMs: any;
    queueDepthThreshold: any;
    dlqGrowthThreshold: any;
    executorStallThresholdMs: any;
    memoryThresholdMB: any;
    executionQueue: any;
    deadLetterQueue: any;
    eventEmitter: any;
    logger: any;
    providerHealthManager: any;
    lastCheck: string;
    lastQueueDepth: number;
    lastDLQSize: number;
    lastExecutingEnvelopeId: any;
    lastExecutingTimestamp: any;
    checkTimer: NodeJS.Timeout;
    running: boolean;
    anomalies: any[];
    runtimeStatus: string;
    /**
     * Set dependencies (injected by ViennaCore)
     */
    setDependencies(executionQueue: any, deadLetterQueue: any, eventEmitter: any, logger: any, providerHealthManager: any): void;
    /**
     * Start integrity monitoring
     */
    start(): void;
    /**
     * Stop integrity monitoring
     */
    stop(): void;
    /**
     * Run all integrity checks
     */
    runChecks(): void;
    /**
     * Check for queue depth anomalies
     */
    _checkQueueDepth(): void;
    /**
     * Check for executor stall
     */
    _checkExecutorStall(): void;
    /**
     * Check for DLQ growth spike
     */
    _checkDLQGrowth(): void;
    /**
     * Check event emitter health
     */
    _checkEventEmitter(): void;
    /**
     * Check for memory pressure
     */
    _checkMemoryPressure(): void;
    /**
     * Check provider health status
     */
    _checkProviderHealth(): void;
    /**
     * Update runtime status based on anomalies
     */
    _updateRuntimeStatus(): void;
    /**
     * Emit alert for anomaly
     */
    _emitAlert(anomaly: any): void;
    /**
     * Get current runtime status
     */
    getRuntimeStatus(): {
        status: string;
        last_check: string;
        anomalies: any[];
        checks_enabled: boolean;
        check_interval_ms: any;
    };
    /**
     * Get statistics
     */
    getStats(): {
        enabled: boolean;
        running: boolean;
        last_check: string;
        runtime_status: string;
        current_anomalies: number;
        check_interval_ms: any;
        last_queue_depth: number;
        last_dlq_size: number;
    };
}
//# sourceMappingURL=runtime-integrity-guard.d.ts.map