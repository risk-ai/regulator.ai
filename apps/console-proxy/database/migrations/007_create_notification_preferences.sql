-- Migration 007: Create notification_preferences table
-- Required by: apps/console-proxy/api/server.js /settings/notifications endpoint
-- This table was previously created inline via catch() in server.js which is fragile.

CREATE TABLE IF NOT EXISTS regulator.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES regulator.tenants(id),
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  slack_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_preferences_tenant_idx
  ON regulator.notification_preferences (tenant_id);
