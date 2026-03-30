-- Migration: Action Types Registry
-- Description: Central registry for all action types supported by Vienna OS
-- Date: 2026-03-29

CREATE TABLE IF NOT EXISTS action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'system', 'data', 'agent', 'policy', 'audit', 'config', 'alert', 'integration'
  default_risk_tier TEXT DEFAULT 'T0',
  enabled BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  handler_path TEXT, -- Path to execution handler
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_types_category ON action_types(category);
CREATE INDEX IF NOT EXISTS idx_action_types_enabled ON action_types(enabled);

-- Insert Phase 1 Core Operations
INSERT INTO action_types (action_type, display_name, description, category, default_risk_tier, requires_approval, handler_path) VALUES
-- System Management
('system-status', 'System Status', 'Get comprehensive system status report including uptime, resource usage, and service health', 'system', 'T0', false, 'handlers/system-status'),
('view-logs', 'View Logs', 'Tail or search recent system logs', 'system', 'T0', false, 'handlers/view-logs'),
('health-check', 'Health Check', 'Verify system component health', 'system', 'T0', false, 'handlers/health-check'),
('restart-service', 'Restart Service', 'Restart a specific system service', 'system', 'T1', true, 'handlers/restart-service'),

-- Agent Management
('list-agents', 'List Agents', 'Show all active agents and their status', 'agent', 'T0', false, 'handlers/list-agents'),
('view-agent-logs', 'View Agent Logs', 'View logs for a specific agent', 'agent', 'T0', false, 'handlers/view-agent-logs'),
('pause-agent', 'Pause Agent', 'Temporarily suspend an agent', 'agent', 'T1', true, 'handlers/pause-agent'),
('resume-agent', 'Resume Agent', 'Reactivate a paused agent', 'agent', 'T1', true, 'handlers/resume-agent'),

-- Audit & Compliance
('audit-trail', 'Audit Trail', 'View recent actions and system events', 'audit', 'T0', false, 'handlers/audit-trail'),
('export-audit-log', 'Export Audit Log', 'Download audit records as CSV or JSON', 'audit', 'T0', false, 'handlers/export-audit-log'),

-- Data Operations
('query-database', 'Query Database', 'Execute read-only SQL queries', 'data', 'T1', true, 'handlers/query-database'),
('export-data', 'Export Data', 'Export query results to CSV/JSON', 'data', 'T0', false, 'handlers/export-data'),
('backup-database', 'Backup Database', 'Trigger manual database backup', 'data', 'T2', true, 'handlers/backup-database'),

-- Configuration
('get-config', 'Get Configuration', 'View current system configuration', 'config', 'T0', false, 'handlers/get-config'),
('update-config', 'Update Configuration', 'Modify configuration value', 'config', 'T2', true, 'handlers/update-config'),

-- Policy Management
('list-policies', 'List Policies', 'Show all governance policies', 'policy', 'T0', false, 'handlers/list-policies'),
('test-policy', 'Test Policy', 'Dry-run policy evaluation', 'policy', 'T0', false, 'handlers/test-policy')

ON CONFLICT (action_type) DO NOTHING;

-- Action Type Usage Tracking
CREATE TABLE IF NOT EXISTS action_type_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type_id UUID REFERENCES action_types(id) ON DELETE CASCADE,
  agent_id TEXT,
  intent_id UUID,
  status TEXT, -- 'submitted', 'approved', 'rejected', 'executed', 'failed'
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_type_usage_type ON action_type_usage(action_type_id);
CREATE INDEX IF NOT EXISTS idx_action_type_usage_status ON action_type_usage(status);
CREATE INDEX IF NOT EXISTS idx_action_type_usage_created ON action_type_usage(created_at DESC);

COMMENT ON TABLE action_types IS 'Central registry of all executable action types in Vienna OS';
COMMENT ON TABLE action_type_usage IS 'Tracks usage and execution of action types for analytics and auditing';
