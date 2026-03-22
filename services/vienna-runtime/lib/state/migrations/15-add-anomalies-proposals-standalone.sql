-- Phase 15 Standalone Migration (no Phase 14 dependencies)

CREATE TABLE IF NOT EXISTS anomalies (
  anomaly_id TEXT PRIMARY KEY,
  anomaly_type TEXT NOT NULL CHECK(anomaly_type IN ('state', 'behavioral', 'policy', 'temporal', 'graph')),
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  source TEXT NOT NULL,
  entity_type TEXT CHECK(entity_type IN ('service', 'provider', 'objective', 'intent', 'execution', 'plan', 'policy', 'endpoint', 'verification', 'investigation', 'incident')),
  entity_id TEXT,
  evidence TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
  detected_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewing', 'acknowledged', 'resolved', 'false_positive')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  resolution TEXT,
  metadata TEXT,
  CHECK(
    (entity_id IS NULL AND entity_type IS NULL) OR
    (entity_id IS NOT NULL AND entity_type IS NOT NULL)
  ),
  CHECK(
    (status = 'new') OR
    (status != 'new' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_entity ON anomalies(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies(detected_at);

CREATE TABLE IF NOT EXISTS anomaly_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anomaly_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anomaly_history_anomaly_id ON anomaly_history(anomaly_id);

CREATE TABLE IF NOT EXISTS proposals (
  proposal_id TEXT PRIMARY KEY,
  proposal_type TEXT NOT NULL CHECK(proposal_type IN ('investigate', 'restore', 'reconcile', 'escalate', 'notify', 'quarantine')),
  objective_id TEXT,
  anomaly_id TEXT,
  suggested_intent TEXT NOT NULL,
  rationale TEXT NOT NULL,
  risk_assessment TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0.0 AND confidence <= 1.0),
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'modified', 'expired', 'executed')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  approval_decision TEXT,
  expires_at TEXT NOT NULL,
  plan_id TEXT,
  execution_id TEXT,
  metadata TEXT,
  CHECK(expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_proposals_type ON proposals(proposal_type);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);

CREATE TABLE IF NOT EXISTS proposal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposal_history_proposal_id ON proposal_history(proposal_id);
