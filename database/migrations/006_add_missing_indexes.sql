-- Migration 006: Add missing indexes for query performance
-- Created: 2026-04-07
-- Context: 85 tables in regulator schema, 62 empty, 23 with data
-- 10 tables had no non-PK indexes

SET search_path TO regulator;

-- intents: needs agent/status/time lookups
CREATE INDEX IF NOT EXISTS idx_intents_agent_id ON intents(agent_id);
CREATE INDEX IF NOT EXISTS idx_intents_status ON intents(status);
CREATE INDEX IF NOT EXISTS idx_intents_created_at ON intents(created_at);

-- webhooks: needs tenant lookup
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);

-- webhook_deliveries: needs webhook lookup
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);

-- policy_templates: needs category lookup
CREATE INDEX IF NOT EXISTS idx_policy_templates_category ON policy_templates(category);

-- adapters: needs type lookup  
CREATE INDEX IF NOT EXISTS idx_adapters_type ON adapters(type);
