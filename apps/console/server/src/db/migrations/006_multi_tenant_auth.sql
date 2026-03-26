-- Multi-Tenant Authentication Schema Migration
-- Phase 1 Production Hardening - Vienna OS Console Server
-- Created: 2026-03-26

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'community', -- community, team, business, enterprise
  max_agents INTEGER NOT NULL DEFAULT 5,
  max_policies INTEGER NOT NULL DEFAULT 10,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (operators/admins)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255), -- bcrypt, null if SSO-only
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin, operator, viewer
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL, -- sha256 of the actual key
  key_prefix VARCHAR(20) NOT NULL, -- first 8 chars for identification (vos_xxxx)
  name VARCHAR(255) NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["intent:submit", "execution:report"]',
  agent_id VARCHAR(255), -- if bound to specific agent
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Add tenant_id to existing tables
ALTER TABLE policy_rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE policy_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_tenant ON policy_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policy_evaluations_tenant ON policy_evaluations(tenant_id);

-- Create a trigger to update updated_at timestamp on tenants
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();