-- Migration: Performance Indexes
-- Description: Add missing indexes for common query patterns
-- Date: 2026-03-29

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC NULLS LAST);

-- Tenants table indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at DESC);

-- Refresh tokens indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked_at) WHERE revoked_at IS NULL;

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_created ON api_keys(created_at DESC);

-- Action type usage indexes (for analytics)
CREATE INDEX IF NOT EXISTS idx_action_usage_created_desc ON action_type_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_usage_agent_created ON action_type_usage(agent_id, created_at DESC);

-- Audit log indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_log') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_log(user_id, created_at DESC);
  END IF;
END $$;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_tenant_active ON users(tenant_id, created_at DESC) WHERE last_login_at IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE tenants;
ANALYZE refresh_tokens;
ANALYZE api_keys;
ANALYZE action_types;
ANALYZE action_type_usage;

COMMENT ON INDEX idx_users_email_lower IS 'Case-insensitive email lookup';
COMMENT ON INDEX idx_users_tenant_role IS 'User lookup by tenant and role';
COMMENT ON INDEX idx_audit_user_created IS 'User activity timeline';
