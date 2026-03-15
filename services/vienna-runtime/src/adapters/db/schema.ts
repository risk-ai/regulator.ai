/**
 * Vienna Runtime SQLite Schema
 * 
 * This schema defines the core Vienna state graph entities for Stage 4 development.
 * Production will migrate to Postgres via Neon, but schema structure remains compatible.
 */

export const SCHEMA_SQL = `
-- Investigations
CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK(status IN ('open', 'investigating', 'resolved', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK(status IN ('open', 'investigating', 'mitigated', 'resolved', 'closed')),
  detected_at TEXT NOT NULL,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Artifacts
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  artifact_type TEXT NOT NULL CHECK(artifact_type IN (
    'investigation_workspace',
    'investigation_notes',
    'investigation_report',
    'intent_trace',
    'execution_graph',
    'timeline_export',
    'execution_stdout',
    'execution_stderr',
    'state_snapshot',
    'config_snapshot',
    'objective_history',
    'objective_analysis',
    'incident_timeline',
    'incident_postmortem'
  )),
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  investigation_id TEXT,
  intent_id TEXT,
  execution_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

-- Traces
CREATE TABLE IF NOT EXISTS traces (
  id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL UNIQUE,
  intent_text TEXT NOT NULL,
  interpretation TEXT,
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'denied', 'executing', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trace timeline entries
CREATE TABLE IF NOT EXISTS trace_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_timestamp TEXT NOT NULL,
  actor TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE
);

-- Executions
CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  plan_id TEXT,
  action_type TEXT NOT NULL,
  target_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'succeeded', 'failed')),
  started_at TEXT,
  completed_at TEXT,
  execution_duration_ms INTEGER,
  exit_code INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE
);

-- Objectives
CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  objective_type TEXT NOT NULL CHECK(objective_type IN ('service', 'endpoint', 'provider', 'resource', 'system')),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  desired_state TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN (
    'declared', 'monitoring', 'healthy', 'violation_detected',
    'remediation_triggered', 'remediation_running', 'verification',
    'restored', 'failed', 'suspended', 'archived'
  )),
  evaluation_interval_seconds INTEGER NOT NULL DEFAULT 300,
  last_evaluated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Investigation-Incident relationships
CREATE TABLE IF NOT EXISTS incident_investigations (
  investigation_id TEXT NOT NULL,
  incident_id TEXT NOT NULL,
  PRIMARY KEY (investigation_id, incident_id),
  FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- Incident-Artifact relationships
CREATE TABLE IF NOT EXISTS incident_artifacts (
  incident_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  PRIMARY KEY (incident_id, artifact_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

-- Incident-Intent relationships
CREATE TABLE IF NOT EXISTS incident_intents (
  incident_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  PRIMARY KEY (incident_id, intent_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- Incident-Objective relationships
CREATE TABLE IF NOT EXISTS incident_objectives (
  incident_id TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  PRIMARY KEY (incident_id, objective_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);
CREATE INDEX IF NOT EXISTS idx_investigations_created_at ON investigations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_detected_at ON incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_investigation_id ON artifacts(investigation_id);
CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status);
CREATE INDEX IF NOT EXISTS idx_trace_timeline_trace_id ON trace_timeline(trace_id);
CREATE INDEX IF NOT EXISTS idx_executions_trace_id ON executions(trace_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_target ON objectives(target_type, target_id);
`;

export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: SCHEMA_SQL,
  },
];
