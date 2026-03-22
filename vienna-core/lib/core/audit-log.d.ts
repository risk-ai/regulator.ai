/**
 * Audit Log Storage
 *
 * Phase 6.10: Audit Trail UI
 *
 * Bounded in-memory audit event storage with query capabilities.
 * All runtime executions emit audit events for operator visibility.
 *
 * Design:
 * - Ring buffer for bounded memory footprint
 * - Fast query by type, status, time range
 * - Structured events with consistent schema
 * - Integration with shell executor, recovery copilot, warrant system
 *
 * Event Types:
 * - command_proposed
 * - command_approved
 * - command_executed
 * - command_failed
 * - warrant_issued
 * - warrant_verified
 * - warrant_invalidated
 * - recovery_action_proposed
 * - recovery_action_executed
 * - workflow_started
 * - workflow_step_completed
 * - workflow_failed
 */
export class AuditLog {
    constructor(options?: {});
    maxEvents: any;
    events: any[];
    eventIndex: Map<any, any>;
    initialized: boolean;
    /**
     * Append audit event
     *
     * @param {object} event - Audit event
     * @returns {string} Event ID
     */
    append(event: object): string;
    /**
     * Query audit events
     *
     * @param {object} params - Query parameters
     * @param {string} params.action - Filter by action type
     * @param {string} params.operator - Filter by operator
     * @param {string} params.result - Filter by result (success|failed|pending)
     * @param {string} params.envelope_id - Filter by envelope ID
     * @param {string} params.objective_id - Filter by objective ID
     * @param {string} params.thread_id - Filter by thread ID
     * @param {string} params.start - Start timestamp (ISO)
     * @param {string} params.end - End timestamp (ISO)
     * @param {number} params.limit - Max results (default 50)
     * @param {number} params.offset - Offset for pagination (default 0)
     * @returns {object} Query result
     */
    query(params?: {
        action: string;
        operator: string;
        result: string;
        envelope_id: string;
        objective_id: string;
        thread_id: string;
        start: string;
        end: string;
        limit: number;
        offset: number;
    }): object;
    /**
     * Get specific audit record by ID
     *
     * @param {string} id - Event ID
     * @returns {object|null} Audit record
     */
    get(id: string): object | null;
    /**
     * Get recent audit events
     *
     * @param {number} limit - Max results (default 50)
     * @returns {Array} Recent events
     */
    getRecent(limit?: number): any[];
    /**
     * Get stats
     *
     * @returns {object} Stats
     */
    getStats(): object;
    /**
     * Clear all events (operator command only)
     */
    clear(): void;
}
//# sourceMappingURL=audit-log.d.ts.map