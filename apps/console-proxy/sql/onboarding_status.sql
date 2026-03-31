-- Create onboarding_status table for tracking user onboarding progress
-- This table tracks whether each tenant has completed the initial setup wizard

CREATE TABLE IF NOT EXISTS public.onboarding_status (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_status_completed ON public.onboarding_status(completed);

-- Add RLS policy to ensure tenant isolation
ALTER TABLE public.onboarding_status ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their tenant's onboarding status
CREATE POLICY tenant_isolation_onboarding ON public.onboarding_status
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);