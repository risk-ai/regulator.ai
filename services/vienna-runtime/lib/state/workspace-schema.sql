-- Workspace Schema Extension
-- Investigation-oriented artifact storage for Vienna OS operators
-- Phase 12 Stage 1

-- Workspace Artifacts: Files, traces, reports, notes created during investigations
CREATE TABLE IF NOT EXISTS workspace_artifacts (
  artifact_id TEXT PRIMARY KEY,
  artifact_type TEXT NOT NULL CHECK(artifact_type IN (
    'investigation_workspace', 'investigation_notes', 'investigation_report',
    'intent_trace', 'execution_graph', 'timeline_export',
    'execution_stdout', 'execution_stderr', 'state_snapshot', 'config_snapshot',
    'objective_history', 'objective_analysis',
    'incident_timeline', 'incident_postmortem'
  )),
  artifact_path TEXT NOT NULL,
  parent_investigation_id TEXT,
  
  -- Linkage to execution context
  intent_id TEXT,
  execution_id TEXT,
  objective_id TEXT,
  incident_id TEXT,
  
  -- File metadata
  content_hash TEXT,
  size_bytes INTEGER,
  mime_type TEXT,
  
  -- Artifact lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  deleted_at TEXT,
  
  -- Environment separation
  environment TEXT NOT NULL CHECK(environment IN ('prod', 'test')),
  
  -- Metadata (tags, description, etc.)
  metadata_json TEXT,
  
  FOREIGN KEY (parent_investigation_id) REFERENCES workspace_investigations(investigation_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_type ON workspace_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_investigation ON workspace_artifacts(parent_investigation_id);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_intent ON workspace_artifacts(intent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_execution ON workspace_artifacts(execution_id);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_objective ON workspace_artifacts(objective_id);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_status ON workspace_artifacts(status);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_created ON workspace_artifacts(created_at);

-- Workspace Investigations: Operator-created workspaces for debugging specific issues
CREATE TABLE IF NOT EXISTS workspace_investigations (
  investigation_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Primary investigation context
  objective_id TEXT,
  incident_id TEXT,
  
  -- Investigation lifecycle
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'resolved', 'archived')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  archived_at TEXT,
  
  -- Environment separation
  environment TEXT NOT NULL CHECK(environment IN ('prod', 'test')),
  
  -- Metadata (tags, priority, assignee, etc.)
  metadata_json TEXT,
  
  FOREIGN KEY (objective_id) REFERENCES managed_objectives(objective_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_investigations_status ON workspace_investigations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_investigations_objective ON workspace_investigations(objective_id);
CREATE INDEX IF NOT EXISTS idx_workspace_investigations_incident ON workspace_investigations(incident_id);
CREATE INDEX IF NOT EXISTS idx_workspace_investigations_created ON workspace_investigations(created_at);

-- Workspace Artifact Tags: Many-to-many relationship for artifact organization
CREATE TABLE IF NOT EXISTS workspace_artifact_tags (
  artifact_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (artifact_id, tag),
  FOREIGN KEY (artifact_id) REFERENCES workspace_artifacts(artifact_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_artifact_tags_tag ON workspace_artifact_tags(tag);
