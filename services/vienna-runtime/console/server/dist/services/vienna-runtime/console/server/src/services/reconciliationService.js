/**
 * Reconciliation Service
 *
 * Read-only service for Phase 10 reconciliation visibility.
 * Provides execution leases, timeline, breakers, and metrics.
 */
export class ReconciliationService {
    getStateGraph;
    constructor() {
        // Lazy load to avoid circular dependencies
        this.getStateGraph = null;
    }
    async ensureStateGraph() {
        if (!this.getStateGraph) {
            const module = await import('../../../../lib/state/state-graph.js');
            this.getStateGraph = module.getStateGraph;
        }
        return this.getStateGraph();
    }
    /**
     * Get active execution leases
     *
     * Execution lease = remediation_started without matching remediation_completed
     * Deadline = started_at + execution_timeout (default 120s, Phase 10.3)
     */
    async getExecutionLeases() {
        const stateGraph = await this.ensureStateGraph();
        // Query for remediation_started events without matching completion
        const query = `
      SELECT 
        objective_id,
        generation,
        event_timestamp as started_at,
        metadata
      FROM managed_objective_history
      WHERE transition_type = 'remediation_started'
      AND NOT EXISTS (
        SELECT 1 FROM managed_objective_history completion
        WHERE completion.objective_id = managed_objective_history.objective_id
        AND completion.generation = managed_objective_history.generation
        AND completion.transition_type IN ('remediation_completed', 'remediation_failed', 'execution_timed_out')
        AND completion.event_timestamp > managed_objective_history.event_timestamp
      )
      AND datetime(event_timestamp) > datetime('now', '-5 minutes')
      ORDER BY event_timestamp DESC
    `;
        const rows = await stateGraph.query(query);
        const DEFAULT_TIMEOUT_MS = 120000; // 120s default from Phase 10.3
        return rows.map((row) => {
            const startedAt = new Date(row.started_at);
            const deadlineAt = new Date(startedAt.getTime() + DEFAULT_TIMEOUT_MS);
            const nowMs = Date.now();
            const deadlineMs = deadlineAt.getTime();
            const secondsRemaining = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
            // Extract attempt_id from metadata if available
            let attemptId = 'unknown';
            if (row.metadata) {
                try {
                    const metadata = JSON.parse(row.metadata);
                    attemptId = metadata.execution_id || metadata.attempt_id || `exec-${row.generation}`;
                }
                catch (e) {
                    attemptId = `exec-${row.generation}`;
                }
            }
            return {
                objective_id: row.objective_id,
                attempt_id: attemptId,
                generation: row.generation,
                started_at: row.started_at,
                deadline_at: deadlineAt.toISOString(),
                seconds_remaining: secondsRemaining,
            };
        });
    }
    /**
     * Get reconciliation timeline events
     *
     * Returns recent lifecycle events from managed_objective_history
     */
    async getTimeline(limit = 100) {
        const stateGraph = await this.ensureStateGraph();
        const query = `
      SELECT 
        event_timestamp,
        objective_id,
        generation,
        transition_type,
        metadata,
        from_state,
        to_state
      FROM managed_objective_history
      ORDER BY event_timestamp DESC, created_at DESC, ROWID DESC
      LIMIT ?
    `;
        const rows = await stateGraph.query(query, [limit]);
        // Get total count
        const countResult = await stateGraph.query('SELECT COUNT(*) as total FROM managed_objective_history');
        const total = countResult[0]?.total || 0;
        const events = rows.map((row) => {
            return {
                timestamp: row.event_timestamp,
                objective_id: row.objective_id,
                generation: row.generation,
                event_type: this.mapEventType(row.transition_type),
                summary: this.generateEventSummary(row),
                metadata: row.metadata ? JSON.parse(row.metadata) : null,
            };
        });
        return { events, total };
    }
    /**
     * Get circuit breaker status
     *
     * Returns objectives with consecutive_failures > 0
     */
    async getCircuitBreakers() {
        const stateGraph = await this.ensureStateGraph();
        const query = `
      SELECT 
        objective_id,
        consecutive_failures,
        reconciliation_status,
        reconciliation_cooldown_until as cooldown_until,
        reconciliation_last_error as last_failure_reason
      FROM managed_objectives
      WHERE consecutive_failures > 0
      ORDER BY consecutive_failures DESC, objective_id
    `;
        const rows = await stateGraph.query(query);
        const DEFAULT_POLICY_LIMIT = 3; // Phase 10.2 default
        return rows.map((row) => {
            let cooldownRemainingSeconds = null;
            if (row.cooldown_until) {
                const cooldownUntil = new Date(row.cooldown_until).getTime();
                const nowMs = Date.now();
                cooldownRemainingSeconds = Math.max(0, Math.floor((cooldownUntil - nowMs) / 1000));
            }
            return {
                objective_id: row.objective_id,
                consecutive_failures: row.consecutive_failures,
                policy_limit: DEFAULT_POLICY_LIMIT,
                reconciliation_status: row.reconciliation_status,
                cooldown_until: row.cooldown_until,
                cooldown_remaining_seconds: cooldownRemainingSeconds,
                last_failure_reason: row.last_failure_reason,
            };
        });
    }
    /**
     * Get reconciliation metrics for observation window
     *
     * Aggregates events from last hour
     */
    async getMetrics() {
        const stateGraph = await this.ensureStateGraph();
        // Count events in last hour
        const hourAgo = new Date(Date.now() - 3600000).toISOString();
        const query = `
      SELECT 
        transition_type,
        COUNT(*) as count
      FROM managed_objective_history
      WHERE datetime(event_timestamp) > datetime(?)
      GROUP BY transition_type
    `;
        const rows = await stateGraph.query(query, [hourAgo]);
        const eventCounts = {};
        rows.forEach((row) => {
            eventCounts[row.transition_type] = row.count;
        });
        // Query for execution durations
        const durationQuery = `
      SELECT 
        started.objective_id,
        started.generation,
        (julianday(completed.event_timestamp) - julianday(started.event_timestamp)) * 86400000 as duration_ms
      FROM managed_objective_history started
      JOIN managed_objective_history completed 
        ON started.objective_id = completed.objective_id
        AND started.generation = completed.generation
      WHERE started.transition_type = 'remediation_started'
      AND completed.transition_type IN ('remediation_completed', 'remediation_failed')
      AND datetime(started.event_timestamp) > datetime(?)
    `;
        const durationRows = await stateGraph.query(durationQuery, [hourAgo]);
        let avgDuration = null;
        let maxDuration = null;
        if (durationRows.length > 0) {
            const durations = durationRows.map((r) => r.duration_ms);
            avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
            maxDuration = Math.max(...durations);
        }
        return {
            timeouts_per_hour: eventCounts['execution_timed_out'] || 0,
            cooldown_entries_per_hour: eventCounts['cooldown_entered'] || 0,
            degraded_transitions_per_hour: eventCounts['degraded'] || 0,
            reconciliations_per_hour: eventCounts['remediation_started'] || 0,
            avg_execution_duration_ms: avgDuration,
            max_execution_duration_ms: maxDuration,
            expired_deadlines: eventCounts['execution_timed_out'] || 0,
            stale_completions_ignored: 0, // Not tracked yet
        };
    }
    /**
     * Map internal transition type to human-readable event type
     */
    mapEventType(transitionType) {
        const mapping = {
            'DECLARED_TO_MONITORING': 'first_evaluation',
            'MONITORING_TO_HEALTHY': 'healthy',
            'MONITORING_TO_VIOLATION_DETECTED': 'drift_detected',
            'HEALTHY_TO_HEALTHY': 'healthy_confirmed',
            'HEALTHY_TO_VIOLATION_DETECTED': 'drift_detected',
            'VIOLATION_DETECTED_TO_REMEDIATION_TRIGGERED': 'reconciliation_triggered',
            'REMEDIATION_TRIGGERED_TO_REMEDIATION_RUNNING': 'execution_started',
            'REMEDIATION_RUNNING_TO_VERIFICATION': 'execution_completed',
            'VERIFICATION_TO_RESTORED': 'recovered',
            'VERIFICATION_TO_FAILED': 'verification_failed',
            'RESTORED_TO_MONITORING': 'monitoring_resumed',
            'FAILED_TO_REMEDIATION_TRIGGERED': 'retry_attempt',
            'remediation_started': 'execution_started',
            'remediation_completed': 'execution_completed',
            'remediation_failed': 'execution_failed',
            'execution_timed_out': 'execution_timeout',
            'cooldown_entered': 'cooldown_entered',
            'degraded': 'degraded',
            'recovered': 'recovered',
            'manual_reset': 'manual_reset',
            'reconciliation_requested': 'reconciliation_admitted',
            'reconciliation_skipped': 'reconciliation_skipped',
            'safe_mode_entered': 'safe_mode_entered',
            'safe_mode_released': 'safe_mode_released',
        };
        return mapping[transitionType] || transitionType;
    }
    /**
     * Generate human-readable summary from event
     */
    generateEventSummary(row) {
        const eventType = this.mapEventType(row.transition_type);
        let metadata = null;
        if (row.metadata) {
            try {
                metadata = JSON.parse(row.metadata);
            }
            catch (e) {
                // Ignore parse errors
            }
        }
        switch (eventType) {
            case 'drift_detected':
                return metadata?.reason || 'Service health check failed';
            case 'reconciliation_admitted':
                return `Generation ${row.generation} admitted for reconciliation`;
            case 'reconciliation_skipped':
                return metadata?.skip_reason || 'Reconciliation skipped';
            case 'execution_started':
                return metadata?.execution_id || metadata?.attempt_id || `Execution started (gen ${row.generation})`;
            case 'execution_completed':
                return 'Execution completed successfully';
            case 'execution_failed':
                return metadata?.error || 'Execution failed';
            case 'execution_timeout':
                return `Execution exceeded deadline (gen ${row.generation})`;
            case 'cooldown_entered':
                return metadata?.cooldown_duration || '300s cooldown';
            case 'degraded':
                return 'Attempts exhausted, objective degraded';
            case 'recovered':
                return 'Objective recovered, monitoring resumed';
            case 'manual_reset':
                return metadata?.operator ? `Manual reset by ${metadata.operator}` : 'Manual reset';
            default:
                return `${row.from_state} → ${row.to_state}`;
        }
    }
    /**
     * Get safe mode status
     */
    async getSafeModeStatus() {
        await this.ensureStateGraph();
        const stateGraph = this.getStateGraph();
        await stateGraph.initialize();
        return stateGraph.getSafeModeStatus();
    }
    /**
     * Enable safe mode
     */
    async enableSafeMode(reason, operator) {
        await this.ensureStateGraph();
        const stateGraph = this.getStateGraph();
        await stateGraph.initialize();
        return stateGraph.enableSafeMode(reason, operator);
    }
    /**
     * Disable safe mode
     */
    async disableSafeMode(operator) {
        await this.ensureStateGraph();
        const stateGraph = this.getStateGraph();
        await stateGraph.initialize();
        return stateGraph.disableSafeMode(operator);
    }
}
//# sourceMappingURL=reconciliationService.js.map