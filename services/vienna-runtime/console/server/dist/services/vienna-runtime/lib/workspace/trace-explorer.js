/**
 * Trace Explorer
 *
 * Operator APIs for exploring traces within the workspace.
 * Integrates with Phase 11.5 Intent Tracing system.
 *
 * Phase 12.3 — Trace Exploration Surface
 */
const { ARTIFACT_TYPES } = require('./workspace-schema');
class TraceExplorer {
    constructor(stateGraph, workspaceManager) {
        this.stateGraph = stateGraph;
        this.workspace = workspaceManager;
    }
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
    async listTraces(filters = {}) {
        let query = `
      SELECT * FROM intent_traces
      WHERE 1=1
    `;
        const params = [];
        if (filters.intent_type) {
            query += ` AND intent_type = ?`;
            params.push(filters.intent_type);
        }
        if (filters.source_type) {
            query += ` AND json_extract(source, '$.type') = ?`;
            params.push(filters.source_type);
        }
        if (filters.status) {
            query += ` AND status = ?`;
            params.push(filters.status);
        }
        if (filters.date_after) {
            query += ` AND submitted_at >= ?`;
            params.push(filters.date_after);
        }
        if (filters.date_before) {
            query += ` AND submitted_at <= ?`;
            params.push(filters.date_before);
        }
        query += ` ORDER BY submitted_at DESC`;
        if (filters.limit) {
            query += ` LIMIT ?`;
            params.push(filters.limit);
        }
        const stmt = this.stateGraph.db.prepare(query);
        const rows = stmt.all(...params);
        return rows.map(row => ({
            intent_id: row.intent_id,
            intent_type: row.intent_type,
            source: JSON.parse(row.source),
            status: row.status,
            submitted_at: row.submitted_at,
            completed_at: row.completed_at,
            artifact_count: this._countTraceArtifacts(row.intent_id),
        }));
    }
    /**
     * Get complete trace for specific intent
     *
     * @param {string} intent_id - Intent ID
     * @returns {Object} Complete intent trace with events and artifacts
     */
    async getTrace(intent_id) {
        // Get intent trace record
        const stmt = this.stateGraph.db.prepare(`
      SELECT * FROM intent_traces WHERE intent_id = ?
    `);
        const trace = stmt.get(intent_id);
        if (!trace) {
            throw new Error(`Intent trace not found: ${intent_id}`);
        }
        // Parse events from intent_traces table (events stored as JSON array)
        const events = trace.events && trace.events.length > 0
            ? JSON.parse(trace.events)
            : [];
        // Get linked artifacts
        const artifacts = this.workspace.listArtifacts({ intent_id });
        // Parse relationships from intent_traces table (links to execution_id, etc.)
        const relationships = trace.relationships ? JSON.parse(trace.relationships) : {};
        const executionIds = relationships.execution_id ? [relationships.execution_id] : [];
        // Get execution details if available
        const executions = executionIds.map(exec_id => {
            const stmt = this.stateGraph.db.prepare(`
        SELECT execution_id, objective, risk_tier, execution_status as status, 
               started_at, completed_at
        FROM execution_ledger_summary
        WHERE execution_id = ?
      `);
            return stmt.get(exec_id);
        }).filter(Boolean);
        return {
            intent_id: trace.intent_id,
            intent_type: trace.intent_type,
            source: JSON.parse(trace.source),
            status: trace.status,
            submitted_at: trace.submitted_at,
            completed_at: trace.completed_at,
            events,
            artifacts,
            executions,
            relationships,
        };
    }
    /**
     * Get execution graph for intent
     *
     * Returns graph representation of all execution attempts and governance decisions
     *
     * @param {string} intent_id - Intent ID
     * @returns {Object} Execution graph with nodes and edges
     */
    async getExecutionGraph(intent_id) {
        const trace = await this.getTrace(intent_id);
        const nodes = [];
        const edges = [];
        // Intent node (root)
        nodes.push({
            id: intent_id,
            type: 'intent',
            label: trace.intent_type,
            data: {
                source: trace.source,
                status: trace.status,
                submitted_at: trace.submitted_at,
            }
        });
        // Event nodes
        trace.events.forEach((event, index) => {
            const nodeId = `event-${index}`;
            nodes.push({
                id: nodeId,
                type: 'event',
                label: event.event_type,
                data: {
                    timestamp: event.event_timestamp,
                    metadata: event.metadata,
                }
            });
            // Edge from intent to first event, or from previous event
            const sourceId = index === 0 ? intent_id : `event-${index - 1}`;
            edges.push({
                from: sourceId,
                to: nodeId,
                label: 'next',
            });
        });
        // Execution nodes
        trace.executions.forEach((execution, index) => {
            const nodeId = `exec-${execution.execution_id}`;
            nodes.push({
                id: nodeId,
                type: 'execution',
                label: `Execution ${index + 1}`,
                data: {
                    execution_id: execution.execution_id,
                    objective: execution.objective,
                    risk_tier: execution.risk_tier,
                    status: execution.status,
                    started_at: execution.started_at,
                    completed_at: execution.completed_at,
                }
            });
            // Edge from intent to execution
            edges.push({
                from: intent_id,
                to: nodeId,
                label: 'triggered',
            });
        });
        // Artifact nodes
        trace.artifacts.forEach((artifact, index) => {
            const nodeId = `artifact-${artifact.artifact_id}`;
            nodes.push({
                id: nodeId,
                type: 'artifact',
                label: artifact.artifact_type,
                data: {
                    artifact_id: artifact.artifact_id,
                    artifact_path: artifact.artifact_path,
                    created_at: artifact.created_at,
                }
            });
            // Edge from intent to artifact
            edges.push({
                from: intent_id,
                to: nodeId,
                label: 'created',
            });
        });
        return {
            intent_id,
            nodes,
            edges,
            summary: {
                total_nodes: nodes.length,
                total_edges: edges.length,
                event_count: trace.events.length,
                execution_count: trace.executions.length,
                artifact_count: trace.artifacts.length,
            }
        };
    }
    /**
     * Get timeline view of intent execution
     *
     * Chronological list of all events, executions, and artifacts
     *
     * @param {string} intent_id - Intent ID
     * @returns {Object} Timeline with chronological entries
     */
    async getTimeline(intent_id) {
        const trace = await this.getTrace(intent_id);
        const timeline = [];
        // Intent submission
        timeline.push({
            timestamp: trace.submitted_at,
            type: 'intent',
            action: 'submitted',
            data: {
                intent_type: trace.intent_type,
                source: trace.source,
            }
        });
        // Events
        trace.events.forEach(event => {
            timeline.push({
                timestamp: event.timestamp || new Date().toISOString(),
                type: 'event',
                action: event.event_type,
                data: event.metadata || {},
            });
        });
        // Executions
        trace.executions.forEach(execution => {
            timeline.push({
                timestamp: execution.started_at,
                type: 'execution',
                action: 'started',
                data: {
                    execution_id: execution.execution_id,
                    objective: execution.objective,
                    risk_tier: execution.risk_tier,
                }
            });
            if (execution.completed_at) {
                timeline.push({
                    timestamp: execution.completed_at,
                    type: 'execution',
                    action: 'completed',
                    data: {
                        execution_id: execution.execution_id,
                        status: execution.status,
                    }
                });
            }
        });
        // Artifacts
        trace.artifacts.forEach(artifact => {
            timeline.push({
                timestamp: artifact.created_at,
                type: 'artifact',
                action: 'created',
                data: {
                    artifact_id: artifact.artifact_id,
                    artifact_type: artifact.artifact_type,
                    artifact_path: artifact.artifact_path,
                }
            });
        });
        // Sort chronologically
        timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return {
            intent_id,
            timeline,
            summary: {
                start: trace.submitted_at,
                end: trace.completed_at || new Date().toISOString(),
                total_events: timeline.length,
            }
        };
    }
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
    async exportTrace(intent_id, created_by, investigation_id = null) {
        const trace = await this.getTrace(intent_id);
        const artifact = this.workspace.storeArtifact({
            artifact_type: ARTIFACT_TYPES.INTENT_TRACE,
            content: JSON.stringify(trace, null, 2),
            intent_id,
            investigation_id,
            created_by,
            mime_type: 'application/json',
        });
        return artifact;
    }
    /**
     * Export execution graph to workspace artifact
     *
     * @param {string} intent_id - Intent ID
     * @param {string} created_by - Operator
     * @param {string} [investigation_id] - Link to investigation
     * @returns {Object} Created artifact
     */
    async exportExecutionGraph(intent_id, created_by, investigation_id = null) {
        const graph = await this.getExecutionGraph(intent_id);
        const artifact = this.workspace.storeArtifact({
            artifact_type: ARTIFACT_TYPES.EXECUTION_GRAPH,
            content: JSON.stringify(graph, null, 2),
            intent_id,
            investigation_id,
            created_by,
            mime_type: 'application/json',
        });
        return artifact;
    }
    /**
     * Export timeline to workspace artifact
     *
     * @param {string} intent_id - Intent ID
     * @param {string} created_by - Operator
     * @param {string} [investigation_id] - Link to investigation
     * @returns {Object} Created artifact
     */
    async exportTimeline(intent_id, created_by, investigation_id = null) {
        const timeline = await this.getTimeline(intent_id);
        const artifact = this.workspace.storeArtifact({
            artifact_type: ARTIFACT_TYPES.TIMELINE_EXPORT,
            content: JSON.stringify(timeline, null, 2),
            intent_id,
            investigation_id,
            created_by,
            mime_type: 'application/json',
        });
        return artifact;
    }
    /**
     * Count artifacts for trace
     * @private
     */
    _countTraceArtifacts(intent_id) {
        const stmt = this.stateGraph.db.prepare(`
      SELECT COUNT(*) as count FROM workspace_artifacts
      WHERE intent_id = ? AND status = 'active'
    `);
        const row = stmt.get(intent_id);
        return row ? row.count : 0;
    }
}
module.exports = { TraceExplorer };
//# sourceMappingURL=trace-explorer.js.map