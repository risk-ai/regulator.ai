-- Migration 011: Extend Warrants Table for Framework API
-- Adds columns needed by the Framework Integration API for intent-based warrant issuance.
-- The warrants table already exists with proposal-based schema; this adds intent/agent/scope fields.

-- Add new columns for Framework API compatibility
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS intent_id VARCHAR(255);
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS risk_tier VARCHAR(10) DEFAULT 'T0';
ALTER TABLE warrants ADD COLUMN IF NOT EXISTS scope JSONB DEFAULT '{}';

-- Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_warrants_intent ON warrants(intent_id) WHERE intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warrants_agent ON warrants(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warrants_active ON warrants(tenant_id, revoked, expires_at) WHERE revoked = false;

-- Ensure audit_log has the indexes we need
CREATE INDEX IF NOT EXISTS idx_audit_log_intent ON audit_log((details->>'intent_id'))
    WHERE details->>'intent_id' IS NOT NULL;

-- Comments
COMMENT ON COLUMN warrants.intent_id IS 'Framework API intent ID (int_<timestamp>_<random>)';
COMMENT ON COLUMN warrants.agent_id IS 'Agent that requested the warrant via Framework API';
COMMENT ON COLUMN warrants.risk_tier IS 'Governance risk tier: T0 (auto), T1 (auto), T2 (approval), T3 (multi-approval)';
COMMENT ON COLUMN warrants.scope IS 'JSON scope: allowed_actions[], forbidden_actions[], constraints{}, framework, objective';
