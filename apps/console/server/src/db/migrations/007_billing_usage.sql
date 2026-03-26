-- Migration 007: Billing and Usage Metering Tables
-- Vienna OS billing infrastructure for multi-tenant usage tracking,
-- plan enforcement, and Stripe integration.

-- ===== USAGE EVENTS TABLE =====
-- Track all billable events (intents, executions, agents, policies, storage)
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant context
    tenant_id UUID NOT NULL,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'intent_submitted',
        'intent_approved', 
        'intent_denied',
        'execution_completed',
        'agent_registered',
        'agent_heartbeat',
        'policy_created',
        'policy_updated',
        'storage_used'
    )),
    
    -- Event count (for aggregation)
    count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0),
    
    -- Billing period (YYYY-MM format)
    period VARCHAR(7) NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
    
    -- Additional event metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Unique constraint to prevent double-counting
    UNIQUE (tenant_id, event_type, period)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_period ON usage_events (tenant_id, period);
CREATE INDEX IF NOT EXISTS idx_usage_events_type_period ON usage_events (event_type, period);
CREATE INDEX IF NOT EXISTS idx_usage_events_recorded_at ON usage_events (recorded_at);

-- ===== USAGE SUMMARIES TABLE =====
-- Pre-computed monthly usage summaries for fast billing calculations
CREATE TABLE IF NOT EXISTS usage_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant and period
    tenant_id UUID NOT NULL,
    period VARCHAR(7) NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
    
    -- Aggregated metrics (JSON for flexibility)
    metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Overage charges for the period
    overage_charges DECIMAL(10,2) DEFAULT 0.00 CHECK (overage_charges >= 0),
    
    -- Human-readable summary text
    summary TEXT,
    
    -- Generation metadata
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    generated_by VARCHAR(50) DEFAULT 'system',
    
    -- Unique constraint
    UNIQUE (tenant_id, period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_summaries_tenant ON usage_summaries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_summaries_period ON usage_summaries (period);
CREATE INDEX IF NOT EXISTS idx_usage_summaries_generated_at ON usage_summaries (generated_at);

-- ===== BILLING ALERTS TABLE =====
-- Track usage alerts and limit violations
CREATE TABLE IF NOT EXISTS billing_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant context
    tenant_id UUID NOT NULL,
    
    -- Alert details
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('overage', 'limit', 'usage')),
    metric VARCHAR(30) NOT NULL CHECK (metric IN ('agents', 'intents', 'policies', 'storage', 'executions')),
    threshold_percent INTEGER NOT NULL CHECK (threshold_percent BETWEEN 1 AND 100),
    
    -- Alert message
    message TEXT NOT NULL,
    
    -- Alert lifecycle
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_alerts_tenant ON billing_alerts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_triggered_at ON billing_alerts (triggered_at);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_type ON billing_alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_billing_alerts_unresolved ON billing_alerts (tenant_id, resolved_at) WHERE resolved_at IS NULL;

-- ===== PLAN USAGE VIEW =====
-- Convenient view for current month usage vs plan limits
CREATE OR REPLACE VIEW tenant_usage_current AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.plan,
    t.max_agents as plan_max_agents,
    t.max_policies as plan_max_policies,
    
    -- Current month period
    TO_CHAR(NOW(), 'YYYY-MM') as current_period,
    
    -- Usage metrics (from usage_events)
    COALESCE(ue_intents.count, 0) as intents_submitted,
    COALESCE(ue_executions.count, 0) as executions_completed, 
    COALESCE(ue_policies.count, 0) as policies_created,
    
    -- Active agents (distinct agents with heartbeat in last 24h)
    COALESCE(active_agents.count, 0) as active_agents,
    
    -- Storage usage (latest storage event)
    COALESCE(latest_storage.count, 0) as storage_gb,
    
    -- Utilization percentages (null for unlimited plans)
    CASE 
        WHEN t.max_agents > 0 THEN ROUND((COALESCE(active_agents.count, 0) * 100.0 / t.max_agents), 2)
        ELSE NULL
    END as agents_utilization_percent,
    
    CASE 
        WHEN t.max_policies > 0 THEN ROUND((COALESCE(ue_policies.count, 0) * 100.0 / t.max_policies), 2)
        ELSE NULL  
    END as policies_utilization_percent,
    
    -- Plan limit status
    CASE
        WHEN t.max_agents > 0 AND COALESCE(active_agents.count, 0) >= t.max_agents THEN true
        ELSE false
    END as agents_at_limit,
    
    CASE
        WHEN t.max_policies > 0 AND COALESCE(ue_policies.count, 0) >= t.max_policies THEN true
        ELSE false  
    END as policies_at_limit,
    
    -- Recent alerts count
    COALESCE(recent_alerts.count, 0) as alerts_last_24h

