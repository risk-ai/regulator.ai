-- Phase 16 Migration: Assisted Autonomy
-- Adds agents, agent_proposals, and plans tables

-- ============================================================================
-- Agents Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT NOT NULL,  -- JSON array
  allowed_intent_types TEXT,   -- JSON array
  risk_level TEXT NOT NULL CHECK(risk_level IN ('T0_only', 'T1_allowed', 'T2_restricted')),
  max_plan_steps INTEGER NOT NULL DEFAULT 5,
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deprecated')),
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- ============================================================================
-- Agent Proposals Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_proposals (
  agent_proposal_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  context TEXT,  -- JSON
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  
  FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_proposals_agent_id ON agent_proposals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_proposals_status ON agent_proposals(status);
CREATE INDEX IF NOT EXISTS idx_agent_proposals_created_at ON agent_proposals(created_at);

-- ============================================================================
-- Plans Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
  plan_id TEXT PRIMARY KEY,
  objective_id TEXT,
  agent_proposal_id TEXT,
  steps TEXT NOT NULL,  -- JSON array of steps
  reasoning TEXT NOT NULL,
  expected_outcomes TEXT,  -- JSON array
  risk_assessment TEXT,    -- JSON
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'executing', 'completed', 'failed', 'cancelled')),
  metadata TEXT,
  
  FOREIGN KEY (agent_proposal_id) REFERENCES agent_proposals(agent_proposal_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_objective_id ON plans(objective_id);
CREATE INDEX IF NOT EXISTS idx_plans_agent_proposal_id ON plans(agent_proposal_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at);

-- ============================================================================
-- Plan Execution Log (for step-by-step tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_execution_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  intent_id TEXT,  -- Link to intent if step was translated
  status TEXT NOT NULL CHECK(status IN ('pending', 'executing', 'completed', 'failed', 'skipped')),
  started_at TEXT,
  completed_at TEXT,
  result TEXT,  -- JSON
  error TEXT,
  
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_execution_log_plan_id ON plan_execution_log(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_execution_log_step_id ON plan_execution_log(step_id);

-- ============================================================================
-- Agent Activity Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,  -- JSON
  created_at TEXT NOT NULL,
  
  FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_log_agent_id ON agent_activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_event_type ON agent_activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_activity_log_created_at ON agent_activity_log(created_at);

-- ============================================================================
-- Migration Version
-- ============================================================================

INSERT OR IGNORE INTO schema_version (version, applied_at)
VALUES (16, datetime('now'));
