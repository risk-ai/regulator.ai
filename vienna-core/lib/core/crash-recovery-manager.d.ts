/**
 * Crash Recovery Manager
 * Phase 6C: System Hardening
 *
 * Ensures Vienna can recover safely after runtime crash or unexpected shutdown.
 *
 * Features:
 * - Scan execution queue on startup
 * - Detect envelopes stuck in EXECUTING state
 * - Reconcile execution state
 * - Retry or mark failed safely
 * - Crash recovery reporting
 */
export class CrashRecoveryManager {
    constructor(options?: {});
    executionQueue: any;
    deadLetterQueue: any;
    eventEmitter: any;
    maxRecoveryRetries: any;
    orphanedExecutionThresholdMs: any;
    enableAutomaticRecovery: boolean;
    lastRecoveryRun: string;
    recoveryStats: {
        total_runs: number;
        last_run: any;
        orphaned_detected: number;
        retried: number;
        failed: number;
        abandoned: number;
    };
    /**
     * Set dependencies (injected by ViennaCore)
     */
    setDependencies(executionQueue: any, deadLetterQueue: any, eventEmitter: any): void;
    /**
     * Run crash recovery on startup
     *
     * @returns {Promise<object>} Recovery report
     */
    runRecovery(): Promise<object>;
    /**
     * Check if an execution is orphaned (stuck due to crash)
     *
     * @param {object} entry - Queue entry
     * @returns {boolean} True if orphaned
     */
    isOrphanedExecution(entry: object): boolean;
    /**
     * Recover an orphaned envelope
     *
     * @param {object} entry - Queue entry
     * @returns {Promise<object>} Recovery action taken
     */
    recoverOrphanedEnvelope(entry: object): Promise<object>;
    /**
     * Validate queue consistency (detect anomalies)
     *
     * @returns {object} Validation result
     */
    validateQueueConsistency(): object;
    /**
     * Get recovery statistics
     */
    getStats(): {
        automatic_recovery_enabled: boolean;
        max_recovery_retries: any;
        orphaned_threshold_ms: any;
        total_runs: number;
        last_run: any;
        orphaned_detected: number;
        retried: number;
        failed: number;
        abandoned: number;
    };
    /**
     * Emit recovery event
     */
    emitRecoveryEvent(eventType: any, data: any): void;
}
//# sourceMappingURL=crash-recovery-manager.d.ts.map