FROM tenants t

-- Intent usage this month
LEFT JOIN (
    SELECT tenant_id, SUM(count) as count
    FROM usage_events 
    WHERE event_type = 'intent_submitted' 
      AND period = TO_CHAR(NOW(), 'YYYY-MM')
    GROUP BY tenant_id
) ue_intents ON t.id = ue_intents.tenant_id

-- Execution usage this month
LEFT JOIN (
    SELECT tenant_id, SUM(count) as count
    FROM usage_events 
    WHERE event_type = 'execution_completed'
      AND period = TO_CHAR(NOW(), 'YYYY-MM')
    GROUP BY tenant_id
) ue_executions ON t.id = ue_executions.tenant_id

-- Policy usage (cumulative)
LEFT JOIN (
    SELECT tenant_id, SUM(count) as count
    FROM usage_events 
    WHERE event_type = 'policy_created'
    GROUP BY tenant_id
) ue_policies ON t.id = ue_policies.tenant_id

-- Active agents (heartbeat in last 24h)
LEFT JOIN (
    SELECT tenant_id, COUNT(DISTINCT metadata->>'agent_id') as count
    FROM usage_events 
    WHERE event_type IN ('agent_registered', 'agent_heartbeat')
      AND recorded_at > NOW() - INTERVAL '24 hours'
    GROUP BY tenant_id
) active_agents ON t.id = active_agents.tenant_id

-- Latest storage usage
LEFT JOIN (
    SELECT DISTINCT ON (tenant_id) tenant_id, count
    FROM usage_events 
    WHERE event_type = 'storage_used'
    ORDER BY tenant_id, recorded_at DESC
) latest_storage ON t.id = latest_storage.tenant_id

-- Recent alerts
LEFT JOIN (
    SELECT tenant_id, COUNT(*) as count
    FROM billing_alerts
    WHERE triggered_at > NOW() - INTERVAL '24 hours'
      AND resolved_at IS NULL
    GROUP BY tenant_id
) recent_alerts ON t.id = recent_alerts.tenant_id;

-- ===== BILLING FUNCTIONS =====

