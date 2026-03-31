-- Migration: Add billing columns to tenants table
-- Date: 2026-03-31
-- Purpose: Support Stripe subscription tracking

-- Add columns for Stripe subscription tracking
ALTER TABLE regulator.tenants
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_items JSONB,
  ADD COLUMN IF NOT EXISTS plan_name TEXT;

-- Add index on stripe_subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id 
  ON regulator.tenants(stripe_subscription_id) 
  WHERE stripe_subscription_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN regulator.tenants.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN regulator.tenants.stripe_subscription_items IS 'JSON array of Stripe subscription items with prices and quantities';
COMMENT ON COLUMN regulator.tenants.plan_name IS 'Human-readable plan name (Team, Business, Enterprise)';
