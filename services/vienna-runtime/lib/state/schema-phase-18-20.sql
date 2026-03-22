-- Phase 18-20 Schema Extensions
-- Learning, Pattern Detection, Distributed Execution, Distributed Governance

-- =============================================================================
-- PHASE 18: SELF-CORRECTING LOOP
-- =============================================================================

-- Detected execution patterns
CREATE TABLE IF NOT EXISTS execution_patterns (
  pattern_id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL CHECK(pattern_type IN ('failure_cluster', 'policy_conflict', 'remediation_effectiveness')),
  
  -- Pattern characteristics
  action_type TEXT,
  target_type TEXT,
  target_id TEXT,
  policy_id TEXT,
  
  -- Observation window
  observation_window_days INTEGER NOT NULL,
  event_count INTEGER NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  
  -- Pattern metadata (JSON)
  metadata TEXT NOT NULL, -- failure_reason, first_observed, last_observed, evidence, etc.
  
  -- Lifecycle
  detected_at TEXT NOT NULL,
  last_updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'stale')),
  
  -- Indexes for fast queries
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patterns_type ON execution_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_status ON execution_patterns(status);
CREATE INDEX IF NOT EXISTS idx_patterns_action_type ON execution_patterns(action_type);
CREATE INDEX IF NOT EXISTS idx_patterns_detected_at ON execution_patterns(detected_at);

