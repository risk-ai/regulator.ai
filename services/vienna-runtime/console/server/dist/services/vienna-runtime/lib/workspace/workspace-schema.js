/**
 * Workspace Schema
 *
 * Investigation-oriented file system for Vienna OS operators.
 *
 * Not a generic file browser — structured around governed execution workflows:
 * - Intent traces
 * - Reconciliation investigations
 * - Execution artifacts
 * - Investigation reports
 * - Incident notes
 *
 * Phase 12 Stage 1-2
 */
/**
 * Workspace artifact types (bounded vocabulary)
 */
const ARTIFACT_TYPES = {
    // Investigation artifacts
    INVESTIGATION_WORKSPACE: 'investigation_workspace', // Directory for investigation
    INVESTIGATION_NOTES: 'investigation_notes', // Markdown notes
    INVESTIGATION_REPORT: 'investigation_report', // Final report
    // Trace artifacts (Phase 12.2 first-class trace objects)
    TRACE: 'trace', // Generic trace artifact
    INTENT_TRACE: 'intent_trace', // Exported intent trace (JSON)
    EXECUTION_GRAPH: 'execution_graph', // Execution graph (JSON/Mermaid)
    TIMELINE_EXPORT: 'timeline_export', // Timeline export (JSON/CSV)
    // Execution artifacts (Phase 12.2 first-class execution objects)
    EXECUTION_OUTPUT: 'execution_output', // Combined stdout/stderr
    EXECUTION_STDOUT: 'execution_stdout', // Command stdout
    EXECUTION_STDERR: 'execution_stderr', // Command stderr
    // Verification artifacts (Phase 12.2)
    VERIFICATION_REPORT: 'verification_report', // Post-execution verification
    // System artifacts
    STATE_SNAPSHOT: 'state_snapshot', // Pre/post state snapshot
    CONFIG_SNAPSHOT: 'config_snapshot', // Configuration snapshot
    SYSTEM_SNAPSHOT: 'system_snapshot', // Complete system snapshot
    // Objective artifacts
    OBJECTIVE_HISTORY: 'objective_history', // Evaluation/reconciliation history
    OBJECTIVE_ANALYSIS: 'objective_analysis', // Pattern analysis
    // Incident artifacts
    INCIDENT_TIMELINE: 'incident_timeline', // Incident timeline
    INCIDENT_POSTMORTEM: 'incident_postmortem', // Postmortem document
    // Operator artifacts (Phase 12.2)
    INVESTIGATION_NOTE: 'investigation_note', // Single investigation note
    OPERATOR_ANNOTATION: 'operator_annotation', // Operator annotation on artifact
};
/**
 * Workspace artifact status
 */
const ARTIFACT_STATUS = {
    ACTIVE: 'active', // Currently in use
    ARCHIVED: 'archived', // Archived (older than retention period)
    DELETED: 'deleted', // Soft-deleted (pending cleanup)
};
/**
 * Workspace investigation status
 */
const INVESTIGATION_STATUS = {
    OPEN: 'open', // Active investigation
    INVESTIGATING: 'investigating', // Under active investigation (Phase 12.2)
    RESOLVED: 'resolved', // Investigation complete
    ARCHIVED: 'archived', // Archived investigation
};
/**
 * Artifact object schema (Phase 12.2 first-class artifact)
 *
 * Artifacts are now first-class investigation objects with:
 * - Explicit linking to intent/execution/objective/investigation
 * - Immutability guarantee
 * - Metadata support for search/filtering
 * - Content hashing for integrity
 */
const ARTIFACT_SCHEMA = {
    // Identity
    artifact_id: 'string (required)', // Unique identifier
    artifact_type: 'string (required)', // Type from ARTIFACT_TYPES
    artifact_path: 'string (required)', // Relative path in workspace
    // Linkage (Phase 12.2 explicit context linking)
    parent_investigation_id: 'string (nullable)', // Parent investigation
    intent_id: 'string (nullable)', // Source intent
    execution_id: 'string (nullable)', // Source execution
    objective_id: 'string (nullable)', // Related objective
    incident_id: 'string (nullable)', // Related incident
    // File metadata
    content_hash: 'string', // SHA-256 hash
    size_bytes: 'number', // File size
    mime_type: 'string', // MIME type
    // Lifecycle
    status: 'string', // From ARTIFACT_STATUS
    created_by: 'string (required)', // Creator
    created_at: 'string (required)', // ISO timestamp
    archived_at: 'string (nullable)', // Archive timestamp
    deleted_at: 'string (nullable)', // Deletion timestamp
    // Environment
    environment: 'string (required)', // prod/test
    // Metadata (Phase 12.2 searchable metadata)
    metadata: 'object', // Arbitrary metadata
};
/**
 * Investigation object schema (Phase 12.2)
 */
