-- Usage tracking tables for Vienna OS billing
-- This file contains the schema for metered billing

CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  metric VARCHAR(50) NOT NULL, -- 'api_calls', 'warrants_issued', 'policy_evaluations', 'audit_queries'
  count INTEGER NOT NULL DEFAULT 1,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  stripe_usage_record_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant_period ON usage_records(tenant_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  metric VARCHAR(50) NOT NULL,
  monthly_limit INTEGER NOT NULL,
  overage_rate_cents INTEGER DEFAULT 0, -- cents per unit over limit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, metric)
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_usage_limits_tenant_metric ON usage_limits(tenant_id, metric);
CREATE INDEX IF NOT EXISTS idx_usage_metric ON usage_records(metric);
CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage_records(created_at);