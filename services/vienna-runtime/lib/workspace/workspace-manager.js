/**
 * Workspace Manager
 * 
 * Investigation-oriented file system for Vienna OS operators.
 * 
 * Core responsibilities:
 * - Create/manage investigation workspaces
 * - Store/retrieve execution artifacts
 * - Link artifacts to intents/executions/objectives
 * - Provide workspace file tree for operator UI
 * 
 * Phase 12 Stage 1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const {
  ARTIFACT_TYPES,
  ARTIFACT_STATUS,
  INVESTIGATION_STATUS,
  validateArtifact,
  validateInvestigation,
  normalizeArtifactFilters,
  normalizeInvestigationFilters,
} = require('./workspace-schema');

class WorkspaceManager {
  constructor(stateGraph, options = {}) {
    this.stateGraph = stateGraph;
    this.environment = stateGraph.environment;
    
    // Workspace root: ~/.openclaw/runtime/{prod|test}/workspace/
    this.workspaceRoot = options.workspaceRoot || 
      path.join(process.env.HOME, '.openclaw', 'runtime', this.environment, 'workspace');
    
    // Ensure workspace directories exist
    this._ensureWorkspaceStructure();
  }

  /**
   * Ensure workspace directory structure exists
   * @private
   */
  _ensureWorkspaceStructure() {
    const dirs = [
      this.workspaceRoot,
      path.join(this.workspaceRoot, 'investigations'),
      path.join(this.workspaceRoot, 'traces'),
      path.join(this.workspaceRoot, 'artifacts'),
      path.join(this.workspaceRoot, 'templates'),
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

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
  createInvestigation({ name, description, objective_id, incident_id, created_by }) {
    const investigation_id = `inv-${uuidv4()}`;
    const now = new Date().toISOString();

    const investigation = {
      investigation_id,
      name,
      description,
      objective_id: objective_id || null,
      incident_id: incident_id || null,
      status: INVESTIGATION_STATUS.OPEN,
      created_by,
      created_at: now,
      resolved_at: null,
      archived_at: null,
      environment: this.environment,
      metadata_json: JSON.stringify({}),
    };

    // Validate
    const validation = validateInvestigation(investigation);
    if (!validation.valid) {
      throw new Error(`Invalid investigation: ${validation.errors.join(', ')}`);
    }

    // Insert into State Graph
    const stmt = this.stateGraph.db.prepare(`
      INSERT INTO workspace_investigations (
        investigation_id, name, description, objective_id, incident_id,
        status, created_by, created_at, resolved_at, archived_at,
        environment, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      investigation.investigation_id,
      investigation.name,
      investigation.description,
      investigation.objective_id,
      investigation.incident_id,
      investigation.status,
      investigation.created_by,
      investigation.created_at,
      investigation.resolved_at,
      investigation.archived_at,
      investigation.environment,
      investigation.metadata_json
    );

    // Create filesystem directory
    const investigationDir = path.join(
      this.workspaceRoot,
      'investigations',
      this._sanitizeName(name)
    );

    if (!fs.existsSync(investigationDir)) {
      fs.mkdirSync(investigationDir, { recursive: true });
      
      // Create README
      const readme = this._generateInvestigationReadme(investigation);
      fs.writeFileSync(path.join(investigationDir, 'README.md'), readme);
    }

    return {
      ...investigation,
      workspace_path: investigationDir,
    };
  }

  /**
   * Get investigation by ID
   * 
   * @param {string} investigation_id - Investigation ID
   * @returns {Object|null} Investigation metadata
   */
  getInvestigation(investigation_id) {
    const stmt = this.stateGraph.db.prepare(`
      SELECT * FROM workspace_investigations
      WHERE investigation_id = ? AND environment = ?
    `);

    const row = stmt.get(investigation_id, this.environment);
    if (!row) return null;

    return {
      ...row,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      workspace_path: path.join(
        this.workspaceRoot,
        'investigations',
        this._sanitizeName(row.name)
      ),
    };
  }

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
  listInvestigations(filters = {}) {
    const normalized = normalizeInvestigationFilters(filters);
    
    let query = `
      SELECT * FROM workspace_investigations
      WHERE environment = ?
    `;
    const params = [this.environment];

    if (normalized.status) {
      query += ` AND status = ?`;
      params.push(normalized.status);
    }

    if (normalized.objective_id) {
      query += ` AND objective_id = ?`;
      params.push(normalized.objective_id);
    }

    if (normalized.incident_id) {
      query += ` AND incident_id = ?`;
      params.push(normalized.incident_id);
    }

    if (normalized.created_by) {
      query += ` AND created_by = ?`;
      params.push(normalized.created_by);
    }

    if (normalized.date_after) {
      query += ` AND created_at >= ?`;
      params.push(normalized.date_after);
    }

    if (normalized.date_before) {
      query += ` AND created_at <= ?`;
      params.push(normalized.date_before);
    }

    query += ` ORDER BY created_at DESC`;

    if (normalized.limit) {
      query += ` LIMIT ?`;
      params.push(normalized.limit);
    }

    const stmt = this.stateGraph.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      ...row,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      workspace_path: path.join(
        this.workspaceRoot,
        'investigations',
        this._sanitizeName(row.name)
      ),
    }));
  }

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
  storeArtifact({
    artifact_type,
    content,
    artifact_path,
    investigation_id,
    intent_id,
    execution_id,
    objective_id,
    incident_id,
    created_by,
    mime_type,
  }) {
    const artifact_id = `artifact-${uuidv4()}`;
    const now = new Date().toISOString();

    // Auto-generate path if not provided
    if (!artifact_path) {
      artifact_path = this._generateArtifactPath(artifact_type, {
        investigation_id,
        intent_id,
        execution_id,
        objective_id,
      });
    }

    const fullPath = path.join(this.workspaceRoot, artifact_path);

    // Write content to filesystem
    const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const contentHash = crypto.createHash('sha256').update(contentBuffer).digest('hex');
    const size_bytes = contentBuffer.length;

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contentBuffer);

    // Store metadata in State Graph
    const artifact = {
      artifact_id,
      artifact_type,
      artifact_path,
      parent_investigation_id: investigation_id || null,
      intent_id: intent_id || null,
      execution_id: execution_id || null,
      objective_id: objective_id || null,
      incident_id: incident_id || null,
      content_hash: contentHash,
      size_bytes,
      mime_type: mime_type || this._guessMimeType(artifact_type),
      status: ARTIFACT_STATUS.ACTIVE,
      created_by,
      created_at: now,
      archived_at: null,
      deleted_at: null,
      environment: this.environment,
      metadata_json: JSON.stringify({}),
    };

    // Validate
    const validation = validateArtifact(artifact);
    if (!validation.valid) {
      throw new Error(`Invalid artifact: ${validation.errors.join(', ')}`);
    }

    const stmt = this.stateGraph.db.prepare(`
      INSERT INTO workspace_artifacts (
        artifact_id, artifact_type, artifact_path, parent_investigation_id,
        intent_id, execution_id, objective_id, incident_id,
        content_hash, size_bytes, mime_type,
        status, created_by, created_at, archived_at, deleted_at,
        environment, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      artifact.artifact_id,
      artifact.artifact_type,
      artifact.artifact_path,
      artifact.parent_investigation_id,
      artifact.intent_id,
      artifact.execution_id,
      artifact.objective_id,
      artifact.incident_id,
      artifact.content_hash,
      artifact.size_bytes,
      artifact.mime_type,
      artifact.status,
      artifact.created_by,
      artifact.created_at,
      artifact.archived_at,
      artifact.deleted_at,
      artifact.environment,
      artifact.metadata_json
    );

    return artifact;
  }

  /**
   * Get artifact by ID
   * 
   * @param {string} artifact_id - Artifact ID
   * @returns {Object|null} Artifact metadata
   */
  getArtifact(artifact_id) {
    const stmt = this.stateGraph.db.prepare(`
      SELECT * FROM workspace_artifacts
      WHERE artifact_id = ? AND environment = ?
    `);

    const row = stmt.get(artifact_id, this.environment);
    if (!row) return null;

    return {
      ...row,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      full_path: path.join(this.workspaceRoot, row.artifact_path),
    };
  }

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
  listArtifacts(filters = {}) {
    const normalized = normalizeArtifactFilters(filters);
    
    let query = `
      SELECT * FROM workspace_artifacts
      WHERE environment = ?
    `;
    const params = [this.environment];

    // Status filter (default: active only, unless explicitly specified)
    if (normalized.status) {
      query += ` AND status = ?`;
      params.push(normalized.status);
    } else {
      query += ` AND status = 'active'`;
    }

    if (normalized.artifact_type) {
      query += ` AND artifact_type = ?`;
      params.push(normalized.artifact_type);
    }

    if (normalized.investigation_id) {
      query += ` AND parent_investigation_id = ?`;
      params.push(normalized.investigation_id);
    }

    if (normalized.intent_id) {
      query += ` AND intent_id = ?`;
      params.push(normalized.intent_id);
    }

    if (normalized.execution_id) {
      query += ` AND execution_id = ?`;
      params.push(normalized.execution_id);
    }

    if (normalized.objective_id) {
      query += ` AND objective_id = ?`;
      params.push(normalized.objective_id);
    }

    if (normalized.incident_id) {
      query += ` AND incident_id = ?`;
      params.push(normalized.incident_id);
    }

    if (normalized.created_by) {
      query += ` AND created_by = ?`;
      params.push(normalized.created_by);
    }

    if (normalized.date_after) {
      query += ` AND created_at >= ?`;
      params.push(normalized.date_after);
    }

    if (normalized.date_before) {
      query += ` AND created_at <= ?`;
      params.push(normalized.date_before);
    }

    query += ` ORDER BY created_at DESC`;

    if (normalized.limit) {
      query += ` LIMIT ?`;
      params.push(normalized.limit);
    }

    const stmt = this.stateGraph.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      ...row,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      full_path: path.join(this.workspaceRoot, row.artifact_path),
    }));
  }

  /**
   * Get artifact content
   * 
   * @param {string} artifact_id - Artifact ID
   * @returns {Buffer|null} Artifact content
   */
  getArtifactContent(artifact_id) {
    const artifact = this.getArtifact(artifact_id);
    if (!artifact) return null;

    const fullPath = path.join(this.workspaceRoot, artifact.artifact_path);
    if (!fs.existsSync(fullPath)) return null;

    return fs.readFileSync(fullPath);
  }

  /**
   * Generate workspace file tree for operator UI
   * 
   * @returns {Object} File tree structure
   */
  getWorkspaceTree() {
    const tree = {
      investigations: [],
      recent_artifacts: [],
      recent_traces: [],
    };

    // Get open investigations
    const openInvestigations = this.listInvestigations({ status: INVESTIGATION_STATUS.OPEN, limit: 10 });
    tree.investigations = openInvestigations.map(inv => ({
      investigation_id: inv.investigation_id,
      name: inv.name,
      created_at: inv.created_at,
      artifact_count: this._countInvestigationArtifacts(inv.investigation_id),
    }));

    // Get recent artifacts
    const recentArtifacts = this.listArtifacts({ limit: 20 });
    tree.recent_artifacts = recentArtifacts.map(artifact => ({
      artifact_id: artifact.artifact_id,
      artifact_type: artifact.artifact_type,
      artifact_path: artifact.artifact_path,
      size_bytes: artifact.size_bytes,
      created_at: artifact.created_at,
    }));

    // Get recent traces
    const recentTraces = this.listArtifacts({ 
      artifact_type: ARTIFACT_TYPES.INTENT_TRACE,
      limit: 10
    });
    tree.recent_traces = recentTraces.map(trace => ({
      artifact_id: trace.artifact_id,
      intent_id: trace.intent_id,
      created_at: trace.created_at,
    }));

    return tree;
  }

  /**
   * Count artifacts for investigation
   * @private
   */
  _countInvestigationArtifacts(investigation_id) {
    const stmt = this.stateGraph.db.prepare(`
      SELECT COUNT(*) as count FROM workspace_artifacts
      WHERE parent_investigation_id = ? AND environment = ? AND status = 'active'
    `);
    const row = stmt.get(investigation_id, this.environment);
    return row ? row.count : 0;
  }

  /**
   * Sanitize name for filesystem
   * @private
   */
  _sanitizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 64);
  }

  /**
   * Generate artifact path
   * @private
   */
  _generateArtifactPath(artifact_type, context) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (context.investigation_id) {
      return `investigations/${this._sanitizeName(context.investigation_id)}/${artifact_type}_${Date.now()}.json`;
    }

    if (context.intent_id) {
      return `traces/${timestamp}/${context.intent_id}_${artifact_type}.json`;
    }

    if (context.execution_id) {
      return `artifacts/${timestamp}/${context.execution_id}_${artifact_type}.log`;
    }

    return `artifacts/${timestamp}/${artifact_type}_${Date.now()}.txt`;
  }

  /**
   * Guess MIME type from artifact type
   * @private
   */
  _guessMimeType(artifact_type) {
    const mapping = {
      [ARTIFACT_TYPES.INTENT_TRACE]: 'application/json',
      [ARTIFACT_TYPES.EXECUTION_GRAPH]: 'application/json',
      [ARTIFACT_TYPES.TIMELINE_EXPORT]: 'application/json',
      [ARTIFACT_TYPES.OBJECTIVE_HISTORY]: 'application/json',
      [ARTIFACT_TYPES.STATE_SNAPSHOT]: 'application/json',
      [ARTIFACT_TYPES.CONFIG_SNAPSHOT]: 'application/json',
      [ARTIFACT_TYPES.EXECUTION_STDOUT]: 'text/plain',
      [ARTIFACT_TYPES.EXECUTION_STDERR]: 'text/plain',
      [ARTIFACT_TYPES.INVESTIGATION_NOTES]: 'text/markdown',
      [ARTIFACT_TYPES.INVESTIGATION_REPORT]: 'text/markdown',
      [ARTIFACT_TYPES.INCIDENT_POSTMORTEM]: 'text/markdown',
    };

    return mapping[artifact_type] || 'text/plain';
  }

  /**
   * Update investigation status (Phase 12.2)
   * 
   * @param {string} investigation_id - Investigation ID
   * @param {string} status - New status
   * @param {string} updated_by - Operator who updated status
   * @returns {Object} Updated investigation
   */
  updateInvestigationStatus(investigation_id, status, updated_by) {
    // Validate status
    if (!Object.values(INVESTIGATION_STATUS).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const now = new Date().toISOString();
    const updates = { status, updated_at: now };

    if (status === INVESTIGATION_STATUS.RESOLVED) {
      updates.resolved_at = now;
    } else if (status === INVESTIGATION_STATUS.ARCHIVED) {
      updates.archived_at = now;
    }

    const stmt = this.stateGraph.db.prepare(`
      UPDATE workspace_investigations
      SET status = ?, resolved_at = ?, archived_at = ?, updated_at = ?
      WHERE investigation_id = ? AND environment = ?
    `);

    stmt.run(
      updates.status,
      updates.resolved_at || null,
      updates.archived_at || null,
      updates.updated_at,
      investigation_id,
      this.environment
    );

    // Store status change as artifact (audit trail)
    this.storeArtifact({
      artifact_type: ARTIFACT_TYPES.INVESTIGATION_NOTE,
      content: `Investigation status changed to ${status} by ${updated_by} at ${now}`,
      investigation_id,
      created_by: updated_by,
    });

    return this.getInvestigation(investigation_id);
  }

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
  linkArtifact(artifact_id, context) {
    const artifact = this.getArtifact(artifact_id);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifact_id}`);
    }

    const updates = [];
    const params = [];

    if (context.intent_id !== undefined) {
      updates.push('intent_id = ?');
      params.push(context.intent_id);
    }
    if (context.execution_id !== undefined) {
      updates.push('execution_id = ?');
      params.push(context.execution_id);
    }
    if (context.objective_id !== undefined) {
      updates.push('objective_id = ?');
      params.push(context.objective_id);
    }
    if (context.investigation_id !== undefined) {
      updates.push('parent_investigation_id = ?');
      params.push(context.investigation_id);
    }

    if (updates.length === 0) {
      throw new Error('No context provided for linking');
    }

    params.push(artifact_id);
    params.push(this.environment);

    const stmt = this.stateGraph.db.prepare(`
      UPDATE workspace_artifacts
      SET ${updates.join(', ')}
      WHERE artifact_id = ? AND environment = ?
    `);

    stmt.run(...params);

    return this.getArtifact(artifact_id);
  }

  /**
   * Search artifacts by metadata (Phase 12.2)
   * 
   * @param {Object} metadata - Metadata key-value pairs
   * @returns {Array} Matching artifacts
   */
  searchArtifactsByMetadata(metadata) {
    // Simple implementation: load all artifacts and filter by metadata
    // For production, consider FTS or JSON query capabilities
    const allArtifacts = this.listArtifacts({ limit: 1000 });
    
    return allArtifacts.filter(artifact => {
      if (!artifact.metadata) return false;
      
      return Object.entries(metadata).every(([key, value]) => {
        return artifact.metadata[key] === value;
      });
    });
  }

  /**
   * Get cross-linked artifacts (Phase 12.2)
   * 
   * Returns all artifacts linked to the same context (intent/execution/objective/investigation)
   * 
   * @param {string} artifact_id - Artifact ID
   * @returns {Object} Related artifacts grouped by context
   */
  getCrossLinkedArtifacts(artifact_id) {
    const artifact = this.getArtifact(artifact_id);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifact_id}`);
    }

    const related = {
      by_intent: [],
      by_execution: [],
      by_objective: [],
      by_investigation: [],
    };

    if (artifact.intent_id) {
      related.by_intent = this.listArtifacts({ intent_id: artifact.intent_id })
        .filter(a => a.artifact_id !== artifact_id);
    }

    if (artifact.execution_id) {
      related.by_execution = this.listArtifacts({ execution_id: artifact.execution_id })
        .filter(a => a.artifact_id !== artifact_id);
    }

    if (artifact.objective_id) {
      related.by_objective = this.listArtifacts({ objective_id: artifact.objective_id })
        .filter(a => a.artifact_id !== artifact_id);
    }

    if (artifact.parent_investigation_id) {
      related.by_investigation = this.listArtifacts({ investigation_id: artifact.parent_investigation_id })
        .filter(a => a.artifact_id !== artifact_id);
    }

    return related;
  }

  /**
   * Generate investigation README
   * @private
   */
  _generateInvestigationReadme(investigation) {
    return `# ${investigation.name}

**Investigation ID:** ${investigation.investigation_id}  
**Created:** ${investigation.created_at}  
**Created by:** ${investigation.created_by}  
**Status:** ${investigation.status}

## Description

${investigation.description || 'No description provided.'}

## Context

${investigation.objective_id ? `- **Objective:** ${investigation.objective_id}` : ''}
${investigation.incident_id ? `- **Incident:** ${investigation.incident_id}` : ''}

## Artifacts

Artifacts for this investigation will appear here.

## Notes

_Add investigation notes here._
`;
  }
}

module.exports = { WorkspaceManager };
