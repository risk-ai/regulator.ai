-- Phase 15 Migration: Detection Layer
-- Adds anomalies and proposals tables for detection → objective → proposal flow

-- ============================================================================
-- Anomalies Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS anomalies (
  anomaly_id TEXT PRIMARY KEY,
  anomaly_type TEXT NOT NULL CHECK(anomaly_type IN ('state', 'behavioral', 'policy', 'temporal', 'graph')),
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  source TEXT NOT NULL,  -- Detector name
  entity_type TEXT CHECK(entity_type IN ('service', 'provider', 'objective', 'intent', 'execution', 'plan', 'policy', 'endpoint', 'verification', 'investigation', 'incident')),
  entity_id TEXT,
  evidence TEXT NOT NULL,  -- JSON structure with detection evidence
  confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
  detected_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewing', 'acknowledged', 'resolved', 'false_positive')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  resolution TEXT,
  metadata TEXT,  -- JSON for additional context
  
  -- Constraints
  CHECK(
    (entity_id IS NULL AND entity_type IS NULL) OR
    (entity_id IS NOT NULL AND entity_type IS NOT NULL)
  ),
  CHECK(
    (status = 'new') OR
    (status != 'new' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

-- Indexes for anomaly queries
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_entity ON anomalies(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies(detected_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_source ON anomalies(source);

-- ============================================================================
-- Anomaly History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS anomaly_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anomaly_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- detected, reviewed, resolved, false_positive, objective_declared, proposal_created
  event_data TEXT,  -- JSON with event-specific data
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (anomaly_id) REFERENCES anomalies(anomaly_id) ON DELETE CASCADE
);

-- Index for anomaly history queries
CREATE INDEX IF NOT EXISTS idx_anomaly_history_anomaly_id ON anomaly_history(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_history_event_type ON anomaly_history(event_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_history_created_at ON anomaly_history(created_at);

-- ============================================================================
-- Proposals Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposals (
  proposal_id TEXT PRIMARY KEY,
  proposal_type TEXT NOT NULL CHECK(proposal_type IN ('investigate', 'restore', 'reconcile', 'escalate', 'notify', 'quarantine')),
  objective_id TEXT,
  anomaly_id TEXT,
  suggested_intent TEXT NOT NULL,  -- JSON IntentObject structure
  rationale TEXT NOT NULL,
  risk_assessment TEXT NOT NULL,  -- JSON with risk_tier, impact, reversibility
  confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'modified', 'expired', 'executed')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  approval_decision TEXT,  -- JSON with approval/rejection details
  expires_at TEXT NOT NULL,
  plan_id TEXT,  -- Set after admission to governance
  execution_id TEXT,  -- Set after execution starts
  metadata TEXT,  -- JSON for additional context
  
  -- Constraints
  CHECK(expires_at > created_at),
  CHECK(
    (status = 'pending' OR status = 'expired') OR
    (status IN ('approved', 'rejected', 'modified') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CHECK(
    (status NOT IN ('approved', 'rejected')) OR
    (status IN ('approved', 'rejected') AND approval_decision IS NOT NULL)
  ),
  
  -- Foreign keys
  FOREIGN KEY (objective_id) REFERENCES managed_objectives(objective_id) ON DELETE SET NULL,
  FOREIGN KEY (anomaly_id) REFERENCES anomalies(anomaly_id) ON DELETE SET NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id) ON DELETE SET NULL
);

-- Indexes for proposal queries
CREATE INDEX IF NOT EXISTS idx_proposals_type ON proposals(proposal_type);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_objective_id ON proposals(objective_id);
CREATE INDEX IF NOT EXISTS idx_proposals_anomaly_id ON proposals(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_expires_at ON proposals(expires_at);
CREATE INDEX IF NOT EXISTS idx_proposals_plan_id ON proposals(plan_id);

-- ============================================================================
-- Proposal History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS proposal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- created, reviewed, approved, rejected, modified, expired, policy_blocked, admitted_to_governance, executed
  event_data TEXT,  -- JSON with event-specific data
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id) ON DELETE CASCADE
);

-- Index for proposal history queries
CREATE INDEX IF NOT EXISTS idx_proposal_history_proposal_id ON proposal_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_history_event_type ON proposal_history(event_type);
CREATE INDEX IF NOT EXISTS idx_proposal_history_created_at ON proposal_history(created_at);

-- ============================================================================
-- Graph Relationships
-- ============================================================================

-- Anomaly → Objective linkage (many-to-many via objective metadata for now)
-- Anomaly → Incident linkage
CREATE TABLE IF NOT EXISTS incident_anomalies (
  incident_id TEXT NOT NULL,
  anomaly_id TEXT NOT NULL,
  linked_by TEXT,
  linked_at TEXT NOT NULL,
  
  PRIMARY KEY (incident_id, anomaly_id),
  FOREIGN KEY (incident_id) REFERENCES forensic_incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (anomaly_id) REFERENCES anomalies(anomaly_id) ON DELETE CASCADE
);

-- Proposal → Incident linkage
CREATE TABLE IF NOT EXISTS incident_proposals (
  incident_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  linked_by TEXT,
  linked_at TEXT NOT NULL,
  
  PRIMARY KEY (incident_id, proposal_id),
  FOREIGN KEY (incident_id) REFERENCES forensic_incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id) ON DELETE CASCADE
);

-- ============================================================================
-- Event Type Extensions (for execution_ledger_events)
-- ============================================================================

-- Note: This is informational - event types are not constrained in execution_ledger_events
-- New event types added in Phase 15:
--   - anomaly.detected
--   - anomaly.reviewed
--   - anomaly.resolved
--   - anomaly.false_positive
--   - objective.auto_declared
--   - objective.proposal_generated
--   - proposal.created
--   - proposal.reviewed
--   - proposal.approved
--   - proposal.rejected
--   - proposal.modified
--   - proposal.expired
--   - proposal.policy_blocked
--   - proposal.admitted_to_governance
--   - proposal.executed

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Version tracking (if not already present)
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_version (version, applied_at)
VALUES (15, datetime('now'));
