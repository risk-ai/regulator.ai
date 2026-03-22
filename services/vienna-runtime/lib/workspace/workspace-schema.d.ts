export namespace ARTIFACT_TYPES {
    let INVESTIGATION_WORKSPACE: string;
    let INVESTIGATION_NOTES: string;
    let INVESTIGATION_REPORT: string;
    let TRACE: string;
    let INTENT_TRACE: string;
    let EXECUTION_GRAPH: string;
    let TIMELINE_EXPORT: string;
    let EXECUTION_OUTPUT: string;
    let EXECUTION_STDOUT: string;
    let EXECUTION_STDERR: string;
    let VERIFICATION_REPORT: string;
    let STATE_SNAPSHOT: string;
    let CONFIG_SNAPSHOT: string;
    let SYSTEM_SNAPSHOT: string;
    let OBJECTIVE_HISTORY: string;
    let OBJECTIVE_ANALYSIS: string;
    let INCIDENT_TIMELINE: string;
    let INCIDENT_POSTMORTEM: string;
    let INVESTIGATION_NOTE: string;
    let OPERATOR_ANNOTATION: string;
}
export namespace ARTIFACT_STATUS {
    let ACTIVE: string;
    let ARCHIVED: string;
    let DELETED: string;
}
export namespace INVESTIGATION_STATUS {
    export let OPEN: string;
    export let INVESTIGATING: string;
    export let RESOLVED: string;
    let ARCHIVED_1: string;
    export { ARCHIVED_1 as ARCHIVED };
}
export namespace ARTIFACT_SCHEMA {
    let artifact_id: string;
    let artifact_type: string;
    let artifact_path: string;
    let parent_investigation_id: string;
    let intent_id: string;
    let execution_id: string;
    let objective_id: string;
    let incident_id: string;
    let content_hash: string;
    let size_bytes: string;
    let mime_type: string;
    let status: string;
    let created_by: string;
    let created_at: string;
    let archived_at: string;
    let deleted_at: string;
    let environment: string;
    let metadata: string;
}
export namespace INVESTIGATION_SCHEMA {
    export let investigation_id: string;
    export let name: string;
    export let description: string;
    let objective_id_1: string;
    export { objective_id_1 as objective_id };
    let incident_id_1: string;
    export { incident_id_1 as incident_id };
    let status_1: string;
    export { status_1 as status };
    let created_by_1: string;
    export { created_by_1 as created_by };
    let created_at_1: string;
    export { created_at_1 as created_at };
    export let resolved_at: string;
    let archived_at_1: string;
    export { archived_at_1 as archived_at };
    let environment_1: string;
    export { environment_1 as environment };
    let metadata_1: string;
    export { metadata_1 as metadata };
}
/**
 * Validate artifact metadata
 *
 * @param {Object} artifact - Artifact metadata
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateArtifact(artifact: any): any;
/**
 * Validate investigation metadata
 *
 * @param {Object} investigation - Investigation metadata
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateInvestigation(investigation: any): any;
/**
 * Create artifact search filters (Phase 12.2)
 *
 * @param {Object} filters - Search criteria
 * @returns {Object} Normalized filter object
 */
export function normalizeArtifactFilters(filters?: any): any;
/**
 * Create investigation search filters (Phase 12.2)
 */
export function normalizeInvestigationFilters(filters?: {}): {
    status: any;
    objective_id: any;
    incident_id: any;
    created_by: any;
    date_after: any;
    date_before: any;
    limit: any;
};
//# sourceMappingURL=workspace-schema.d.ts.map