const INVESTIGATION_SCHEMA = {
    // Identity
    investigation_id: 'string (required)',
    name: 'string (required)',
    description: 'string',
    // Linkage
    objective_id: 'string (nullable)',
    incident_id: 'string (nullable)',
    // Lifecycle
    status: 'string (required)', // From INVESTIGATION_STATUS
    created_by: 'string (required)',
    created_at: 'string (required)',
    resolved_at: 'string (nullable)',
    archived_at: 'string (nullable)',
    // Environment
    environment: 'string (required)',
    // Metadata
    metadata: 'object',
};
/**
 * Validate artifact metadata
 *
 * @param {Object} artifact - Artifact metadata
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateArtifact(artifact) {
    const errors = [];
    // Required fields
    if (!artifact.artifact_id)
        errors.push('artifact_id required');
    if (!artifact.artifact_type)
        errors.push('artifact_type required');
    if (!artifact.artifact_path)
        errors.push('artifact_path required');
    if (!artifact.created_by)
        errors.push('created_by required');
    if (!artifact.environment)
        errors.push('environment required');
    // Type validation
    if (artifact.artifact_type && !Object.values(ARTIFACT_TYPES).includes(artifact.artifact_type)) {
        errors.push(`Invalid artifact_type: ${artifact.artifact_type}`);
    }
    // Status validation
    if (artifact.status && !Object.values(ARTIFACT_STATUS).includes(artifact.status)) {
        errors.push(`Invalid status: ${artifact.status}`);
    }
    // Environment validation
    if (artifact.environment && !['prod', 'test'].includes(artifact.environment)) {
        errors.push(`Invalid environment: ${artifact.environment}`);
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Validate investigation metadata
 *
 * @param {Object} investigation - Investigation metadata
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateInvestigation(investigation) {
    const errors = [];
    // Required fields
    if (!investigation.investigation_id)
        errors.push('investigation_id required');
    if (!investigation.name)
        errors.push('name required');
    if (!investigation.created_by)
        errors.push('created_by required');
    if (!investigation.environment)
        errors.push('environment required');
    // Status validation
    if (investigation.status && !Object.values(INVESTIGATION_STATUS).includes(investigation.status)) {
        errors.push(`Invalid status: ${investigation.status}`);
    }
    // Environment validation
    if (investigation.environment && !['prod', 'test'].includes(investigation.environment)) {
        errors.push(`Invalid environment: ${investigation.environment}`);
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Create artifact search filters (Phase 12.2)
 *
 * @param {Object} filters - Search criteria
 * @returns {Object} Normalized filter object
 */
function normalizeArtifactFilters(filters = {}) {
    const normalized = {};
    if (filters.artifact_type)
        normalized.artifact_type = filters.artifact_type;
    if (filters.investigation_id)
        normalized.investigation_id = filters.investigation_id;
    if (filters.intent_id)
        normalized.intent_id = filters.intent_id;
    if (filters.execution_id)
        normalized.execution_id = filters.execution_id;
    if (filters.objective_id)
        normalized.objective_id = filters.objective_id;
    if (filters.incident_id)
        normalized.incident_id = filters.incident_id;
    if (filters.status)
        normalized.status = filters.status;
    if (filters.created_by)
        normalized.created_by = filters.created_by;
    if (filters.date_after)
        normalized.date_after = filters.date_after;
    if (filters.date_before)
        normalized.date_before = filters.date_before;
    if (filters.limit)
        normalized.limit = filters.limit;
    return normalized;
}
/**
 * Create investigation search filters (Phase 12.2)
 */
function normalizeInvestigationFilters(filters = {}) {
    const normalized = {};
    if (filters.status)
        normalized.status = filters.status;
    if (filters.objective_id)
        normalized.objective_id = filters.objective_id;
    if (filters.incident_id)
        normalized.incident_id = filters.incident_id;
    if (filters.created_by)
        normalized.created_by = filters.created_by;
    if (filters.date_after)
        normalized.date_after = filters.date_after;
    if (filters.date_before)
        normalized.date_before = filters.date_before;
    if (filters.limit)
        normalized.limit = filters.limit;
    return normalized;
}
module.exports = {
    ARTIFACT_TYPES,
    ARTIFACT_STATUS,
    INVESTIGATION_STATUS,
    ARTIFACT_SCHEMA,
    INVESTIGATION_SCHEMA,
    validateArtifact,
    validateInvestigation,
    normalizeArtifactFilters,
    normalizeInvestigationFilters,
};
//# sourceMappingURL=workspace-schema.js.map