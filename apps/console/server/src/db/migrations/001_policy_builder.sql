-- Policy Builder Schema
-- Vienna OS — Phase 15: Governance Policy Engine
-- Migration 001: policy_rules + policy_evaluations

-- Policy Rules table
CREATE TABLE IF NOT EXISTS policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- Rule conditions (JSON array of condition objects)
  -- Each: { field, operator, value }
  conditions JSONB NOT NULL DEFAULT '[]',
  -- What happens when conditions match
  action_on_match VARCHAR(50) NOT NULL DEFAULT 'require_approval',
  -- approval_tier: T0 (auto), T1 (single), T2 (multi-party)
  approval_tier VARCHAR(10),
  -- Specific approvers required (array of operator IDs)
  required_approvers JSONB DEFAULT '[]',
  -- Priority (higher number = evaluated first, like firewall rules)
  priority INTEGER NOT NULL DEFAULT 100,
  -- Active/disabled toggle
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Scope: which tenants this applies to (* = all)
  tenant_scope VARCHAR(255) NOT NULL DEFAULT '*',
  -- Metadata
  created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Version tracking for audit
  version INTEGER NOT NULL DEFAULT 1
);

-- Policy rule evaluation log (every time a rule fires)
CREATE TABLE IF NOT EXISTS policy_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES policy_rules(id) ON DELETE SET NULL,
  intent_id VARCHAR(255),
  agent_id VARCHAR(255),
  action_type VARCHAR(255),
  -- The conditions that were checked
  conditions_checked JSONB,
  -- Result: matched, not_matched, error
  result VARCHAR(50) NOT NULL,
  -- What action was taken
  action_taken VARCHAR(100),
  -- Full context snapshot
  context_snapshot JSONB,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_policy_rules_enabled ON policy_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_policy_rules_priority ON policy_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_policy_evaluations_rule_id ON policy_evaluations(rule_id);
CREATE INDEX IF NOT EXISTS idx_policy_evaluations_evaluated_at ON policy_evaluations(evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_evaluations_result ON policy_evaluations(result);
