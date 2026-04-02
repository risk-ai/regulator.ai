/**
 * Workspace Search
 *
 * Multi-dimensional search across investigations, artifacts, traces, objectives.
 * Forms Vienna's investigation graph through cross-linking.
 *
 * Phase 12.5 — Search and Cross-Linking
 */
class WorkspaceSearch {
    constructor(stateGraph, workspaceManager) {
        this.stateGraph = stateGraph;
        this.workspace = workspaceManager;
    }
    /**
     * Search investigations
     *
     * @param {Object} criteria - Search criteria
     * @param {string} [criteria.objective_id] - Filter by objective
     * @param {string} [criteria.incident_id] - Filter by incident
     * @param {string} [criteria.status] - Filter by status
     * @param {string} [criteria.created_by] - Filter by creator
     * @param {string} [criteria.date_after] - ISO timestamp
     * @param {string} [criteria.date_before] - ISO timestamp
     * @param {string} [criteria.query] - Text search in name/description
     * @param {number} [criteria.limit] - Result limit
     * @returns {Array} Matching investigations
     */
    searchInvestigations(criteria = {}) {
        let results = this.workspace.listInvestigations({
            objective_id: criteria.objective_id,
            incident_id: criteria.incident_id,
            status: criteria.status,
            created_by: criteria.created_by,
            date_after: criteria.date_after,
            date_before: criteria.date_before,
            limit: criteria.limit || 100,
        });
        // Text search if provided
        if (criteria.query) {
            const query = criteria.query.toLowerCase();
            results = results.filter(inv => inv.name.toLowerCase().includes(query) ||
                (inv.description && inv.description.toLowerCase().includes(query)));
        }
        return results;
    }
    /**
     * Search artifacts
     *
     * @param {Object} criteria - Search criteria
     * @param {string} [criteria.artifact_type] - Filter by type
     * @param {string} [criteria.investigation_id] - Filter by investigation
     * @param {string} [criteria.intent_id] - Filter by intent
     * @param {string} [criteria.execution_id] - Filter by execution
     * @param {string} [criteria.objective_id] - Filter by objective
     * @param {string} [criteria.incident_id] - Filter by incident
     * @param {string} [criteria.created_by] - Filter by creator
     * @param {string} [criteria.date_after] - ISO timestamp
     * @param {string} [criteria.date_before] - ISO timestamp
     * @param {string} [criteria.status] - Filter by status (active/archived/deleted)
     * @param {string} [criteria.mime_type] - Filter by MIME type
     * @param {number} [criteria.limit] - Result limit
     * @returns {Array} Matching artifacts
     */
    searchArtifacts(criteria = {}) {
        return this.workspace.listArtifacts({
            artifact_type: criteria.artifact_type,
            investigation_id: criteria.investigation_id,
            intent_id: criteria.intent_id,
            execution_id: criteria.execution_id,
            objective_id: criteria.objective_id,
            incident_id: criteria.incident_id,
            status: criteria.status,
            created_by: criteria.created_by,
            date_after: criteria.date_after,
            date_before: criteria.date_before,
            limit: criteria.limit || 100,
        });
    }
    /**
     * Search traces (intent_id based)
     *
     * @param {Object} criteria - Search criteria
     * @param {string} [criteria.intent_type] - Filter by intent type
     * @param {string} [criteria.source_type] - Filter by source (operator/agent/system)
     * @param {string} [criteria.status] - Filter by status
     * @param {string} [criteria.date_after] - ISO timestamp
     * @param {string} [criteria.date_before] - ISO timestamp
     * @param {string} [criteria.query] - Text search in intent_type
     * @param {number} [criteria.limit] - Result limit
     * @returns {Array} Matching intent traces
     */
    searchTraces(criteria = {}) {
        let query = `
      SELECT * FROM intent_traces
      WHERE 1=1
    `;
        const params = [];
        if (criteria.intent_type) {
            query += ` AND intent_type = ?`;
            params.push(criteria.intent_type);
        }
        if (criteria.source_type) {
            query += ` AND json_extract(source, '$.type') = ?`;
            params.push(criteria.source_type);
        }
        if (criteria.status) {
            query += ` AND status = ?`;
            params.push(criteria.status);
        }
        if (criteria.date_after) {
            query += ` AND submitted_at >= ?`;
            params.push(criteria.date_after);
        }
        if (criteria.date_before) {
            query += ` AND submitted_at <= ?`;
            params.push(criteria.date_before);
        }
        // Text search
        if (criteria.query) {
            const searchTerm = `%${criteria.query}%`;
            query += ` AND intent_type LIKE ?`;
            params.push(searchTerm);
        }
        query += ` ORDER BY submitted_at DESC`;
        if (criteria.limit) {
            query += ` LIMIT ?`;
            params.push(criteria.limit);
        }
        const stmt = this.stateGraph.db.prepare(query);
        return stmt.all(...params);
    }
    /**
     * Search objectives
     *
     * @param {Object} criteria - Search criteria
     * @param {string} [criteria.objective_type] - Filter by type
     * @param {string} [criteria.target_type] - Filter by target type
     * @param {string} [criteria.target_id] - Filter by target ID
     * @param {string} [criteria.status] - Filter by status
     * @param {string} [criteria.created_by] - Filter by creator
     * @param {string} [criteria.query] - Text search in name
     * @param {number} [criteria.limit] - Result limit
     * @returns {Array} Matching objectives
     */
    searchObjectives(criteria = {}) {
        let query = `
      SELECT * FROM managed_objectives
      WHERE 1=1
    `;
        const params = [];
        if (criteria.objective_type) {
            query += ` AND objective_type = ?`;
            params.push(criteria.objective_type);
        }
        if (criteria.target_type) {
            query += ` AND target_type = ?`;
            params.push(criteria.target_type);
        }
        if (criteria.target_id) {
            query += ` AND target_id = ?`;
            params.push(criteria.target_id);
        }
        if (criteria.status) {
            query += ` AND status = ?`;
            params.push(criteria.status);
        }
        if (criteria.created_by) {
            query += ` AND created_by = ?`;
            params.push(criteria.created_by);
        }
        // Text search
        if (criteria.query) {
            const searchTerm = `%${criteria.query}%`;
            query += ` AND name LIKE ?`;
            params.push(searchTerm);
        }
        query += ` ORDER BY created_at DESC`;
        if (criteria.limit) {
            query += ` LIMIT ?`;
            params.push(criteria.limit);
        }
        const stmt = this.stateGraph.db.prepare(query);
        return stmt.all(...params);
    }
    /**
     * Get investigation graph for single investigation
     *
     * @param {string} investigation_id - Investigation ID
     * @returns {Object} Investigation graph
     */
    getInvestigationGraph(investigation_id) {
        const investigation = this.workspace.getInvestigation(investigation_id);
        if (!investigation) {
            throw new Error(`Investigation not found: ${investigation_id}`);
        }
        const graph = {
            investigation: {
                investigation_id: investigation.investigation_id,
                name: investigation.name,
                status: investigation.status,
            },
            connected_objectives: [],
            connected_intents: [],
            artifacts: [],
            relationships: []
        };
        // Get all artifacts for investigation
        const artifacts = this.workspace.listArtifacts({ investigation_id });
        graph.artifacts = artifacts;
        // Find connected objectives
        const connectedObjectives = new Set();
        if (investigation.objective_id) {
            connectedObjectives.add(investigation.objective_id);
        }
        artifacts.forEach(a => {
            if (a.objective_id)
                connectedObjectives.add(a.objective_id);
        });
        if (connectedObjectives.size > 0) {
            graph.connected_objectives = Array.from(connectedObjectives)
                .map(oid => this.stateGraph.getObjective(oid))
                .filter(Boolean);
        }
        // Find connected intents
        const connectedIntents = new Set();
        artifacts.forEach(a => {
            if (a.intent_id)
                connectedIntents.add(a.intent_id);
        });
        if (connectedIntents.size > 0) {
            graph.connected_intents = Array.from(connectedIntents)
                .map(iid => this.stateGraph.getIntentTrace(iid))
                .filter(Boolean);
        }
        // Build relationships
        artifacts.forEach(artifact => {
            if (artifact.objective_id) {
                graph.relationships.push({
                    from: investigation_id,
                    to: artifact.objective_id,
                    type: 'investigation→objective',
                    via: 'artifact'
                });
            }
            if (artifact.intent_id) {
                graph.relationships.push({
                    from: investigation_id,
                    to: artifact.intent_id,
                    type: 'investigation→intent',
                    via: 'artifact'
                });
            }
        });
        return graph;
    }
    /**
     * Get related investigations for objective
     *
     * @param {string} objective_id - Objective ID
     * @returns {Array} Related investigations
     */
    getObjectiveInvestigations(objective_id) {
        return this.searchInvestigations({ objective_id });
    }
    /**
     * Get related investigations for intent
     *
     * @param {string} intent_id - Intent ID
     * @returns {Array} Related investigations (via artifacts)
     */
    getIntentInvestigations(intent_id) {
        const artifacts = this.searchArtifacts({ intent_id });
        const investigationIds = new Set();
        artifacts.forEach(a => {
            if (a.parent_investigation_id) {
                investigationIds.add(a.parent_investigation_id);
            }
        });
        if (investigationIds.size === 0)
            return [];
        return this.workspace.listInvestigations()
            .filter(inv => investigationIds.has(inv.investigation_id));
    }
    /**
     * Advanced query - find all entities related to a subject
     *
     * Recursively discovers connections:
     * - objective → investigations, traces, artifacts
     * - intent → artifacts, investigations, objectives
     * - investigation → objectives, intents, artifacts
     *
     * @param {string} subject_id - Entity ID (objective, intent, investigation)
     * @param {string} subject_type - Type (objective, intent, investigation)
     * @param {number} [depth] - Recursion depth (default: 2)
     * @returns {Object} Complete relationship graph
     */
    findRelated(subject_id, subject_type, depth = 2) {
        const graph = {
            subject: { id: subject_id, type: subject_type },
            directly_related: [],
            indirectly_related: [],
            distance: {}
        };
        const visited = new Set([subject_id]);
        const queue = [{ id: subject_id, type: subject_type, distance: 0 }];
        while (queue.length > 0 && depth > 0) {
            const { id, type, distance } = queue.shift();
            let related = [];
            if (type === 'objective') {
                // Get investigations for this objective
                related.push(...this.getObjectiveInvestigations(id)
                    .map(inv => ({ id: inv.investigation_id, type: 'investigation' })));
                // Get artifacts for this objective
                related.push(...this.searchArtifacts({ objective_id: id })
                    .map(art => ({ id: art.artifact_id, type: 'artifact' })));
            }
            else if (type === 'intent') {
                // Get investigations for this intent
                related.push(...this.getIntentInvestigations(id)
                    .map(inv => ({ id: inv.investigation_id, type: 'investigation' })));
                // Get artifacts for this intent
                related.push(...this.searchArtifacts({ intent_id: id })
                    .map(art => ({ id: art.artifact_id, type: 'artifact' })));
            }
            else if (type === 'investigation') {
                const investigation = this.workspace.getInvestigation(id);
                if (investigation) {
                    // Get connected objectives
                    if (investigation.objective_id) {
                        related.push({ id: investigation.objective_id, type: 'objective' });
                    }
                    // Get connected artifacts
                    related.push(...this.searchArtifacts({ investigation_id: id })
                        .map(art => ({ id: art.artifact_id, type: 'artifact' })));
                    // Get connected intents
                    const intents = new Set();
                    this.searchArtifacts({ investigation_id: id })
                        .forEach(art => { if (art.intent_id)
                        intents.add(art.intent_id); });
                    related.push(...Array.from(intents).map(iid => ({ id: iid, type: 'intent' })));
                }
            }
            // Add to graph
            related.forEach(item => {
                if (!visited.has(item.id)) {
                    visited.add(item.id);
                    graph.distance[item.id] = distance + 1;
                    if (distance === 0) {
                        graph.directly_related.push(item);
                    }
                    else {
                        graph.indirectly_related.push(item);
                    }
                    if (distance < depth - 1) {
                        queue.push({ ...item, distance: distance + 1 });
                    }
                }
            });
        }
        return graph;
    }
    /**
     * Timeline of all activities across system
     *
     * @param {Object} criteria - Filter criteria
     * @param {string} [criteria.date_after] - ISO timestamp
     * @param {string} [criteria.date_before] - ISO timestamp
     * @param {string} [criteria.objective_id] - Filter by objective
     * @param {number} [criteria.limit] - Result limit
     * @returns {Array} Chronological activities
     */
    getActivityTimeline(criteria = {}) {
        const activities = [];
        // Get investigation activities
        const investigations = this.searchInvestigations({
            date_after: criteria.date_after,
            date_before: criteria.date_before,
        });
        investigations.forEach(inv => {
            activities.push({
                timestamp: inv.created_at,
                type: 'investigation',
                action: 'created',
                entity_id: inv.investigation_id,
                entity_name: inv.name,
                actor: inv.created_by
            });
        });
        // Get artifact activities
        const artifacts = this.searchArtifacts({
            date_after: criteria.date_after,
            date_before: criteria.date_before,
            objective_id: criteria.objective_id,
            limit: 1000
        });
        artifacts.forEach(art => {
            activities.push({
                timestamp: art.created_at,
                type: 'artifact',
                action: 'created',
                artifact_type: art.artifact_type,
                entity_id: art.artifact_id,
                actor: art.created_by
            });
        });
        // Get trace activities
        const traces = this.searchTraces({
            date_after: criteria.date_after,
            date_before: criteria.date_before,
        });
        traces.forEach(trace => {
            activities.push({
                timestamp: trace.submitted_at,
                type: 'trace',
                action: 'submitted',
                entity_id: trace.intent_id,
                intent_type: trace.intent_type,
                actor: trace.source ? JSON.parse(trace.source).id : 'unknown'
            });
        });
        // Sort chronologically
        activities.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        // Apply limit
        if (criteria.limit) {
            return activities.slice(-criteria.limit);
        }
        return activities;
    }
}
module.exports = { WorkspaceSearch };
//# sourceMappingURL=workspace-search.js.map