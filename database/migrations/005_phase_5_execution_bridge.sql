-- Phase 5: Integrated Execution Pipeline
-- Adds execution_config to action_types + retry_config to adapter_configs

-- Allow action types to define execution step templates
ALTER TABLE regulator.action_types 
  ADD COLUMN IF NOT EXISTS execution_config JSONB;

COMMENT ON COLUMN regulator.action_types.execution_config IS 
  'Step template for managed execution. When set, warranted intents auto-trigger execution.';

-- Add retry configuration to adapter configs
ALTER TABLE regulator.adapter_configs 
  ADD COLUMN IF NOT EXISTS retry_config JSONB DEFAULT '{"max_retries": 0, "backoff_base_ms": 1000, "backoff_max_ms": 30000}';

-- Add execution_id reference to proposals for traceability
ALTER TABLE regulator.proposals 
  ADD COLUMN IF NOT EXISTS execution_id TEXT;

CREATE INDEX IF NOT EXISTS idx_proposals_execution_id 
  ON regulator.proposals(execution_id) 
  WHERE execution_id IS NOT NULL;

-- Add proposal_id to execution_log for governance linkage  
-- (column may not exist yet)
DO $$ BEGIN
  ALTER TABLE regulator.execution_log ADD COLUMN IF NOT EXISTS proposal_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_execution_log_proposal_id
  ON regulator.execution_log(proposal_id)
  WHERE proposal_id IS NOT NULL;
