/**
 * Investigation Manager
 * 
 * Investigation workflows around objectives, traces, and artifacts.
 * 
 * Phase 12.4 — Objective Investigation Workspace
 */

const { INVESTIGATION_STATUS, ARTIFACT_TYPES } = require('./workspace-schema');

class InvestigationManager {
  constructor(stateGraph, workspaceManager) {
    this.stateGraph = stateGraph;
    this.workspace = workspaceManager;
  }

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
  openInvestigation({ name, description, objective_id, incident_id, created_by }) {
    const investigation = this.workspace.createInvestigation({
      name,
      description,
      objective_id,
      incident_id,
      created_by,
    });

    // Automatically create investigation workspace artifact
    this.workspace.storeArtifact({
      artifact_type: ARTIFACT_TYPES.INVESTIGATION_WORKSPACE,
      content: `Investigation workspace created for: ${name}`,
      investigation_id: investigation.investigation_id,
      objective_id,
      incident_id,
      created_by,
    });

    // If objective provided, link objective artifacts
    if (objective_id) {
      this._linkObjectiveArtifacts(investigation.investigation_id, objective_id, created_by);
    }

    return investigation;
  }

  /**
   * Link objective to investigation
   * 
   * @param {string} investigation_id - Investigation ID
   * @param {string} objective_id - Objective ID
   * @param {string} linked_by - Operator
   * @returns {Object} Updated investigation
   */
  linkObjective(investigation_id, objective_id, linked_by) {
    const investigation = this.workspace.getInvestigation(investigation_id);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigation_id}`);
    }

    // Update investigation with objective link
    const stmt = this.stateGraph.db.prepare(`
      UPDATE workspace_investigations
      SET objective_id = ?, updated_at = ?
      WHERE investigation_id = ? AND environment = ?
    `);

    stmt.run(
      objective_id,
      new Date().toISOString(),
      investigation_id,
      this.stateGraph.environment
    );

    // Create link note
    this.workspace.storeArtifact({
      artifact_type: ARTIFACT_TYPES.INVESTIGATION_NOTE,
      content: `Linked to objective: ${objective_id} by ${linked_by}`,
      investigation_id,
      objective_id,
      created_by: linked_by,
    });

    // Link existing objective artifacts
    this._linkObjectiveArtifacts(investigation_id, objective_id, linked_by);

    return this.workspace.getInvestigation(investigation_id);
  }

  /**
   * Link trace to investigation
   * 
   * @param {string} investigation_id - Investigation ID
   * @param {string} intent_id - Intent ID
   * @param {string} linked_by - Operator
   * @returns {Object} Link result
   */
  linkTrace(investigation_id, intent_id, linked_by) {
    const investigation = this.workspace.getInvestigation(investigation_id);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigation_id}`);
    }

    // Get all artifacts for this intent
    const artifacts = this.workspace.listArtifacts({ intent_id });

    // Link each artifact to investigation
    const linked = artifacts.map(artifact => {
      return this.workspace.linkArtifact(artifact.artifact_id, {
        investigation_id,
      });
    });

    // Create link note
    this.workspace.storeArtifact({
      artifact_type: ARTIFACT_TYPES.INVESTIGATION_NOTE,
      content: `Linked trace ${intent_id} (${linked.length} artifacts) by ${linked_by}`,
      investigation_id,
      intent_id,
      created_by: linked_by,
    });

    return {
      investigation_id,
      intent_id,
      artifacts_linked: linked.length,
    };
  }

  /**
   * Add investigation note
   * 
   * @param {string} investigation_id - Investigation ID
   * @param {string} note - Note content (markdown)
   * @param {string} created_by - Operator
   * @returns {Object} Created artifact
   */
  addNote(investigation_id, note, created_by) {
    const investigation = this.workspace.getInvestigation(investigation_id);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigation_id}`);
    }

    return this.workspace.storeArtifact({
      artifact_type: ARTIFACT_TYPES.INVESTIGATION_NOTE,
      content: note,
      investigation_id,
      objective_id: investigation.objective_id,
      created_by,
    });
  }

  /**
   * Update investigation status
   * 
   * @param {string} investigation_id - Investigation ID
   * @param {string} status - New status (investigating, resolved, archived)
   * @param {string} updated_by - Operator
   * @param {string} [resolution_note] - Optional resolution note
   * @returns {Object} Updated investigation
   */
  updateStatus(investigation_id, status, updated_by, resolution_note = null) {
    const investigation = this.workspace.updateInvestigationStatus(
      investigation_id,
      status,
      updated_by
    );

    // If resolved, add resolution note
    if (status === INVESTIGATION_STATUS.RESOLVED && resolution_note) {
      this.workspace.storeArtifact({
        artifact_type: ARTIFACT_TYPES.INVESTIGATION_REPORT,
        content: resolution_note,
        investigation_id,
        objective_id: investigation.objective_id,
        created_by: updated_by,
      });
    }

    return investigation;
  }

  /**
   * Generate investigation report
   * 
   * @param {string} investigation_id - Investigation ID
   * @param {string} created_by - Operator
   * @returns {Object} Report artifact
   */
  generateReport(investigation_id) {
    const investigation = this.workspace.getInvestigation(investigation_id);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigation_id}`);
    }

    // Get all artifacts
    const artifacts = this.workspace.listArtifacts({ investigation_id });
    
    // Get notes
    const notes = artifacts.filter(a => a.artifact_type === ARTIFACT_TYPES.INVESTIGATION_NOTE);
    
    // Get traces
    const traces = artifacts.filter(a => a.artifact_type === ARTIFACT_TYPES.INTENT_TRACE);
    
    // Get objective if linked
    let objective = null;
    if (investigation.objective_id) {
      objective = this.stateGraph.getObjective(investigation.objective_id);
    }

    // Generate report
    const report = {
      investigation_id: investigation.investigation_id,
      name: investigation.name,
      description: investigation.description,
      status: investigation.status,
      created_at: investigation.created_at,
      resolved_at: investigation.resolved_at,
      created_by: investigation.created_by,
      
      objective: objective ? {
        objective_id: objective.objective_id,
        name: objective.name,
        status: objective.status,
      } : null,
      
      summary: {
        total_artifacts: artifacts.length,
        notes_count: notes.length,
        traces_count: traces.length,
      },
      
      notes: notes.map(n => ({
        created_at: n.created_at,
        created_by: n.created_by,
        content: this.workspace.getArtifactContent(n.artifact_id).toString('utf-8'),
      })),
      
      traces: traces.map(t => ({
        intent_id: t.intent_id,
        created_at: t.created_at,
      })),
    };

    return report;
  }

  /**
   * Export investigation report to artifact
   * 
   * @param {string} investigation_id - Investigation ID
   * @param {string} created_by - Operator
   * @returns {Object} Report artifact
   */
  exportReport(investigation_id, created_by) {
    const report = this.generateReport(investigation_id);

    return this.workspace.storeArtifact({
      artifact_type: ARTIFACT_TYPES.INVESTIGATION_REPORT,
      content: JSON.stringify(report, null, 2),
      investigation_id,
      objective_id: report.objective?.objective_id,
      created_by,
      mime_type: 'application/json',
    });
  }

  /**
   * List investigations with filters
   * 
   * @param {Object} filters - Filter criteria
   * @returns {Array} Investigations with summary
   */
  listInvestigations(filters = {}) {
    const investigations = this.workspace.listInvestigations(filters);

    return investigations.map(inv => {
      const artifactCount = this.workspace.listArtifacts({ 
        investigation_id: inv.investigation_id 
      }).length;

      return {
        ...inv,
        artifact_count: artifactCount,
      };
    });
  }

  /**
   * Get investigation summary
   * 
   * @param {string} investigation_id - Investigation ID
   * @returns {Object} Investigation with artifacts
   */
  getInvestigationSummary(investigation_id) {
    const investigation = this.workspace.getInvestigation(investigation_id);
    if (!investigation) {
      throw new Error(`Investigation not found: ${investigation_id}`);
    }

    const artifacts = this.workspace.listArtifacts({ investigation_id });
    
    const summary = {
      ...investigation,
      artifacts: {
        total: artifacts.length,
        by_type: {},
      },
    };

    // Count by type
    artifacts.forEach(artifact => {
      if (!summary.artifacts.by_type[artifact.artifact_type]) {
        summary.artifacts.by_type[artifact.artifact_type] = 0;
      }
      summary.artifacts.by_type[artifact.artifact_type]++;
    });

    return summary;
  }

  /**
   * Link objective artifacts to investigation
   * @private
   */
  _linkObjectiveArtifacts(investigation_id, objective_id, linked_by) {
    // Get objective-related artifacts
    const artifacts = this.workspace.listArtifacts({ objective_id });

    // Link to investigation
    artifacts.forEach(artifact => {
      if (!artifact.parent_investigation_id) {
        this.workspace.linkArtifact(artifact.artifact_id, { investigation_id });
      }
    });

    return artifacts.length;
  }
}

module.exports = { InvestigationManager };