-- Function to record usage events with deduplication
CREATE OR REPLACE FUNCTION record_usage_event(
    p_tenant_id UUID,
    p_event_type VARCHAR(50),
    p_count INTEGER DEFAULT 1,
    p_period VARCHAR(7) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_period VARCHAR(7);
    v_event_id UUID;
BEGIN
    -- Default to current month if period not specified
    v_period := COALESCE(p_period, TO_CHAR(NOW(), 'YYYY-MM'));
    
    -- Insert or update usage event
    INSERT INTO usage_events (tenant_id, event_type, count, period, metadata)
    VALUES (p_tenant_id, p_event_type, p_count, v_period, p_metadata)
    ON CONFLICT (tenant_id, event_type, period)
    DO UPDATE SET 
        count = usage_events.count + EXCLUDED.count,
        metadata = EXCLUDED.metadata,
        recorded_at = NOW()
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check plan limits
CREATE OR REPLACE FUNCTION check_plan_limit(
    p_tenant_id UUID,
    p_resource VARCHAR(20) -- 'agents', 'policies', 'intents'
) RETURNS TABLE (
    allowed BOOLEAN,
    current_usage INTEGER,
    plan_limit INTEGER,
    utilization_percent NUMERIC
) AS $$
DECLARE
    v_tenant RECORD;
    v_current_usage INTEGER := 0;
    v_plan_limit INTEGER := 0;
    v_utilization NUMERIC := 0;
BEGIN
    -- Get tenant plan
    SELECT plan, max_agents, max_policies INTO v_tenant
    FROM tenants WHERE id = p_tenant_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
    END IF;
    
    -- Get current usage based on resource type
    CASE p_resource
        WHEN 'agents' THEN
            SELECT COALESCE(active_agents, 0), plan_max_agents 
            INTO v_current_usage, v_plan_limit
            FROM tenant_usage_current 
            WHERE tenant_id = p_tenant_id;
            
        WHEN 'policies' THEN
            SELECT COALESCE(policies_created, 0), plan_max_policies
            INTO v_current_usage, v_plan_limit
            FROM tenant_usage_current
            WHERE tenant_id = p_tenant_id;
            
        WHEN 'intents' THEN
            -- Monthly intent limit (would need to be added to tenant table)
            v_current_usage := (
                SELECT COALESCE(intents_submitted, 0)
                FROM tenant_usage_current
                WHERE tenant_id = p_tenant_id
            );
            -- Default monthly limits by plan
            v_plan_limit := CASE v_tenant.plan
                WHEN 'community' THEN 1000
                WHEN 'team' THEN 10000  
                WHEN 'business' THEN 50000
                WHEN 'enterprise' THEN -1 -- Unlimited
                ELSE 1000
            END;
    END CASE;
    
    -- Calculate utilization
    IF v_plan_limit > 0 THEN
        v_utilization := ROUND((v_current_usage * 100.0 / v_plan_limit), 2);
    ELSE
        v_utilization := 0; -- Unlimited
    END IF;
    
    -- Return results
    RETURN QUERY SELECT 
        (v_plan_limit <= 0 OR v_current_usage < v_plan_limit) as allowed,
        v_current_usage,
        v_plan_limit,
        v_utilization;
END;
$$ LANGUAGE plpgsql;

-- ===== SAMPLE DATA =====
-- Insert some sample usage data for testing

-- Sample usage events for a test tenant
DO $$
DECLARE
    v_tenant_id UUID;
    v_current_period VARCHAR(7) := TO_CHAR(NOW(), 'YYYY-MM');
    v_last_period VARCHAR(7) := TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM');
BEGIN
    -- Get first tenant (or create one for testing)
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        -- Create test tenant if none exists
        INSERT INTO tenants (name, slug, plan, max_agents, max_policies)
        VALUES ('Test Organization', 'test-org', 'business', 100, 100)
        RETURNING id INTO v_tenant_id;
    END IF;
    
    -- Current month usage
    PERFORM record_usage_event(v_tenant_id, 'intent_submitted', 1250, v_current_period);
    PERFORM record_usage_event(v_tenant_id, 'intent_approved', 1200, v_current_period); 
    PERFORM record_usage_event(v_tenant_id, 'intent_denied', 50, v_current_period);
    PERFORM record_usage_event(v_tenant_id, 'execution_completed', 1180, v_current_period);
    PERFORM record_usage_event(v_tenant_id, 'agent_registered', 15, v_current_period);
    PERFORM record_usage_event(v_tenant_id, 'policy_created', 8, v_current_period);
    PERFORM record_usage_event(v_tenant_id, 'storage_used', 5, v_current_period); -- 5GB
    
    -- Last month usage
    PERFORM record_usage_event(v_tenant_id, 'intent_submitted', 890, v_last_period);
    PERFORM record_usage_event(v_tenant_id, 'intent_approved', 850, v_last_period);
    PERFORM record_usage_event(v_tenant_id, 'intent_denied', 40, v_last_period);
    PERFORM record_usage_event(v_tenant_id, 'execution_completed', 835, v_last_period);
    
    RAISE NOTICE 'Sample usage data created for tenant %', v_tenant_id;
END;
$$;

-- ===== COMMENTS =====

COMMENT ON TABLE usage_events IS 'Tracks all billable events for usage-based billing and plan enforcement';
COMMENT ON TABLE usage_summaries IS 'Pre-computed monthly summaries for billing calculations';
COMMENT ON TABLE billing_alerts IS 'Usage alerts and limit violations for proactive monitoring';
COMMENT ON VIEW tenant_usage_current IS 'Real-time view of tenant usage vs plan limits for current month';

COMMENT ON FUNCTION record_usage_event IS 'Safely record usage events with automatic deduplication';
COMMENT ON FUNCTION check_plan_limit IS 'Check if tenant has reached plan limits for a specific resource';

-- Add foreign key constraints (assumes tenants table exists)
-- ALTER TABLE usage_events ADD CONSTRAINT fk_usage_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
-- ALTER TABLE usage_summaries ADD CONSTRAINT fk_usage_summaries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;  
-- ALTER TABLE billing_alerts ADD CONSTRAINT fk_billing_alerts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;