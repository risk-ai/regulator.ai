-- Phase 22-25 Schema Extensions

-- Phase 22: Economic Governance

CREATE TABLE IF NOT EXISTS budgets (
  budget_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK(scope IN ('tenant', 'workspace', 'objective', 'operator')),
  scope_id TEXT NOT NULL,
  limit_units INTEGER NOT NULL,
  spent_units INTEGER NOT NULL DEFAULT 0,
  reserved_units INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL CHECK(period IN ('daily', 'weekly', 'monthly', 'annual')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'exhausted', 'expired')) DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_budgets_scope ON budgets(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);

CREATE TABLE IF NOT EXISTS cost_records (
  record_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  plan_id TEXT,
  estimated_cost INTEGER NOT NULL,
  actual_cost INTEGER NOT NULL,
  cost_breakdown TEXT, -- JSON object
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  tenant_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cost_records_execution ON cost_records(execution_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_tenant ON cost_records(tenant_id);

-- Phase 23: Trust & Compliance

CREATE TABLE IF NOT EXISTS attestations (
  attestation_id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('policy_evaluation', 'approval_decision', 'warrant_issuance', 'execution_result', 'verification_result')),
  subject_id TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  claims TEXT NOT NULL, -- JSON object
  evidence TEXT, -- JSON object
  signature TEXT,
  signature_algorithm TEXT NOT NULL DEFAULT 'sha256',
  tenant_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attestations_type ON attestations(type);
CREATE INDEX IF NOT EXISTS idx_attestations_subject ON attestations(subject_id);
CREATE INDEX IF NOT EXISTS idx_attestations_tenant ON attestations(tenant_id);

CREATE TABLE IF NOT EXISTS provenance_records (
  provenance_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  inputs TEXT, -- JSON array
  decisions TEXT, -- JSON array
  policies_applied TEXT, -- JSON array
  actors TEXT, -- JSON array
  execution_nodes TEXT, -- JSON array
  parent_provenance TEXT,
  child_provenances TEXT, -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_provenance) REFERENCES provenance_records(provenance_id)
);

CREATE INDEX IF NOT EXISTS idx_provenance_entity ON provenance_records(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_provenance_tenant ON provenance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provenance_parent ON provenance_records(parent_provenance);

CREATE TABLE IF NOT EXISTS compliance_exports (
  export_id TEXT PRIMARY KEY,
  export_type TEXT NOT NULL CHECK(export_type IN ('audit_bundle', 'compliance_report', 'ledger_export')),
  tenant_id TEXT NOT NULL,
  time_range_start TEXT NOT NULL,
  time_range_end TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('json', 'csv', 'pdf')),
  file_path TEXT,
  signed INTEGER NOT NULL DEFAULT 0,
  signature TEXT,
  exported_by TEXT NOT NULL,
  exported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_compliance_exports_tenant ON compliance_exports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_exports_type ON compliance_exports(export_type);

-- Phase 24: Simulation

CREATE TABLE IF NOT EXISTS simulations (
  simulation_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK(mode IN ('policy_only', 'scheduling', 'full_execution')),
  intent TEXT NOT NULL, -- JSON object
  plan TEXT NOT NULL, -- JSON object
  predicted_cost INTEGER,
  predicted_latency_ms INTEGER,
  predicted_success_probability REAL,
  policy_evaluation TEXT, -- JSON object
  approval_required INTEGER,
  scheduling_decision TEXT, -- JSON object
  predicted_steps TEXT, -- JSON array
  predicted_verification TEXT, -- JSON object
  predicted_blockers TEXT, -- JSON array
  confidence REAL,
  confidence_breakdown TEXT, -- JSON object
  simulated_at TEXT NOT NULL DEFAULT (datetime('now')),
  simulation_duration_ms INTEGER,
  tenant_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_simulations_tenant ON simulations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_simulations_mode ON simulations(mode);

-- Phase 25: Federation

CREATE TABLE IF NOT EXISTS federation_nodes (
  node_id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL CHECK(node_type IN ('vienna', 'external')),
  endpoint_url TEXT NOT NULL,
  capabilities TEXT, -- JSON array
  trust_level TEXT NOT NULL CHECK(trust_level IN ('trusted', 'verified', 'untrusted')) DEFAULT 'untrusted',
  public_key TEXT,
  status TEXT NOT NULL CHECK(status IN ('active', 'degraded', 'offline')) DEFAULT 'active',
  health_score REAL DEFAULT 1.0,
  last_heartbeat TEXT,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT -- JSON object
);

CREATE INDEX IF NOT EXISTS idx_federation_nodes_status ON federation_nodes(status);
CREATE INDEX IF NOT EXISTS idx_federation_nodes_trust ON federation_nodes(trust_level);

CREATE TABLE IF NOT EXISTS federated_executions (
  request_id TEXT PRIMARY KEY,
  source_node TEXT NOT NULL,
  target_node TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  governance_context TEXT NOT NULL, -- JSON object
  signature TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'executing', 'completed', 'failed', 'rejected')) DEFAULT 'pending',
  result TEXT, -- JSON object
  execution_id TEXT,
  verification_id TEXT,
  ledger_events TEXT, -- JSON array
  provenance_chain TEXT, -- JSON object
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (source_node) REFERENCES federation_nodes(node_id),
  FOREIGN KEY (target_node) REFERENCES federation_nodes(node_id)
);

CREATE INDEX IF NOT EXISTS idx_federated_executions_source ON federated_executions(source_node);
CREATE INDEX IF NOT EXISTS idx_federated_executions_target ON federated_executions(target_node);
CREATE INDEX IF NOT EXISTS idx_federated_executions_status ON federated_executions(status);
