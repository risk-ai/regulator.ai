-- Migration 002: Custom Action Types
-- Allows operators to define ANY action type, not just preset ones

CREATE TABLE IF NOT EXISTS action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The action type string (e.g., 'wire_transfer', 'deploy_production', 'approve_loan')
  action_type VARCHAR(255) NOT NULL UNIQUE,
  -- Human-readable display name
  display_name VARCHAR(255) NOT NULL,
  -- Description of what this action does
  description TEXT,
  -- Category for grouping (e.g., 'financial', 'infrastructure', 'healthcare', 'custom')
  category VARCHAR(100) NOT NULL DEFAULT 'custom',
  -- JSON schema for the payload this action expects
  payload_schema JSONB NOT NULL DEFAULT '{}',
  -- Default risk tier (T0/T1/T2)
  default_risk_tier VARCHAR(10) NOT NULL DEFAULT 'T1',
  -- Whether this action type is a system built-in (can't be deleted)
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  -- Icon identifier (for UI)
  icon VARCHAR(50) DEFAULT 'activity',
  -- Color hex for UI badge
  color VARCHAR(7) DEFAULT '#3b82f6',
  -- Active toggle
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Metadata
  created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Action type usage tracking
CREATE TABLE IF NOT EXISTS action_type_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type_id UUID REFERENCES action_types(id),
  agent_id VARCHAR(255),
  intent_id VARCHAR(255),
  status VARCHAR(50), -- 'submitted', 'approved', 'denied', 'executed', 'failed'
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_action_types_category ON action_types(category);
CREATE INDEX IF NOT EXISTS idx_action_types_enabled ON action_types(enabled);
CREATE INDEX IF NOT EXISTS idx_action_types_action_type ON action_types(action_type);
CREATE INDEX IF NOT EXISTS idx_action_type_usage_action_type_id ON action_type_usage(action_type_id);
CREATE INDEX IF NOT EXISTS idx_action_type_usage_executed_at ON action_type_usage(executed_at);

-- Seed built-in action types
INSERT INTO action_types (action_type, display_name, description, category, default_risk_tier, is_builtin, icon, color) VALUES
('restart_service', 'Restart Service', 'Restart a managed service', 'infrastructure', 'T1', true, 'refresh-cw', '#3b82f6'),
('deploy', 'Deploy', 'Deploy application to environment', 'infrastructure', 'T1', true, 'upload-cloud', '#8b5cf6'),
('scale_service', 'Scale Service', 'Scale service replicas up or down', 'infrastructure', 'T1', true, 'trending-up', '#06b6d4'),
('database_migration', 'Database Migration', 'Run database schema migration', 'infrastructure', 'T2', true, 'database', '#f59e0b'),
('send_email', 'Send Email', 'Send email on behalf of agent', 'communication', 'T0', true, 'mail', '#10b981'),
('api_call', 'External API Call', 'Make external API request', 'integration', 'T1', true, 'globe', '#6366f1'),
('file_access', 'File Access', 'Read or write files', 'data', 'T0', true, 'file', '#64748b'),
('data_export', 'Data Export', 'Export data from system', 'data', 'T1', true, 'download', '#f97316'),
('user_notification', 'User Notification', 'Send notification to user', 'communication', 'T0', true, 'bell', '#eab308'),
('config_change', 'Configuration Change', 'Modify system configuration', 'infrastructure', 'T1', true, 'settings', '#ec4899'),
('financial_transaction', 'Financial Transaction', 'Execute financial transaction', 'financial', 'T2', true, 'dollar-sign', '#ef4444')
ON CONFLICT (action_type) DO NOTHING;
