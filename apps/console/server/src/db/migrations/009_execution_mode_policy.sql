-- Migration: 009_execution_mode_policy.sql
-- Fix #2: Per-tenant execution mode policy (direct vs passback per risk tier)

-- Add execution_mode_policy to tenants table
ALTER TABLE regulator.tenants 
  ADD COLUMN IF NOT EXISTS execution_mode_policy JSONB 
  DEFAULT '{"T0": "direct", "T1": "direct", "T2": "passback", "T3": "passback"}'::jsonb;

-- Add callback_verification_policy to tenants table  
-- Fix #4: Controls whether passback callbacks require result verification
ALTER TABLE regulator.tenants
  ADD COLUMN IF NOT EXISTS callback_verification_policy JSONB
  DEFAULT '{"enabled": true, "verify_scope_match": true, "verify_constraints": true, "auto_promote_on_skip": false}'::jsonb;

COMMENT ON COLUMN regulator.tenants.execution_mode_policy IS 
  'Per-tier execution mode: "direct" (Vienna executes) or "passback" (agent executes with warrant). Overrides default T0/T1=direct, T2/T3=passback.';

COMMENT ON COLUMN regulator.tenants.callback_verification_policy IS
  'Controls passback callback verification. verify_scope_match checks action matches warrant scope. verify_constraints checks result satisfies warrant constraints.';

-- Fix #3: Per-tenant default policy decision (allow vs deny when no policies match)
ALTER TABLE regulator.tenants
  ADD COLUMN IF NOT EXISTS default_policy_decision VARCHAR(10)
  DEFAULT 'deny';

COMMENT ON COLUMN regulator.tenants.default_policy_decision IS
  'Default policy decision when no policies match an intent. "deny" (secure default) or "allow" (legacy/permissive). New tenants default to deny.';
