-- Migration 011: Warrants Table
-- Persistent warrant storage for the Framework Integration API.
-- Warrants are cryptographically signed authorization tokens that bind
-- intent → policy evaluation → execution approval.

CREATE TABLE IF NOT EXISTS warrants (
    id VARCHAR(255) PRIMARY KEY,                    -- wrt_<timestamp>_<random>
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    intent_id VARCHAR(255) NOT NULL,                -- int_<timestamp>_<random>
    agent_id VARCHAR(255) NOT NULL,                 -- Agent that requested the warrant
    risk_tier VARCHAR(10) NOT NULL DEFAULT 'T0',    -- T0, T1, T2, T3
    
    -- Scope defines what the warrant authorizes
    scope JSONB NOT NULL DEFAULT '{}',              -- { allowed_actions, forbidden_actions, constraints, ... }
    
    -- Cryptographic signature (HMAC-SHA256) for tamper detection
    signature TEXT,
    
    -- Lifecycle
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(255),
    revocation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warrants_tenant ON warrants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warrants_intent ON warrants(intent_id);
CREATE INDEX IF NOT EXISTS idx_warrants_agent ON warrants(agent_id);
CREATE INDEX IF NOT EXISTS idx_warrants_expires ON warrants(expires_at) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_warrants_active ON warrants(tenant_id, revoked, expires_at) 
    WHERE revoked = false;

-- Ensure audit_log table exists (may have been created manually or by another migration)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    event VARCHAR(255) NOT NULL,
    actor VARCHAR(255) NOT NULL DEFAULT 'system',
    details JSONB DEFAULT '{}',
    risk_tier INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_intent ON audit_log((details->>'intent_id')) 
    WHERE details->>'intent_id' IS NOT NULL;

-- Comments
COMMENT ON TABLE warrants IS 'Cryptographically signed execution authorization tokens issued by the governance pipeline';
COMMENT ON COLUMN warrants.scope IS 'JSON scope: allowed_actions[], forbidden_actions[], constraints{}, framework, objective';
COMMENT ON COLUMN warrants.signature IS 'HMAC-SHA256 signature covering all authorization-relevant fields';
