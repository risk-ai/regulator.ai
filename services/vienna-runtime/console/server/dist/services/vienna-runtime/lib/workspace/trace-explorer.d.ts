export class TraceExplorer {
    constructor(stateGraph: any, workspaceManager: any);
    stateGraph: any;
    workspace: any;
    /**
     * List all traces with optional filters
     *
     * @param {Object} filters - Search criteria
     * @param {string} [filters.intent_type] - Filter by intent type
     * @param {string} [filters.source_type] - Filter by source (operator/agent/system)
     * @param {string} [filters.status] - Filter by status (accepted/denied/completed/failed)
     * @param {string} [filters.date_after] - ISO timestamp
     * @param {string} [filters.date_before] - ISO timestamp
     * @param {number} [filters.limit] - Result limit
     * @returns {Array} List of intent traces with summary
     */
    listTraces(filters?: {
        intent_type?: string;
        source_type?: string;
        status?: string;
        date_after?: string;
        date_before?: string;
        limit?: number;
    }): any[];
    /**
     * Get complete trace for specific intent
     *
     * @param {string} intent_id - Intent ID
     * @returns {Object} Complete intent trace with events and artifacts
     */
    getTrace(intent_id: string): any;
    /**
     * Get execution graph for intent
     *
     * Returns graph representation of all execution attempts and governance decisions
     *
     * @param {string} intent_id - Intent ID
     * @returns {Object} Execution graph with nodes and edges
     */
    getExecutionGraph(intent_id: string): any;
    /**
     * Get timeline view of intent execution
     *
     * Chronological list of all events, executions, and artifacts
     *
     * @param {string} intent_id - Intent ID
     * @returns {Object} Timeline with chronological entries
     */
    getTimeline(intent_id: string): any;
    /**
     * Export trace to workspace artifact
     *
     * Creates a permanent artifact record of the trace
     *
     * @param {string} intent_id - Intent ID
     * @param {string} created_by - Operator who requested export
     * @param {string} [investigation_id] - Link to investigation
     * @returns {Object} Created artifact
     */
    exportTrace(intent_id: string, created_by: string, investigation_id?: string): any;
    /**
     * Export execution graph to workspace artifact
     *
     * @param {string} intent_id - Intent ID
     * @param {string} created_by - Operator
     * @param {string} [investigation_id] - Link to investigation
     * @returns {Object} Created artifact
     */
    exportExecutionGraph(intent_id: string, created_by: string, investigation_id?: string): any;
    /**
     * Export timeline to workspace artifact
     *
     * @param {string} intent_id - Intent ID
     * @param {string} created_by - Operator
     * @param {string} [investigation_id] - Link to investigation
     * @returns {Object} Created artifact
     */
    exportTimeline(intent_id: string, created_by: string, investigation_id?: string): any;
    /**
     * Count artifacts for trace
     * @private
     */
    private _countTraceArtifacts;
}
//# sourceMappingURL=trace-explorer.d.ts.map