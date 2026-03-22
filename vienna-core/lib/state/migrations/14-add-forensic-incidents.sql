-- Phase 14: Forensic Incident Container
-- Migration: Add forensic_incidents table + relationship tables
-- Created: 2026-03-14

-- Forensic Incidents: top-level investigation containers
-- Note: Distinct from existing `incidents` table (system/service incidents)
-- `forensic_incidents` organizes operator investigations across multiple actions
CREATE TABLE IF NOT EXISTS forensic_incidents (
  incident_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK(status IN ('open', 'investigating', 'resolved', 'archived')),
  created_by TEXT, -- operator username
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_forensic_incidents_status ON forensic_incidents(status);
CREATE INDEX IF NOT EXISTS idx_forensic_incidents_severity ON forensic_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_forensic_incidents_created_at ON forensic_incidents(created_at DESC);

-- Relationship: Incident → Investigations
CREATE TABLE IF NOT EXISTS incident_investigations (
  incident_id TEXT NOT NULL,
  investigation_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  linked_by TEXT, -- operator username
  PRIMARY KEY (incident_id, investigation_id),
  FOREIGN KEY (incident_id) REFERENCES forensic_incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (investigation_id) REFERENCES workspace_investigations(investigation_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incident_investigations_incident ON incident_investigations(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_investigations_investigation ON incident_investigations(investigation_id);

-- Relationship: Incident → Intents
CREATE TABLE IF NOT EXISTS incident_intents (
  incident_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  linked_by TEXT,
  PRIMARY KEY (incident_id, intent_id),
  FOREIGN KEY (incident_id) REFERENCES forensic_incidents(incident_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incident_intents_incident ON incident_intents(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_intents_intent ON incident_intents(intent_id);

-- Relationship: Incident → Objectives
CREATE TABLE IF NOT EXISTS incident_objectives (
  incident_id TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  linked_by TEXT,
  PRIMARY KEY (incident_id, objective_id),
  FOREIGN KEY (incident_id) REFERENCES forensic_incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (objective_id) REFERENCES managed_objectives(objective_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incident_objectives_incident ON incident_objectives(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_objectives_objective ON incident_objectives(objective_id);

-- Relationship: Incident → Artifacts
CREATE TABLE IF NOT EXISTS incident_artifacts (
  incident_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  linked_by TEXT,
  PRIMARY KEY (incident_id, artifact_id),
  FOREIGN KEY (incident_id) REFERENCES forensic_incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (artifact_id) REFERENCES workspace_artifacts(artifact_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incident_artifacts_incident ON incident_artifacts(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_artifacts_artifact ON incident_artifacts(artifact_id);
