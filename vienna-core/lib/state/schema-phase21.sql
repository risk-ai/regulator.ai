-- Phase 21 Schema Extensions: Platformization, Tenancy, RBAC

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'suspended', 'archived')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT, -- JSON object
  resource_limits TEXT, -- JSON object (budget, compute, storage limits)
  policy_scope TEXT NOT NULL CHECK(policy_scope IN ('global', 'tenant', 'workspace')) DEFAULT 'tenant'
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('default', 'investigation', 'project')) DEFAULT 'default',
  status TEXT NOT NULL CHECK(status IN ('active', 'archived')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT, -- JSON object
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_tenant ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);

-- Principals table (users and service accounts)
CREATE TABLE IF NOT EXISTS principals (
  principal_id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('user', 'service')) DEFAULT 'user',
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  roles TEXT, -- JSON array of role names
  permissions TEXT, -- JSON array of direct permissions
  status TEXT NOT NULL CHECK(status IN ('active', 'suspended', 'revoked')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT, -- JSON object
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_principals_tenant ON principals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_principals_type ON principals(type);
CREATE INDEX IF NOT EXISTS idx_principals_status ON principals(status);

-- Plugins table
CREATE TABLE IF NOT EXISTS plugins (
  plugin_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('action', 'verifier', 'policy', 'transport')),
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('registered', 'loaded', 'unloaded', 'failed')) DEFAULT 'registered',
  author TEXT,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  tenant_scope TEXT NOT NULL CHECK(tenant_scope IN ('global', 'tenant')) DEFAULT 'global',
  metadata TEXT, -- JSON object
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  loaded_at TEXT,
  unloaded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_plugins_type ON plugins(type);
CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins(status);
CREATE INDEX IF NOT EXISTS idx_plugins_enabled ON plugins(enabled);

-- Add tenant_id to existing tables (migration)
-- Note: These are ALTER TABLE statements for existing schema

-- ALTER TABLE plans ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE managed_objectives ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE execution_ledger_summary ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE approvals ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE verifications ADD COLUMN tenant_id TEXT DEFAULT 'default';
-- ALTER TABLE policies ADD COLUMN tenant_id TEXT DEFAULT 'default';

-- API Access Logs (for audit trail)
CREATE TABLE IF NOT EXISTS api_access_logs (
  log_id TEXT PRIMARY KEY,
  principal_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  permission_required TEXT,
  access_granted INTEGER NOT NULL, -- 0 or 1
  request_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  response_code INTEGER,
  metadata TEXT, -- JSON object
  FOREIGN KEY (principal_id) REFERENCES principals(principal_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_api_logs_principal ON api_access_logs(principal_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_tenant ON api_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_access_logs(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_denied ON api_access_logs(access_granted) WHERE access_granted = 0;
