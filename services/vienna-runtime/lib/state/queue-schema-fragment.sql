-- Phase 16.3: Queue System
CREATE TABLE IF NOT EXISTS queue_items (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK(state IN (
    'READY', 'BLOCKED_LOCK', 'BLOCKED_APPROVAL', 'BLOCKED_DEPENDENCY',
    'RETRY_SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
  
  blocked_reason TEXT CHECK(blocked_reason IN (
    'LOCK_CONFLICT', 'APPROVAL_REQUIRED', 'APPROVAL_PENDING',
    'DEPENDENCY_PENDING', 'DEPENDENCY_FAILED', 'TRANSIENT_EXECUTION_ERROR',
    'POLICY_RECHECK_DEFERRED', 'RATE_LIMITED'
  )),
  resume_condition_json TEXT,
  
  retry_policy_json TEXT,
  retry_json TEXT NOT NULL,
  
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  resumed_by TEXT,
  
  plan_id TEXT NOT NULL,
  execution_id TEXT,
  step_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  
  warrant_id TEXT,
  approval_id TEXT,
  verification_template_id TEXT,
  
  resource_keys_json TEXT NOT NULL,
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  policy_snapshot_id TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  queued_at TEXT NOT NULL,
  eligible_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  
  scheduler_lease_id TEXT,
  scheduler_lease_expires_at TEXT,
  
  last_transition_at TEXT NOT NULL,
  transition_reason TEXT,
  
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_state ON queue_items(state);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue_items(priority);
CREATE INDEX IF NOT EXISTS idx_queue_plan ON queue_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_queue_approval ON queue_items(approval_id);
CREATE INDEX IF NOT EXISTS idx_queue_eligible ON queue_items(state, eligible_at);
CREATE INDEX IF NOT EXISTS idx_queue_scheduler_lease ON queue_items(scheduler_lease_id, scheduler_lease_expires_at);
