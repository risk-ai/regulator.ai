-- Agent registry (enhanced)
CREATE TABLE IF NOT EXISTS agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  -- Agent type: autonomous, semi-autonomous, supervised
  agent_type VARCHAR(50) NOT NULL DEFAULT 'semi-autonomous',
  -- Status: active, idle, suspended, terminated
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  -- Trust level: 0-100 (starts at 50, adjusts based on behavior)
  trust_score INTEGER NOT NULL DEFAULT 50,
  -- Last seen (heartbeat)
  last_heartbeat TIMESTAMPTZ,
  -- Configuration
  config JSONB DEFAULT '{}',
  -- Tags for grouping
  tags JSONB DEFAULT '[]',
  -- Rate limits specific to this agent
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  -- Metadata
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registered_by VARCHAR(255) NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent activity log (high-volume, partitioned by time)
CREATE TABLE IF NOT EXISTS agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(255) NOT NULL,
  action_type VARCHAR(255) NOT NULL,
  -- Result: approved, denied, executed, failed, timeout
  result VARCHAR(50) NOT NULL,
  -- Latency in milliseconds
  latency_ms INTEGER,
  -- Risk tier of the action
  risk_tier VARCHAR(10),
  -- Error message if failed
  error_message TEXT,
  -- Full context
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_id ON agent_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created_at ON agent_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_activity_result ON agent_activity(result);

-- Agent alerts (policy violations, anomalies)
CREATE TABLE IF NOT EXISTS agent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(255) NOT NULL,
  alert_type VARCHAR(100) NOT NULL, -- 'policy_violation', 'rate_limit', 'scope_creep', 'anomaly', 'trust_decay'
  severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  -- Resolution
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed some demo agents
INSERT INTO agent_registry (agent_id, display_name, description, agent_type, status, trust_score, last_heartbeat) VALUES
('billing-bot', 'Billing Bot', 'Handles invoice generation and payment processing', 'autonomous', 'active', 78, NOW() - INTERVAL '2 minutes'),
('deploy-agent', 'Deploy Agent', 'CI/CD pipeline automation and deployment management', 'semi-autonomous', 'active', 85, NOW() - INTERVAL '30 seconds'),
('customer-support-ai', 'Customer Support AI', 'Automated customer ticket triage and response', 'autonomous', 'active', 62, NOW() - INTERVAL '5 minutes'),
('data-analyst', 'Data Analyst', 'Scheduled report generation and data pipeline management', 'supervised', 'active', 91, NOW() - INTERVAL '1 minute'),
('security-scanner', 'Security Scanner', 'Continuous security scanning and vulnerability assessment', 'autonomous', 'idle', 95, NOW() - INTERVAL '1 hour'),
('content-moderator', 'Content Moderator', 'AI-powered content moderation and compliance checking', 'autonomous', 'active', 71, NOW() - INTERVAL '10 seconds'),
('inventory-manager', 'Inventory Manager', 'Warehouse inventory tracking and reorder automation', 'semi-autonomous', 'suspended', 45, NOW() - INTERVAL '2 days'),
('compliance-checker', 'Compliance Checker', 'Regulatory compliance monitoring and reporting', 'supervised', 'active', 88, NOW() - INTERVAL '3 minutes')
ON CONFLICT (agent_id) DO NOTHING;

-- Seed sample activity
INSERT INTO agent_activity (agent_id, action_type, result, latency_ms, risk_tier) VALUES
('billing-bot', 'financial_transaction', 'executed', 230, 'T1'),
('billing-bot', 'send_email', 'executed', 45, 'T0'),
('billing-bot', 'data_export', 'denied', 12, 'T1'),
('deploy-agent', 'deploy', 'executed', 1523, 'T1'),
('deploy-agent', 'config_change', 'executed', 89, 'T1'),
('deploy-agent', 'database_migration', 'executed', 4521, 'T2'),
('customer-support-ai', 'send_email', 'executed', 67, 'T0'),
('customer-support-ai', 'api_call', 'executed', 312, 'T1'),
('customer-support-ai', 'file_access', 'denied', 5, 'T0'),
('data-analyst', 'data_export', 'executed', 2341, 'T1'),
('security-scanner', 'api_call', 'executed', 189, 'T1'),
('content-moderator', 'api_call', 'executed', 56, 'T0'),
('content-moderator', 'user_notification', 'executed', 23, 'T0'),
('compliance-checker', 'data_export', 'executed', 1876, 'T1'),
('compliance-checker', 'send_email', 'executed', 98, 'T0')
ON CONFLICT DO NOTHING;

-- Seed sample alerts
INSERT INTO agent_alerts (agent_id, alert_type, severity, message) VALUES
('inventory-manager', 'trust_decay', 'critical', 'Trust score dropped below 50 threshold — agent suspended automatically'),
('billing-bot', 'rate_limit', 'warning', 'Exceeded 80% of hourly rate limit (812/1000 requests)'),
('customer-support-ai', 'policy_violation', 'warning', 'Attempted file_access action outside permitted scope'),
('content-moderator', 'anomaly', 'info', 'Action volume 3x higher than 7-day average')
ON CONFLICT DO NOTHING;
