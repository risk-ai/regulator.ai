/**
 * Workspace Search
 *
 * Multi-dimensional search across investigations, artifacts, traces, objectives.
 * Forms Vienna's investigation graph through cross-linking.
 *
 * Phase 12.5 — Search and Cross-Linking
 */
export class WorkspaceSearch {
    constructor(stateGraph: any, workspaceManager: any);
    stateGraph: any;
    workspace: any;
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
    searchInvestigations(criteria?: {
        objective_id?: string;
        incident_id?: string;
        status?: string;
        created_by?: string;
        date_after?: string;
        date_before?: string;
        query?: string;
        limit?: number;
    }): any[];
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
    searchArtifacts(criteria?: {
        artifact_type?: string;
        investigation_id?: string;
        intent_id?: string;
        execution_id?: string;
        objective_id?: string;
        incident_id?: string;
        created_by?: string;
        date_after?: string;
        date_before?: string;
        status?: string;
        mime_type?: string;
        limit?: number;
    }): any[];
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
    searchTraces(criteria?: {
        intent_type?: string;
        source_type?: string;
        status?: string;
        date_after?: string;
        date_before?: string;
        query?: string;
        limit?: number;
    }): any[];
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
    searchObjectives(criteria?: {
        objective_type?: string;
        target_type?: string;
        target_id?: string;
        status?: string;
        created_by?: string;
        query?: string;
        limit?: number;
    }): any[];
    /**
     * Get investigation graph for single investigation
     *
     * @param {string} investigation_id - Investigation ID
     * @returns {Object} Investigation graph
     */
    getInvestigationGraph(investigation_id: string): any;
    /**
     * Get related investigations for objective
     *
     * @param {string} objective_id - Objective ID
     * @returns {Array} Related investigations
     */
    getObjectiveInvestigations(objective_id: string): any[];
    /**
     * Get related investigations for intent
     *
     * @param {string} intent_id - Intent ID
     * @returns {Array} Related investigations (via artifacts)
     */
    getIntentInvestigations(intent_id: string): any[];
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
    findRelated(subject_id: string, subject_type: string, depth?: number): any;
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
    getActivityTimeline(criteria?: {
        date_after?: string;
        date_before?: string;
        objective_id?: string;
        limit?: number;
    }): any[];
}
//# sourceMappingURL=workspace-search.d.ts.map