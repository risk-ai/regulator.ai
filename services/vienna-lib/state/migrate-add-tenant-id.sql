-- Migration: Add tenant_id to existing tables
-- Run this on production database to apply Phase 15 schema changes

BEGIN TRANSACTION;

-- Add tenant_id to objectives (if not exists)
ALTER TABLE objectives ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_objectives_tenant ON objectives(tenant_id);

-- Add tenant_id to execution_ledger (if not exists)  
ALTER TABLE execution_ledger ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_execution_ledger_tenant ON execution_ledger(tenant_id);

-- Add tenant_id to execution_ledger_events (if not exists)
ALTER TABLE execution_ledger_events ADD COLUMN tenant_id TEXT DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_execution_ledger_events_tenant ON execution_ledger_events(tenant_id);

-- Create custom_actions table (Phase 15)
CREATE TABLE IF NOT EXISTS custom_actions (
  action_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action_name TEXT NOT NULL UNIQUE,
  intent_type TEXT NOT NULL,
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  schema_json TEXT,
  description TEXT,
  enabled INTEGER DEFAULT 1 CHECK(enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_custom_actions_tenant ON custom_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_actions_enabled ON custom_actions(enabled);

-- Create policies table (Phase 15)
CREATE TABLE IF NOT EXISTS policies (
  policy_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions_json TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  priority INTEGER DEFAULT 100,
  enabled INTEGER DEFAULT 1 CHECK(enabled IN (0, 1)),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies(priority DESC);

-- Create agents table (Phase 15)
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT,
  type TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  last_seen TEXT,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  blocked_executions INTEGER DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen DESC);

-- Create agent_activity view (Phase 15)
CREATE VIEW IF NOT EXISTS agent_activity AS
SELECT 
  el.agent_id,
  el.tenant_id,
  COUNT(*) as total_actions,
  SUM(CASE WHEN el.status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN el.status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN el.status = 'blocked' THEN 1 ELSE 0 END) as blocked,
  MAX(el.timestamp) as last_action,
  CAST(SUM(CASE WHEN el.status = 'completed' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100 as success_rate
FROM execution_ledger el
WHERE el.timestamp > datetime('now', '-7 days')
GROUP BY el.agent_id, el.tenant_id;

COMMIT;
