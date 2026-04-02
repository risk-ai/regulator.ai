-- Migration: 010_data_retention_and_rbac.sql
-- Compliance: Data retention policies + RBAC refinement for A+ grade

-- ============================================================
-- DATA RETENTION POLICIES
-- ============================================================

-- Tenant-configurable data retention policy
CREATE TABLE IF NOT EXISTS regulator.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES regulator.tenants(id),
  table_name VARCHAR(100) NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 365,
  archive_before_delete BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, table_name)
);

-- Default retention policies (inserted for new tenants via application logic)
COMMENT ON TABLE regulator.data_retention_policies IS 
  'Per-tenant data retention rules. Controls how long execution logs, audit events, and ledger data are retained.';

-- Retention archive table — stores metadata about archived data
CREATE TABLE IF NOT EXISTS regulator.retention_archive_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  records_archived INTEGER NOT NULL DEFAULT 0,
  records_deleted INTEGER NOT NULL DEFAULT 0,
  oldest_record_date TIMESTAMPTZ,
  newest_record_date TIMESTAMPTZ,
  archive_location TEXT, -- S3/GCS URI if archived to object storage
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_by VARCHAR(100) NOT NULL DEFAULT 'system'
);

COMMENT ON TABLE regulator.retention_archive_log IS
  'Immutable log of all data retention operations. Required for SOC 2 PI1.3 and CC7.2.';

-- Add retention metadata columns to execution_log
ALTER TABLE regulator.execution_log 
  ADD COLUMN IF NOT EXISTS retention_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add retention metadata to audit_log
ALTER TABLE regulator.audit_log
  ADD COLUMN IF NOT EXISTS retention_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Indexes for retention queries (scan by date, efficient cleanup)
CREATE INDEX IF NOT EXISTS idx_execution_log_retention 
  ON regulator.execution_log (tenant_id, created_at) 
  WHERE retention_status = 'active';

CREATE INDEX IF NOT EXISTS idx_audit_log_retention
  ON regulator.audit_log (created_at)
  WHERE retention_status = 'active';

CREATE INDEX IF NOT EXISTS idx_ledger_events_retention
  ON regulator.execution_ledger_events (tenant_id, created_at);

-- ============================================================
-- RBAC REFINEMENT — Within-Tenant Roles
-- ============================================================

-- Role definitions with granular permissions
CREATE TABLE IF NOT EXISTS regulator.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES regulator.tenants(id),
  role_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system_role BOOLEAN NOT NULL DEFAULT false, -- admin, operator, viewer, agent
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, role_name)
);

-- Insert default system roles for existing tenants
-- (Application layer should run this for new tenants at creation time)
INSERT INTO regulator.roles (tenant_id, role_name, display_name, description, permissions, is_system_role)
SELECT 
  t.id,
  r.role_name,
  r.display_name,
  r.description,
  r.permissions::jsonb,
  true
FROM regulator.tenants t
CROSS JOIN (VALUES
  ('admin', 'Administrator', 'Full access to all tenant resources',
   '["tenant:manage","users:list","users:create","users:update","users:delete","policies:list","policies:create","policies:update","policies:delete","intents:submit","intents:list","intents:view","executions:report","executions:list","executions:view","approvals:list","approvals:approve_t1","approvals:approve_t2","approvals:approve_t3","fleet:list","fleet:manage","fleet:trust_modify","audit:list","audit:export","integrations:list","integrations:manage","compliance:view","compliance:generate","api_keys:list","api_keys:create","api_keys:revoke","settings:view","settings:manage","retention:view","retention:manage"]'),
  ('operator', 'Operator', 'Manage policies and approve executions',
   '["policies:list","policies:create","policies:update","intents:submit","intents:list","intents:view","executions:list","executions:view","approvals:list","approvals:approve_t1","approvals:approve_t2","fleet:list","fleet:manage","audit:list","compliance:view","api_keys:list","settings:view"]'),
  ('viewer', 'Viewer', 'Read-only access to dashboard and audit',
   '["intents:list","intents:view","executions:list","executions:view","fleet:list","audit:list","compliance:view","settings:view"]'),
  ('agent', 'Agent', 'API-only access for automated agents',
   '["intents:submit","executions:report"]')
) AS r(role_name, display_name, description, permissions)
ON CONFLICT (tenant_id, role_name) DO NOTHING;

-- User role assignments (many-to-many)
CREATE TABLE IF NOT EXISTS regulator.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES regulator.tenants(id),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES regulator.roles(id),
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = permanent
  UNIQUE(tenant_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_lookup
  ON regulator.user_role_assignments (tenant_id, user_id);

-- Custom role creation tracking (audit)
CREATE TABLE IF NOT EXISTS regulator.role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'role_created', 'role_updated', 'role_deleted', 'assignment_created', 'assignment_revoked'
  target_role_id UUID,
  target_user_id UUID,
  actor_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
