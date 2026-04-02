export class InvestigationManager {
    constructor(stateGraph: any, workspaceManager: any);
    stateGraph: any;
    workspace: any;
    /**
     * Open new investigation
     *
     * @param {Object} params - Investigation parameters
     * @param {string} params.name - Investigation name
     * @param {string} params.description - Description
     * @param {string} [params.objective_id] - Related objective
     * @param {string} [params.incident_id] - Related incident
     * @param {string} params.created_by - Operator
     * @returns {Object} Investigation with workspace
     */
    openInvestigation({ name, description, objective_id, incident_id, created_by }: {
        name: string;
        description: string;
        objective_id?: string;
        incident_id?: string;
        created_by: string;
    }): any;
    /**
     * Link objective to investigation
     *
     * @param {string} investigation_id - Investigation ID
     * @param {string} objective_id - Objective ID
     * @param {string} linked_by - Operator
     * @returns {Object} Updated investigation
     */
    linkObjective(investigation_id: string, objective_id: string, linked_by: string): any;
    /**
     * Link trace to investigation
     *
     * @param {string} investigation_id - Investigation ID
     * @param {string} intent_id - Intent ID
     * @param {string} linked_by - Operator
     * @returns {Object} Link result
     */
    linkTrace(investigation_id: string, intent_id: string, linked_by: string): any;
    /**
     * Add investigation note
     *
     * @param {string} investigation_id - Investigation ID
     * @param {string} note - Note content (markdown)
     * @param {string} created_by - Operator
     * @returns {Object} Created artifact
     */
    addNote(investigation_id: string, note: string, created_by: string): any;
    /**
     * Update investigation status
     *
     * @param {string} investigation_id - Investigation ID
     * @param {string} status - New status (investigating, resolved, archived)
     * @param {string} updated_by - Operator
     * @param {string} [resolution_note] - Optional resolution note
     * @returns {Object} Updated investigation
     */
    updateStatus(investigation_id: string, status: string, updated_by: string, resolution_note?: string): any;
    /**
     * Generate investigation report
     *
     * @param {string} investigation_id - Investigation ID
     * @param {string} created_by - Operator
     * @returns {Object} Report artifact
     */
    generateReport(investigation_id: string): any;
    /**
     * Export investigation report to artifact
     *
     * @param {string} investigation_id - Investigation ID
     * @param {string} created_by - Operator
     * @returns {Object} Report artifact
     */
    exportReport(investigation_id: string, created_by: string): any;
    /**
     * List investigations with filters
     *
     * @param {Object} filters - Filter criteria
     * @returns {Array} Investigations with summary
     */
    listInvestigations(filters?: any): any[];
    /**
     * Get investigation summary
     *
     * @param {string} investigation_id - Investigation ID
     * @returns {Object} Investigation with artifacts
     */
    getInvestigationSummary(investigation_id: string): any;
    /**
     * Link objective artifacts to investigation
     * @private
     */
    private _linkObjectiveArtifacts;
}
//# sourceMappingURL=investigation-manager.d.ts.map