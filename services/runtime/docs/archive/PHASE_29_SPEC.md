# Phase 29 — Cost Tracking & Execution Budgets

**Goal:** Track execution costs, enforce budgets  
**Duration:** 2-3 hours  
**Critical For:** Production cost control

---

## Problem Statement

**Current state:** No cost visibility:
- Can't track execution costs
- No budget enforcement
- No cost attribution per tenant/user
- No cost reporting

**Risk:** Runaway execution costs

---

## What to Build

### 1. Cost Tracking System

**Track costs per:**
- Execution (single workflow)
- Tenant (all executions for tenant)
- User (all executions for user)
- Time period (hourly/daily/monthly)

### 2. Cost Attribution

**Cost sources:**
- LLM token usage (Anthropic API)
- Execution time (compute cost estimate)
- Storage (State Graph writes)
- Network (remote dispatch)

### 3. Budget Enforcement

**Budget types:**
- Execution budget (max cost per execution)
- Hourly budget (max cost per hour per tenant)
- Daily budget (max cost per day per tenant)
- Monthly budget (max cost per month per tenant)

---

## Cost Model

### Token Costs (Anthropic)

**Haiku:**
- Input: $0.30 / 1M tokens
- Output: $1.50 / 1M tokens

**Sonnet:**
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens

**Opus:**
- Input: $15.00 / 1M tokens
- Output: $75.00 / 1M tokens

### Compute Costs (Estimated)

**Execution time:**
- $0.0001 per second (rough estimate)

### Storage Costs

**State Graph writes:**
- $0.00001 per write (negligible)

---

## Implementation Plan

### Component 1: CostTracker

**Location:** `vienna-core/lib/cost/cost-tracker.js`

```javascript
class CostTracker {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  // Record cost for execution
  async recordExecutionCost(executionId, costBreakdown) {
    await this.stateGraph.query(`
      INSERT INTO execution_costs (
        execution_id, tenant_id, user_id,
        llm_cost, compute_cost, storage_cost, total_cost,
        cost_breakdown
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      executionId,
      costBreakdown.tenant_id,
      costBreakdown.user_id,
      costBreakdown.llm_cost,
      costBreakdown.compute_cost,
      costBreakdown.storage_cost,
      costBreakdown.total_cost,
      JSON.stringify(costBreakdown)
    ]);
  }

  // Get tenant costs for time period
  getTenantCosts(tenantId, startTime, endTime) {
    return this.stateGraph.query(`
      SELECT
        SUM(total_cost) as total,
        SUM(llm_cost) as llm,
        SUM(compute_cost) as compute,
        COUNT(*) as execution_count
      FROM execution_costs
      WHERE tenant_id = ?
        AND created_at >= ?
        AND created_at < ?
    `, [tenantId, startTime, endTime])[0];
  }
}
```

### Component 2: BudgetEnforcer

**Location:** `vienna-core/lib/cost/budget-enforcer.js`

```javascript
class BudgetEnforcer {
  async checkBudget(tenantContext, estimatedCost) {
    // Check hourly budget
    const hourlySpend = await this._getHourlySpend(tenantContext.tenant_id);
    const hourlyLimit = await this._getBudgetLimit(tenantContext.tenant_id, 'hourly');

    if (hourlySpend + estimatedCost > hourlyLimit) {
      return {
        allowed: false,
        reason: 'Hourly budget exceeded',
        current: hourlySpend,
        limit: hourlyLimit,
        estimated: estimatedCost
      };
    }

    // Check daily budget
    const dailySpend = await this._getDailySpend(tenantContext.tenant_id);
    const dailyLimit = await this._getBudgetLimit(tenantContext.tenant_id, 'daily');

    if (dailySpend + estimatedCost > dailyLimit) {
      return {
        allowed: false,
        reason: 'Daily budget exceeded',
        current: dailySpend,
        limit: dailyLimit
      };
    }

    return { allowed: true };
  }
}
```

### Component 3: CostEstimator

**Location:** `vienna-core/lib/cost/cost-estimator.js`

```javascript
class CostEstimator {
  // Estimate cost before execution
  estimateExecutionCost(plan) {
    const steps = plan.workflow.steps;
    let totalCost = 0;

    for (const step of steps) {
      // Estimate based on action type
      if (step.action_type === 'query_agent') {
        // Assume 1000 tokens average
        totalCost += this._calculateLLMCost('haiku', 1000, 200);
      } else if (step.action_type === 'plan_generation') {
        // Assume 5000 tokens
        totalCost += this._calculateLLMCost('sonnet', 5000, 1000);
      }

      // Add compute cost (rough estimate)
      totalCost += (step.estimated_duration_ms || 10000) / 1000 * 0.0001;
    }

    return totalCost;
  }

