export class WorkspaceManager {
    constructor(stateGraph: any, options?: {});
    stateGraph: any;
    environment: any;
    workspaceRoot: any;
    /**
     * Ensure workspace directory structure exists
     * @private
     */
    private _ensureWorkspaceStructure;
    /**
     * Create investigation workspace
     *
     * @param {Object} params - Investigation parameters
     * @param {string} params.name - Investigation name
     * @param {string} params.description - Investigation description
     * @param {string} [params.objective_id] - Related objective
     * @param {string} [params.incident_id] - Related incident
     * @param {string} params.created_by - Operator who created investigation
     * @returns {Object} Investigation metadata
     */
    createInvestigation({ name, description, objective_id, incident_id, created_by }: {
        name: string;
        description: string;
        objective_id?: string;
        incident_id?: string;
        created_by: string;
    }): any;
    /**
     * Get investigation by ID
     *
     * @param {string} investigation_id - Investigation ID
     * @returns {Object|null} Investigation metadata
     */
    getInvestigation(investigation_id: string): any | null;
    /**
     * List investigations (Phase 12.2 enhanced search)
     *
     * @param {Object} filters - Filter criteria
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.objective_id] - Filter by objective
     * @param {string} [filters.incident_id] - Filter by incident
     * @param {string} [filters.created_by] - Filter by creator
     * @param {string} [filters.date_after] - Filter by date (ISO timestamp)
     * @param {string} [filters.date_before] - Filter by date (ISO timestamp)
     * @param {number} [filters.limit] - Result limit
     * @returns {Array} List of investigations
     */
    listInvestigations(filters?: {
        status?: string;
        objective_id?: string;
        incident_id?: string;
        created_by?: string;
        date_after?: string;
        date_before?: string;
        limit?: number;
    }): any[];
    /**
     * Store artifact
     *
     * @param {Object} params - Artifact parameters
     * @param {string} params.artifact_type - Artifact type (from ARTIFACT_TYPES)
     * @param {Buffer|string} params.content - Artifact content
     * @param {string} [params.artifact_path] - Custom path (optional, auto-generated if not provided)
     * @param {string} [params.investigation_id] - Parent investigation
     * @param {string} [params.intent_id] - Related intent
     * @param {string} [params.execution_id] - Related execution
     * @param {string} [params.objective_id] - Related objective
     * @param {string} params.created_by - Operator who created artifact
     * @returns {Object} Artifact metadata
     */
    storeArtifact({ artifact_type, content, artifact_path, investigation_id, intent_id, execution_id, objective_id, incident_id, created_by, mime_type, }: {
        artifact_type: string;
        content: Buffer | string;
        artifact_path?: string;
        investigation_id?: string;
        intent_id?: string;
        execution_id?: string;
        objective_id?: string;
        created_by: string;
    }): any;
    /**
     * Get artifact by ID
     *
     * @param {string} artifact_id - Artifact ID
     * @returns {Object|null} Artifact metadata
     */
    getArtifact(artifact_id: string): any | null;
    /**
     * List artifacts (Phase 12.2 enhanced search)
     *
     * @param {Object} filters - Filter criteria
     * @param {string} [filters.artifact_type] - Filter by type
     * @param {string} [filters.investigation_id] - Filter by investigation
     * @param {string} [filters.intent_id] - Filter by intent
     * @param {string} [filters.execution_id] - Filter by execution
     * @param {string} [filters.objective_id] - Filter by objective
     * @param {string} [filters.incident_id] - Filter by incident
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.created_by] - Filter by creator
     * @param {string} [filters.date_after] - Filter by date (ISO timestamp)
     * @param {string} [filters.date_before] - Filter by date (ISO timestamp)
     * @param {number} [filters.limit] - Result limit
     * @returns {Array} List of artifacts
     */
    listArtifacts(filters?: {
        artifact_type?: string;
        investigation_id?: string;
        intent_id?: string;
        execution_id?: string;
        objective_id?: string;
        incident_id?: string;
        status?: string;
        created_by?: string;
        date_after?: string;
        date_before?: string;
        limit?: number;
    }): any[];
    /**
     * Get artifact content
     *
     * @param {string} artifact_id - Artifact ID
     * @returns {Buffer|null} Artifact content
     */
    getArtifactContent(artifact_id: string): Buffer | null;
    /**
     * Generate workspace file tree for operator UI
     *
     * @returns {Object} File tree structure
     */
    getWorkspaceTree(): any;
    /**
     * Count artifacts for investigation
     * @private
     */
    private _countInvestigationArtifacts;
    /**
     * Sanitize name for filesystem
     * @private
     */
    private _sanitizeName;
    /**
     * Generate artifact path
     * @private
     */
    private _generateArtifactPath;
    /**
     * Guess MIME type from artifact type
     * @private
     */
    private _guessMimeType;
    /**
     * Update investigation status (Phase 12.2)
     *
     * @param {string} investigation_id - Investigation ID
     * @param {string} status - New status
     * @param {string} updated_by - Operator who updated status
     * @returns {Object} Updated investigation
     */
    updateInvestigationStatus(investigation_id: string, status: string, updated_by: string): any;
    /**
     * Link artifact to context (Phase 12.2)
     *
     * @param {string} artifact_id - Artifact ID
     * @param {Object} context - Context to link
     * @param {string} [context.intent_id] - Intent ID
     * @param {string} [context.execution_id] - Execution ID
     * @param {string} [context.objective_id] - Objective ID
     * @param {string} [context.investigation_id] - Investigation ID
     * @returns {Object} Updated artifact
     */
    linkArtifact(artifact_id: string, context: {
        intent_id?: string;
        execution_id?: string;
        objective_id?: string;
        investigation_id?: string;
    }): any;
    /**
     * Search artifacts by metadata (Phase 12.2)
     *
     * @param {Object} metadata - Metadata key-value pairs
     * @returns {Array} Matching artifacts
     */
    searchArtifactsByMetadata(metadata: any): any[];
    /**
     * Get cross-linked artifacts (Phase 12.2)
     *
     * Returns all artifacts linked to the same context (intent/execution/objective/investigation)
     *
     * @param {string} artifact_id - Artifact ID
     * @returns {Object} Related artifacts grouped by context
     */
    getCrossLinkedArtifacts(artifact_id: string): any;
    /**
     * Generate investigation README
     * @private
     */
    private _generateInvestigationReadme;
}
//# sourceMappingURL=workspace-manager.d.ts.map