-- Phase 4A: Credential store extensions
-- Extends existing adapter_configs table for credentialed external execution

-- Add credential management columns
ALTER TABLE regulator.adapter_configs 
  ADD COLUMN IF NOT EXISTS credential_alias VARCHAR(128),
  ADD COLUMN IF NOT EXISTS auth_mode VARCHAR(32) DEFAULT 'bearer',
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

-- Unique alias per tenant (allows NULL aliases)
CREATE UNIQUE INDEX IF NOT EXISTS idx_adapter_configs_tenant_alias 
  ON regulator.adapter_configs(tenant_id, credential_alias) 
  WHERE credential_alias IS NOT NULL;

-- Index for fast credential resolution during execution
CREATE INDEX IF NOT EXISTS idx_adapter_configs_tenant_enabled
  ON regulator.adapter_configs(tenant_id, enabled)
  WHERE enabled = true;

-- Add adapter_config_id to execution_steps if not present (already has adapter_id as uuid)
-- We use the existing adapter_id column which references adapter_configs.id