-- Policy recommendations (generated from patterns)
CREATE TABLE IF NOT EXISTS policy_recommendations (
  recommendation_id TEXT PRIMARY KEY,
  pattern_id TEXT REFERENCES execution_patterns(pattern_id),
  
  -- Recommendation type
  recommendation_type TEXT NOT NULL CHECK(recommendation_type IN (
    'relax_constraint',
    'add_exception',
    'adjust_threshold',
    'new_policy'
  )),
  
  -- Target policy
  policy_id TEXT NOT NULL,
  
  -- Proposed change (JSON)
  proposed_change TEXT NOT NULL,
  
  -- Expected benefit (JSON)
  expected_benefit TEXT NOT NULL,
  
  -- Evidence (JSON)
  evidence TEXT NOT NULL,
  
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'applied')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  applied_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_recommendations_status ON policy_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_pattern ON policy_recommendations(pattern_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON policy_recommendations(created_at);

-- Plan improvements (optimization suggestions)
CREATE TABLE IF NOT EXISTS plan_improvements (
  improvement_id TEXT PRIMARY KEY,
  plan_template_id TEXT NOT NULL,
  
  -- Improvement type
  improvement_type TEXT NOT NULL CHECK(improvement_type IN (
    'step_reordering',
    'verification_adjustment',
    'retry_tuning',
    'timeout_adjustment'
  )),
  
  -- Proposed change (JSON)
  proposed_change TEXT NOT NULL,
  
  -- Expected benefit (JSON)
  expected_benefit TEXT NOT NULL,
  
  -- Evidence (JSON)
  evidence TEXT NOT NULL,
  
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'applied')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  applied_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_improvements_status ON plan_improvements(status);
CREATE INDEX IF NOT EXISTS idx_improvements_template ON plan_improvements(plan_template_id);
CREATE INDEX IF NOT EXISTS idx_improvements_created_at ON plan_improvements(created_at);

-- Operator feedback (approval/denial patterns)
CREATE TABLE IF NOT EXISTS operator_feedback (
  feedback_id TEXT PRIMARY KEY,
  
  -- Approval context
  execution_id TEXT,
  approval_id TEXT,
  plan_id TEXT,
  
  -- Decision
  decision TEXT NOT NULL CHECK(decision IN ('approved', 'denied')),
  decision_time_ms INTEGER, -- Time to decision
  
  -- Pattern detection
  action_type TEXT,
  target_type TEXT,
  risk_tier TEXT CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  
  -- Reason (if denied)
  denial_reason TEXT,
  
  -- Aggregation
  similar_count INTEGER DEFAULT 1, -- How many similar decisions
  
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_decision ON operator_feedback(decision);
CREATE INDEX IF NOT EXISTS idx_feedback_action_type ON operator_feedback(action_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON operator_feedback(created_at);

-- =============================================================================
-- PHASE 19: DISTRIBUTED EXECUTION
-- =============================================================================

-- Execution nodes (Vienna instances)
CREATE TABLE IF NOT EXISTS execution_nodes (
  node_id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL CHECK(node_type IN ('worker', 'coordinator', 'hybrid')),
  
  -- Node info
  host TEXT NOT NULL,
  region TEXT,
  environment TEXT CHECK(environment IN ('production', 'staging', 'development')),
  
  -- Capabilities (JSON array)
  capabilities TEXT NOT NULL, -- ['systemd', 'docker', 'postgres', ...]
  
  -- Health
  status TEXT NOT NULL DEFAULT 'online' CHECK(status IN ('online', 'offline', 'degraded')),
  last_heartbeat_at TEXT NOT NULL,
  
  -- Load tracking
  current_load REAL DEFAULT 0 CHECK(current_load >= 0 AND current_load <= 1),
  
  -- Metadata (JSON)
  metadata TEXT,
  
  registered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nodes_status ON execution_nodes(status);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON execution_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_nodes_heartbeat ON execution_nodes(last_heartbeat_at);

-- Distributed execution assignments
CREATE TABLE IF NOT EXISTS execution_assignments (
  assignment_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  node_id TEXT NOT NULL REFERENCES execution_nodes(node_id),
  
  -- Assignment details
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  
  status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN (
    'assigned',
    'running',
    'completed',
    'failed',
    'cancelled'
  )),
  
  -- Result (JSON)
  result TEXT,
  
  FOREIGN KEY (execution_id) REFERENCES execution_ledger_summary(execution_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_execution ON execution_assignments(execution_id);
CREATE INDEX IF NOT EXISTS idx_assignments_node ON execution_assignments(node_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON execution_assignments(status);

-- =============================================================================
-- PHASE 20: DISTRIBUTED GOVERNANCE
-- =============================================================================

-- Distributed locks
CREATE TABLE IF NOT EXISTS distributed_locks (
  lock_id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('target', 'action', 'global')),
  
  -- Holder
  held_by TEXT NOT NULL, -- node_id
  
  -- Timing
  acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  
  -- Queue tracking
  wait_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_locks_resource ON distributed_locks(resource_id);
CREATE INDEX IF NOT EXISTS idx_locks_holder ON distributed_locks(held_by);
CREATE INDEX IF NOT EXISTS idx_locks_expires ON distributed_locks(expires_at);

-- Lock queue (waiting requests)
CREATE TABLE IF NOT EXISTS lock_queue (
  queue_entry_id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  holder_id TEXT NOT NULL,
  
  queued_at TEXT NOT NULL DEFAULT (datetime('now')),
  timeout_ms INTEGER,
  priority INTEGER DEFAULT 100,
  
  -- Metadata (JSON)
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_resource ON lock_queue(resource_id);
CREATE INDEX IF NOT EXISTS idx_queue_queued_at ON lock_queue(queued_at);

-- Federated ledger events (cross-node audit trail)
CREATE TABLE IF NOT EXISTS federated_ledger (
  event_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL, -- Originating node
  
  event_type TEXT NOT NULL,
  execution_id TEXT,
  
  -- Vector clock for ordering (JSON)
  vector_clock TEXT NOT NULL,
  
  -- Event payload (JSON)
  payload TEXT NOT NULL,
  
  -- Hash chain for integrity
  prev_hash TEXT,
  event_hash TEXT NOT NULL,
  
  -- Tombstone support
  tombstoned INTEGER DEFAULT 0 CHECK(tombstoned IN (0, 1)),
  tombstoned_at TEXT,
  
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_federated_node ON federated_ledger(node_id);
CREATE INDEX IF NOT EXISTS idx_federated_execution ON federated_ledger(execution_id);
CREATE INDEX IF NOT EXISTS idx_federated_timestamp ON federated_ledger(timestamp);
CREATE INDEX IF NOT EXISTS idx_federated_tombstoned ON federated_ledger(tombstoned);
