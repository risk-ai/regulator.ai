# Phase 28 — Execution Isolation (Multi-Tenant Safety)

**Goal:** Prevent executions from interfering with each other  
**Duration:** 3-4 hours  
**Critical For:** Production multi-user deployment

---

## Problem Statement

**Current state:** Executions can interfere:
- Shared lock namespaces
- Global rate limits
- No resource quotas
- No tenant boundaries

**Risk:** User A's execution can block User B's execution

---

## What to Build

### 1. Execution Isolation Layer

**Isolation boundaries:**
- Separate lock namespaces per tenant
- Per-tenant rate limits
- Per-tenant resource quotas
- Execution context isolation

### 2. Tenant Context

**Track execution ownership:**
```json
{
  "execution_id": "exec_123",
  "tenant_id": "tenant_max",
  "user_id": "max@law.ai",
  "workspace_id": "workspace_default",
  "isolation_level": "tenant"
}
```

### 3. Resource Quotas

**Per-tenant limits:**
- Concurrent executions (max 10)
- Executions per hour (max 100)
- Lock acquisition limit (max 50)
- Execution duration budget (max 1 hour/day)

### 4. Lock Namespace Isolation

**Current:**
```
lock:target:openclaw-gateway
```

**Isolated:**
```
lock:tenant_max:target:openclaw-gateway
```

**Guarantee:** Tenant A locks don't block Tenant B

---

## Implementation Plan

### Component 1: TenantContext

**Location:** `vienna-core/lib/isolation/tenant-context.js`

```javascript
class TenantContext {
  constructor(tenantId, userId, workspaceId) {
    this.tenant_id = tenantId;
    this.user_id = userId;
    this.workspace_id = workspaceId;
    this.isolation_level = 'tenant'; // or 'user', 'workspace', 'global'
  }

  getLockNamespace() {
    return `tenant:${this.tenant_id}`;
  }

  getRateLimitKey(resource) {
    return `ratelimit:${this.tenant_id}:${resource}`;
  }

  getQuotaKey(quotaType) {
    return `quota:${this.tenant_id}:${quotaType}`;
  }
}
```

### Component 2: ResourceQuotaManager

**Location:** `vienna-core/lib/isolation/resource-quota-manager.js`

**API:**
- `checkQuota(tenantContext, quotaType)` → { allowed, current, limit }
- `consumeQuota(tenantContext, quotaType, amount)`
- `releaseQuota(tenantContext, quotaType, amount)`
- `getQuotaStatus(tenantContext)` → all quotas

**Quota types:**
- `concurrent_executions`
- `hourly_executions`
- `daily_execution_time`
- `lock_acquisitions`

### Component 3: IsolatedLockManager

**Location:** `vienna-core/lib/isolation/isolated-lock-manager.js`

**Wraps existing lock manager with tenant namespacing:**
```javascript
class IsolatedLockManager {
  acquireLock(targetId, executionId, tenantContext) {
    const namespacedTarget = `${tenantContext.getLockNamespace()}:${targetId}`;
    return this.lockManager.acquireLock(namespacedTarget, executionId);
  }
}
```

---

## Integration Points

### PlanExecutionEngine

**Before:**
```javascript
await lockManager.acquireLock(targetId, executionId);
```

**After:**
```javascript
const tenantContext = execution.tenant_context;
await quotaManager.checkQuota(tenantContext, 'concurrent_executions');
await isolatedLockManager.acquireLock(targetId, executionId, tenantContext);
await quotaManager.consumeQuota(tenantContext, 'concurrent_executions', 1);
```

### IntentGateway

**Inject tenant context from operator identity:**
```javascript
const tenantContext = new TenantContext(
  operator.tenant_id || 'default',
  operator.user_id,
  operator.workspace_id || 'default'
);

intent.tenant_context = tenantContext;
```

---

## Database Schema

```sql
-- Tenant quota usage
CREATE TABLE IF NOT EXISTS tenant_quotas (
  tenant_id TEXT NOT NULL,
  quota_type TEXT NOT NULL,
  current_usage INTEGER DEFAULT 0,
  quota_limit INTEGER NOT NULL,
  window_start TEXT,
  window_end TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, quota_type)
);

-- Execution ownership
ALTER TABLE execution_ledger_summary
ADD COLUMN tenant_id TEXT;

ALTER TABLE execution_ledger_summary
ADD COLUMN user_id TEXT;
```

---

## Test Plan

### Test 1: Tenant Isolation
- Tenant A acquires lock on `openclaw-gateway`
- Tenant B can still acquire lock on same target
- Verify: Different lock namespaces

### Test 2: Quota Enforcement
- Tenant A runs 10 concurrent executions (hits limit)
- Attempt 11th execution → denied by quota
- Verify: Quota blocking works

### Test 3: Quota Release
- Execution completes
- Quota released automatically
- New execution can proceed

### Test 4: Cross-Tenant Independence
- Tenant A exhausts quota
- Tenant B unaffected
- Verify: No cross-tenant quota interference

---

## Acceptance Criteria

1. ✅ Tenants cannot block each other's locks
2. ✅ Per-tenant quota enforcement working
3. ✅ Quota release on execution completion
4. ✅ No cross-tenant interference
5. ✅ Tenant context propagates through execution pipeline

---

## Files to Deliver

1. `vienna-core/lib/isolation/tenant-context.js`
2. `vienna-core/lib/isolation/resource-quota-manager.js`
3. `vienna-core/lib/isolation/isolated-lock-manager.js`
4. `vienna-core/lib/state/schema.sql` (tenant_quotas table)
5. `tests/phase-28/test-execution-isolation.js`
6. `PHASE_28_COMPLETE.md`

---

## Estimated Duration

- TenantContext: 30 minutes
- ResourceQuotaManager: 90 minutes
- IsolatedLockManager: 60 minutes
- Integration + testing: 60 minutes

**Total: 3-4 hours**

---

## Next: Phase 29

**Phase 29:** Cost Tracking (execution budgets, cost attribution)