  _calculateLLMCost(model, inputTokens, outputTokens) {
    const rates = {
      haiku: { input: 0.30 / 1000000, output: 1.50 / 1000000 },
      sonnet: { input: 3.00 / 1000000, output: 15.00 / 1000000 },
      opus: { input: 15.00 / 1000000, output: 75.00 / 1000000 }
    };

    const rate = rates[model] || rates.haiku;
    return (inputTokens * rate.input) + (outputTokens * rate.output);
  }
}
```

---

## Database Schema

```sql
-- Execution costs
CREATE TABLE IF NOT EXISTS execution_costs (
  execution_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  
  llm_cost REAL DEFAULT 0,
  compute_cost REAL DEFAULT 0,
  storage_cost REAL DEFAULT 0,
  network_cost REAL DEFAULT 0,
  total_cost REAL NOT NULL,
  
  cost_breakdown TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_execution_costs_tenant ON execution_costs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_execution_costs_user ON execution_costs(user_id, created_at);

-- Tenant budgets
CREATE TABLE IF NOT EXISTS tenant_budgets (
  tenant_id TEXT NOT NULL,
  budget_type TEXT NOT NULL CHECK(budget_type IN ('execution', 'hourly', 'daily', 'monthly')),
  budget_limit REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, budget_type)
);
```

---

## Integration Points

### IntentGateway (Pre-Execution)

```javascript
// Estimate cost
const estimatedCost = costEstimator.estimateExecutionCost(plan);

// Check budget
const budgetCheck = await budgetEnforcer.checkBudget(tenantContext, estimatedCost);

if (!budgetCheck.allowed) {
  return {
    denied: true,
    reason: budgetCheck.reason,
    budget_info: budgetCheck
  };
}
```

### PlanExecutionEngine (Post-Execution)

```javascript
// Track actual cost
const actualCost = {
  tenant_id: tenantContext.tenant_id,
  user_id: tenantContext.user_id,
  llm_cost: this._calculateActualLLMCost(execution),
  compute_cost: (execution.duration_ms / 1000) * 0.0001,
  storage_cost: 0.00001,
  total_cost: 0 // calculated
};

actualCost.total_cost = actualCost.llm_cost + actualCost.compute_cost + actualCost.storage_cost;

await costTracker.recordExecutionCost(execution.execution_id, actualCost);
```

---

## Cost Reporting API

### Endpoint: GET /api/v1/costs/tenant/:tenant_id

**Query params:**
- `start_time` (ISO 8601)
- `end_time` (ISO 8601)
- `granularity` (hour/day/month)

**Response:**
```json
{
  "tenant_id": "tenant_max",
  "period": {
    "start": "2026-03-22T00:00:00Z",
    "end": "2026-03-23T00:00:00Z"
  },
  "total_cost": 1.23,
  "breakdown": {
    "llm_cost": 1.10,
    "compute_cost": 0.12,
    "storage_cost": 0.01
  },
  "execution_count": 45,
  "budget": {
    "daily_limit": 10.00,
    "daily_used": 1.23,
    "daily_remaining": 8.77
  }
}
```

---

## Test Plan

### Test 1: Cost Tracking
- Execute workflow with LLM calls
- Verify: Cost recorded in execution_costs table
- Check: Token cost calculated correctly

### Test 2: Budget Enforcement
- Set tenant daily budget: $5
- Execute workflows totaling $5.50
- Verify: Last execution denied due to budget

### Test 3: Cost Estimation
- Generate plan
- Estimate cost
- Execute plan
- Compare: Estimated vs actual within 20%

### Test 4: Cost Reporting
- Execute 10 workflows
- Query tenant costs
- Verify: Aggregation correct, breakdown accurate

---

## Acceptance Criteria

1. ✅ Execution costs tracked accurately
2. ✅ Budget enforcement prevents overspend
3. ✅ Cost reporting API operational
4. ✅ Cost attribution per tenant/user working
5. ✅ Cost estimation within 20% of actual

---

## Files to Deliver

1. `vienna-core/lib/cost/cost-tracker.js`
2. `vienna-core/lib/cost/budget-enforcer.js`
3. `vienna-core/lib/cost/cost-estimator.js`
4. `vienna-core/lib/state/schema.sql` (execution_costs, tenant_budgets)
5. `vienna-core/console/server/src/routes/costs.ts` (API)
6. `tests/phase-29/test-cost-tracking.js`
7. `PHASE_29_COMPLETE.md`

---

## Estimated Duration

- CostTracker: 45 minutes
- BudgetEnforcer: 60 minutes
- CostEstimator: 30 minutes
- API + integration: 45 minutes

**Total: 2-3 hours**

---

## Next: Phase 30

**Phase 30:** Federation (multi-node execution coordination)
