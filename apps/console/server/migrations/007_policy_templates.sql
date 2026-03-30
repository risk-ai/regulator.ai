-- Policy Templates Library
-- Phase 31, Feature 1

CREATE TABLE IF NOT EXISTS policy_templates (
  id TEXT PRIMARY KEY DEFAULT ('tpl_' || replace(gen_random_uuid()::text, '-', '')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'financial', 'compliance', 'security', 'operations'
  icon TEXT, -- emoji or icon name
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  rules JSONB NOT NULL, -- Array of rule objects
  tags TEXT[], -- For filtering/search
  use_count INTEGER DEFAULT 0, -- Track popularity
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policy_templates_category ON policy_templates(category);
CREATE INDEX idx_policy_templates_enabled ON policy_templates(enabled);
CREATE INDEX idx_policy_templates_use_count ON policy_templates(use_count DESC);

-- Insert default templates
INSERT INTO policy_templates (name, description, category, icon, priority, rules, tags) VALUES

-- 1. Financial Transaction Approval
(
  'Financial Transaction Approval',
  'Require human approval for transactions exceeding a dollar threshold. Prevents unauthorized high-value actions.',
  'financial',
  '💰',
  200,
  '[{
    "condition": "amount > 10000",
    "action": "require_approval",
    "approvers": [],
    "timeout_minutes": 60,
    "description": "Transactions over $10,000 require approval"
  }]'::jsonb,
  ARRAY['finance', 'approval', 'high-value']
),

-- 2. High-Risk Action Review
(
  'High-Risk Action Review',
  'Mandate approval for sensitive operations like database modifications, user deletions, or system changes.',
  'security',
  '🔒',
  300,
  '[{
    "condition": "risk_tier >= 3",
    "action": "require_approval",
    "approvers": [],
    "timeout_minutes": 120,
    "description": "High-risk actions (tier 3+) require security review"
  }]'::jsonb,
  ARRAY['security', 'risk', 'approval']
),

-- 3. Rate Limiting Protection
(
  'Rate Limiting Protection',
  'Prevent agent spam by limiting actions per time period. Protects against runaway agents and API cost overruns.',
  'operations',
  '⏱️',
  100,
  '[{
    "condition": "actions_per_hour > 100",
    "action": "block",
    "message": "Rate limit exceeded: max 100 actions/hour",
    "description": "Limit agent to 100 actions per hour"
  }]'::jsonb,
  ARRAY['rate-limit', 'protection', 'cost-control']
),

-- 4. Cost Control Budget
(
  'Cost Control Budget',
  'Set daily spending limits per agent to prevent unexpected API bills. Automatically blocks when budget exceeded.',
  'financial',
  '💳',
  150,
  '[{
    "condition": "daily_cost > 100",
    "action": "block",
    "message": "Daily budget ($100) exceeded",
    "description": "Block agent when daily cost exceeds $100"
  }]'::jsonb,
  ARRAY['cost', 'budget', 'protection']
),

-- 5. Compliance Audit Logging
(
  'Compliance Audit Logging',
  'Comprehensive logging for regulated industries (HIPAA, SOC2, GDPR). Captures all agent actions with full context.',
  'compliance',
  '📋',
  400,
  '[{
    "condition": "true",
    "action": "log_detailed",
    "retention_days": 365,
    "include_context": true,
    "description": "Log all actions with full audit trail"
  }]'::jsonb,
  ARRAY['compliance', 'audit', 'logging', 'hipaa', 'soc2', 'gdpr']
),

-- 6. Multi-Agent Coordination
(
  'Multi-Agent Coordination',
  'Prevent conflicting actions when multiple agents operate simultaneously. Ensures coordination and consistency.',
  'operations',
  '🤝',
  250,
  '[{
    "condition": "concurrent_agents > 1 AND resource_conflict",
    "action": "require_approval",
    "message": "Multiple agents accessing same resource",
    "description": "Coordinate when agents access shared resources"
  }]'::jsonb,
  ARRAY['coordination', 'multi-agent', 'conflict-prevention']
),

-- 7. Data Privacy Protection
(
  'Data Privacy Protection',
  'Block access to PII (emails, SSNs, credit cards) unless explicitly authorized. GDPR and privacy compliance.',
  'compliance',
  '🛡️',
  500,
  '[{
    "condition": "contains_pii",
    "action": "require_approval",
    "approvers": [],
    "timeout_minutes": 30,
    "description": "PII access requires data privacy approval"
  }]'::jsonb,
  ARRAY['privacy', 'pii', 'gdpr', 'security']
),

-- 8. External API Safety
(
  'External API Safety',
  'Review before calling external APIs. Prevents data leakage and ensures third-party services are authorized.',
  'security',
  '🌐',
  200,
  '[{
    "condition": "action_type == \"external_api_call\"",
    "action": "require_approval",
    "description": "External API calls require security review"
  }]'::jsonb,
  ARRAY['api', 'external', 'security', 'third-party']
),

-- 9. Business Hours Only
(
  'Business Hours Only',
  'Restrict agent actions to business hours (9 AM - 5 PM, Monday-Friday). Ensures human oversight is available.',
  'operations',
  '🕒',
  100,
  '[{
    "condition": "time < 09:00 OR time > 17:00 OR day IN (\"Saturday\", \"Sunday\")",
    "action": "block",
    "message": "Actions only allowed during business hours (9 AM - 5 PM, Mon-Fri)",
    "description": "Restrict to business hours"
  }]'::jsonb,
  ARRAY['hours', 'schedule', 'timing']
),

-- 10. Sandbox Testing Mode
(
  'Sandbox Testing Mode',
  'All actions run in read-only mode until explicitly promoted to production. Safe testing for new agents.',
  'operations',
  '🧪',
  50,
  '[{
    "condition": "environment != \"production\"",
    "action": "log_only",
    "allow_execution": false,
    "description": "Sandbox mode: log actions without executing"
  }]'::jsonb,
  ARRAY['testing', 'sandbox', 'development', 'safety']
);

-- Function to increment use count
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE policy_templates
  SET use_count = use_count + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;
