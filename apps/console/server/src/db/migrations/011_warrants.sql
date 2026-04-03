-- Migration 011: Warrant System
-- Cryptographically-signed authorization primitives for governed executions

CREATE TABLE IF NOT EXISTS regulator.warrants (
  -- Identity
  warrant_id TEXT PRIMARY KEY,
  change_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 2,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  
  -- Issuance
  issued_by TEXT NOT NULL DEFAULT 'vienna',
  issued_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  
  -- Risk & Authorization
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('T0', 'T1', 'T2', 'T3')),
  
  -- Truth & Plan Binding
  truth_snapshot_id TEXT NOT NULL,
  truth_snapshot_hash TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  
  -- Approval Trail
  approval_id TEXT,
  approval_ids JSONB DEFAULT '[]'::jsonb,
  
  -- Authorization Scope
  objective TEXT NOT NULL,
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_actions JSONB DEFAULT '[]'::jsonb,
  constraints JSONB DEFAULT '{}'::jsonb,
  
  -- T3-specific fields
  justification TEXT,
  rollback_plan TEXT,
  
  -- Safety & Audit
  trading_safety JSONB DEFAULT '{"trading_in_scope": false, "risk": "none"}'::jsonb,
  enhanced_audit BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'invalidated')),
  invalidated_at TIMESTAMP,
  invalidation_reason TEXT,
  
  -- Cryptographic Signature (HMAC-SHA256)
  signature TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_warrants_tenant_status 
ON regulator.warrants (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_warrants_expires_at 
ON regulator.warrants (expires_at) WHERE status = 'issued';

CREATE INDEX IF NOT EXISTS idx_warrants_risk_tier 
ON regulator.warrants (risk_tier, tenant_id);

CREATE INDEX IF NOT EXISTS idx_warrants_plan_id 
ON regulator.warrants (plan_id);

CREATE INDEX IF NOT EXISTS idx_warrants_approval_id 
ON regulator.warrants (approval_id) WHERE approval_id IS NOT NULL;

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_warrants_allowed_actions 
ON regulator.warrants USING GIN (allowed_actions);

-- Partial index for active warrants only (most common query)
CREATE INDEX IF NOT EXISTS idx_warrants_active 
ON regulator.warrants (tenant_id, risk_tier, created_at) 
WHERE status = 'issued' AND expires_at > NOW();

-- Comment
COMMENT ON TABLE regulator.warrants IS 'Cryptographically-signed authorization warrants for governed AI agent executions';
COMMENT ON COLUMN regulator.warrants.signature IS 'HMAC-SHA256 signature covering all authorization-relevant fields for tamper detection';
COMMENT ON COLUMN regulator.warrants.truth_snapshot_id IS 'Binds warrant to specific state of the world at issuance time';
