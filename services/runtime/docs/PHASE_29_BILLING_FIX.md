# Phase 29 Billing Attribution Fix

**Date:** 2026-03-22 23:35 EDT  
**Status:** Integration wired, validation in progress

---

## Problem

Phase 29 cost tracking was deployed BUT all costs were attributed to fake tenant `'system'` because:

```javascript
// plan-execution-engine.js line 543:
tenant_id: context.tenant_id || 'system'
```

**Root cause:** `context` arrives EMPTY from dashboard chat — no tenant_id injection anywhere in the call chain.

**Impact:**
- ❌ All production costs → fake tenant
- ❌ Multi-tenant billing completely broken
- ❌ No cost attribution accuracy
- ❌ Phase 29 functionally UNSAFE for billing

---

## Solution

**Wire tenant resolution at EVERY execution entry point:**

1. **Entry point** (chat-action-bridge) → Resolve tenant FIRST
2. **Enrich context** → tenant_id, workspace_id, user_id
3. **Propagate** → Through entire execution pipeline
4. **Cost recording** → Use REAL context (no fallback)
5. **Ledger** → Verify attribution

---

## Implementation

### 1. ChatActionBridge Integration

**File:** `lib/core/chat-action-bridge.js`

**Changes:**
1. Import TenantResolver
2. Initialize in setDependencies()
3. Resolve tenant at top of interpretAndExecute()
4. Enrich context with validated tenant identity
5. Pass enriched context through entire workflow

**Code pattern:**
```javascript
async interpretAndExecute(request, context = {}, session = null) {
  // PHASE 21: TENANT RESOLUTION (ENTRY POINT)
  if (!this.tenantResolver) {
    throw new Error('TenantResolver not initialized');
  }

  const tenantResolution = await this.tenantResolver.enforce(context, session);
  
  // Enrich context with validated tenant identity
  const enrichedContext = {
    ...context,
    tenant_id: tenantResolution.tenant_id,
    workspace_id: context.workspace_id || null,
    user_id: context.user_id || (session?.user?.id || null),
    tenant_resolution_strategy: tenantResolution.strategy
  };
  
  // ... rest of method uses enrichedContext
}
```

### 2. Console Server Integration

**File:** Console chat route (needs identification)

**Changes:**
1. Extract tenant_id from session
2. Pass session object to interpretAndExecute()
3. Include workspace_id and user_id if available

**Code pattern:**
```javascript
// In chat route handler:
const context = {
  tenant_id: req.session?.tenant_id,
  workspace_id: req.session?.workspace_id,
  user_id: req.session?.user?.id
};

const session = req.session;

const result = await chatActionBridge.interpretAndExecute(
  request,
  context,
  session
);
```

### 3. Cost Tracker Validation

**No changes needed** — CostTracker already uses context.tenant_id correctly.

**Validation:** Cost recording receives enriched context with real tenant_id.

---

## Resolution Strategies

**Priority order:**
1. **Explicit context.tenant_id** (if validated) → CONTEXT strategy
2. **Session tenant_id** (if authenticated) → SESSION strategy
3. **Internal flag** (context.internal === true) → SYSTEM strategy
4. **Fallback** (anonymous/unauthenticated) → DEFAULT strategy

**Key rules:**
- User requests NEVER use `'system'` tenant
- Anonymous requests → `'default'` tenant
- Internal operations → `'system'` tenant
- All strategies validate tenant exists and is active

---

## Validation Tests

**File:** `tests/phase-21/test-billing-attribution.js`

**Coverage:**
1. ✅ Tenant resolution at entry point
2. ✅ Context enrichment (tenant/workspace/user)
3. ✅ Fallback to default tenant (anonymous)
4. ✅ Session-based resolution
5. ✅ System tenant for internal ops
6. ✅ Cost recording with correct attribution
7. ✅ NO fallback to system for user requests

**Test results:** 7/7 passing

---

## Verification Checklist

**Before deployment:**

- [ ] TenantResolver initialized in chat-action-bridge
- [ ] Console server passes session to interpretAndExecute()
- [ ] One real execution produces correct tenant attribution
- [ ] Cost ledger shows real tenant_id (not 'system' or null)
- [ ] No cross-tenant leakage
- [ ] No duplicate cost entries
- [ ] Anonymous requests use 'default' tenant
- [ ] Internal operations use 'system' tenant

---

## Deployment Steps

1. **Verify integration**
   - Run `test-billing-attribution.js`
   - Confirm 7/7 passing

2. **Console server update**
   - Identify chat route handler
   - Add session passing
   - Rebuild console if needed

3. **Production validation**
   - Submit ONE test execution
   - Query execution_costs table
   - Verify tenant_id is correct

4. **Monitor**
   - Check for any 'system' tenant costs (should be ZERO for user requests)
   - Verify default tenant receives anonymous traffic
   - Confirm workspace_id and user_id populated when available

---

## Success Criteria

✅ **DONE when:**
- One real dashboard execution shows:
  - Correct tenant_id (not 'system', not null)
  - Correct workspace_id (if available)
  - Correct user_id (if available)
  - Correct cost calculation
  - Correct ledger entry

❌ **NOT done until:**
- All user executions have real tenant attribution
- No 'system' tenant costs except internal ops
- No null tenant_id in execution_costs table

---

## Files Modified

**Source:**
- `lib/core/chat-action-bridge.js` (tenant resolution at entry)
- `lib/identity/tenant-resolver.js` (Phase 21 component)
- Console chat route (session passing) — TBD

**Tests:**
- `tests/phase-21/test-billing-attribution.js` (new, 8.8 KB, 7 tests)

**Docs:**
- This file

---

## Current Status

**Completed:**
- ✅ Phase 21 tenant identity (16/16 tests)
- ✅ TenantResolver integration in chat-action-bridge
- ✅ Billing attribution tests (7/7 passing)

**Pending:**
- ⏳ Console server session passing (needs route identification)
- ⏳ Production validation (one real execution)

**Next:**
- Find console chat route
- Add session parameter
- Validate with real execution

---

## After This Fix

**Then safe to:**
1. Deploy Phase 27 (tenant context propagation)
2. Deploy Phase 28 (workspace mapping)
3. Deploy Phase 30 (federation context)

**NOT safe until:**
- This fix is deployed AND validated
- Real execution shows correct attribution

---

**This is the moment Vienna stops being "feature-rich" and starts being CORRECT.**
