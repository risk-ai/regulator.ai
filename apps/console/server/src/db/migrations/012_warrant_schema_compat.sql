-- Migration 012: Warrant Schema Compatibility
-- Makes the existing warrants table compatible with both the legacy proposal-based
-- workflow and the new Framework API warrant authority.
--
-- The original table has id (UUID), proposal_id (UUID NOT NULL), etc.
-- The WarrantAdapter needs warrant_id, intent_id, and other fields.
-- This migration adds all missing columns and relaxes constraints.

-- Make proposal_id nullable (not all warrants come from proposals)
ALTER TABLE warrants ALTER COLUMN proposal_id DROP NOT NULL;

-- Ensure all WarrantAdapter columns exist
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS warrant_id TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS change_id TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 2;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS intent_id VARCHAR(255);
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS risk_tier VARCHAR(10) DEFAULT 'T0';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS scope JSONB DEFAULT '{}';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS truth_snapshot_id TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS truth_snapshot_hash TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS approval_id TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS approval_ids JSONB DEFAULT '[]';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS allowed_actions JSONB DEFAULT '[]';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS forbidden_actions JSONB DEFAULT '[]';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '{}';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS rollback_plan TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS trading_safety JSONB DEFAULT '{"trading_in_scope": false, "risk": "none"}';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS enhanced_audit BOOLEAN DEFAULT false;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'issued';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMP;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS invalidation_reason TEXT;
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Set default for revoked
ALTER TABLE warrants ALTER COLUMN revoked SET DEFAULT false;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_warrants_warrant_id ON warrants(warrant_id) WHERE warrant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warrants_intent ON warrants(intent_id) WHERE intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warrants_agent ON warrants(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warrants_active ON warrants(tenant_id, revoked, expires_at) WHERE revoked = false;

COMMENT ON TABLE warrants IS 'Unified warrants table: supports both proposal-based (legacy) and intent-based (Framework API) warrant issuance';
