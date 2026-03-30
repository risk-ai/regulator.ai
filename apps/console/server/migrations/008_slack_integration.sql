-- Slack Integration
-- Phase 31, Feature 3

CREATE TABLE IF NOT EXISTS slack_workspaces (
  id TEXT PRIMARY KEY DEFAULT ('slk_' || replace(gen_random_uuid()::text, '-', '')),
  tenant_id TEXT NOT NULL,
  team_id TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted in production
  bot_user_id TEXT,
  webhook_url TEXT,
  channel_approvals TEXT, -- Default channel for approval requests
  channel_alerts TEXT, -- Default channel for alerts
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  installed_by TEXT, -- user_id who installed
  last_used_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slack_notifications (
  id TEXT PRIMARY KEY DEFAULT ('sn_' || replace(gen_random_uuid()::text, '-', '')),
  workspace_id TEXT NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'approval_request', 'policy_violation', 'action_completed'
  entity_type TEXT NOT NULL, -- 'approval', 'execution', 'policy'
  entity_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_ts TEXT, -- Slack message timestamp
  thread_ts TEXT, -- Thread timestamp if in thread
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  response_user_id TEXT, -- Slack user who responded
  response_action TEXT, -- 'approved', 'denied', etc.
  metadata JSONB
);

CREATE INDEX idx_slack_workspaces_tenant ON slack_workspaces(tenant_id);
CREATE INDEX idx_slack_workspaces_team ON slack_workspaces(team_id);
CREATE INDEX idx_slack_notifications_workspace ON slack_notifications(workspace_id);
CREATE INDEX idx_slack_notifications_entity ON slack_notifications(entity_type, entity_id);
CREATE INDEX idx_slack_notifications_sent ON slack_notifications(sent_at DESC);
