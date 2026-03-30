/**
 * Reconciliation Service
 *
 * Read-only service for Phase 10 reconciliation visibility.
 * Provides execution leases, timeline, breakers, and metrics.
 */
export interface ExecutionLease {
    objective_id: string;
    attempt_id: string;
    generation: number;
    started_at: string;
    deadline_at: string;
    seconds_remaining: number;
}
export interface TimelineEvent {
    timestamp: string;
    objective_id: string;
    generation: number | null;
    event_type: string;
    summary: string;
    metadata?: any;
}
export interface CircuitBreaker {
    objective_id: string;
    consecutive_failures: number;
    policy_limit: number;
    reconciliation_status: string;
    cooldown_until: string | null;
    cooldown_remaining_seconds: number | null;
    last_failure_reason: string | null;
}
export interface ReconciliationMetrics {
    timeouts_per_hour: number;
    cooldown_entries_per_hour: number;
    degraded_transitions_per_hour: number;
    reconciliations_per_hour: number;
    avg_execution_duration_ms: number | null;
    max_execution_duration_ms: number | null;
    expired_deadlines: number;
    stale_completions_ignored: number;
}
export declare class ReconciliationService {
    private getStateGraph;
    constructor();
    private ensureStateGraph;
    /**
     * Get active execution leases
     *
     * Execution lease = remediation_started without matching remediation_completed
     * Deadline = started_at + execution_timeout (default 120s, Phase 10.3)
     */
    getExecutionLeases(): Promise<ExecutionLease[]>;
    /**
     * Get reconciliation timeline events
     *
     * Returns recent lifecycle events from managed_objective_history
     */
    getTimeline(limit?: number): Promise<{
        events: TimelineEvent[];
        total: number;
    }>;
    /**
     * Get circuit breaker status
     *
     * Returns objectives with consecutive_failures > 0
     */
    getCircuitBreakers(): Promise<CircuitBreaker[]>;
    /**
     * Get reconciliation metrics for observation window
     *
     * Aggregates events from last hour
     */
    getMetrics(): Promise<ReconciliationMetrics>;
    /**
     * Map internal transition type to human-readable event type
     */
    private mapEventType;
    /**
     * Generate human-readable summary from event
     */
    private generateEventSummary;
    /**
     * Get safe mode status
     */
    getSafeModeStatus(): Promise<any>;
    /**
     * Enable safe mode
     */
    enableSafeMode(reason: string, operator: string): Promise<any>;
    /**
     * Disable safe mode
     */
    disableSafeMode(operator: string): Promise<any>;
}
//# sourceMappingURL=reconciliationService.d.ts.map