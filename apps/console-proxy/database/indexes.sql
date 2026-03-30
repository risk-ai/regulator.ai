-- Vienna OS Database Performance Indexes
-- Optimized for high-volume execution and audit queries

-- Execution Ledger Events (most queried table)
CREATE INDEX IF NOT EXISTS idx_execution_ledger_execution_id ON execution_ledger_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_event_type ON execution_ledger_events(event_type);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_timestamp ON execution_ledger_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_tenant_id ON execution_ledger_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_composite ON execution_ledger_events(tenant_id, event_type, event_timestamp DESC);

-- Approval Requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_tier ON approval_requests(required_tier);
CREATE INDEX IF NOT EXISTS idx_approval_requests_execution_id ON approval_requests(execution_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_at ON approval_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_composite ON approval_requests(status, required_tier, requested_at DESC);

-- Policies
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);
CREATE INDEX IF NOT EXISTS idx_policies_tier ON policies(tier);
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies(priority DESC);
CREATE INDEX IF NOT EXISTS idx_policies_composite ON policies(enabled, tier, priority DESC);

-- Agents
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);

-- Users (auth optimization)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_exec_approval_join ON approval_requests(execution_id, status, required_tier);

-- Partial indexes for hot queries
CREATE INDEX IF NOT EXISTS idx_pending_approvals ON approval_requests(requested_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_active_policies ON policies(priority DESC) WHERE enabled = 1;

-- Add statistics for query planner
ANALYZE execution_ledger_events;
ANALYZE approval_requests;
ANALYZE policies;
ANALYZE agents;
ANALYZE users;
