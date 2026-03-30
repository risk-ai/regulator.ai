# Multi-Tenant Isolation Audit

**Date:** 2026-03-29 17:32 EDT  
**Status:** 🔴 **CRITICAL SECURITY ISSUE FOUND**  
**Severity:** HIGH (data leakage between tenants)

---

## 🚨 **CRITICAL FINDING**

**Issue:** Routes do NOT filter by `tenant_id`, allowing users to see other tenants' data.

**Impact:**
- User A can see User B's proposals
- User A can see User B's agents
- User A can see User B's policies
- **Full data leakage across tenants**

**Risk Level:** 🔴 **CRITICAL** (before public launch)

---

## 📊 **CURRENT STATE**

### **Database Schema** ✅
- `users` table has `tenant_id` column ✅
- `tenants` table exists ✅
- Registration creates **separate tenant** per user ✅

### **Authentication** ✅
- JWT tokens include `tenantId` ✅
- Each user assigned to their own tenant ✅
- Token validation works ✅

### **Data Isolation** ❌
- Proposals: NO tenant filtering
- Agents: NO tenant filtering
- Policies: NO tenant filtering
- Warrants: NO tenant filtering
- **Only 2 queries filter by tenant_id (both in auth.ts)**

---

## 🔍 **AFFECTED ROUTES**

### **CRITICAL (Data Leakage)**
1. `proposals.ts` - All users see all proposals
2. `agents.ts` - All users see all agents
3. `policies.ts` - All users see all policies
4. `executions.ts` - All users see all executions
5. `approvals.ts` - All users see all approval requests
6. `dashboard.ts` - Shows global stats, not tenant-specific

### **MEDIUM (Potential Leakage)**
7. `artifacts.ts` - Execution artifacts
8. `events.ts` - Event logs
9. `audit.ts` - Audit trail
10. `webhooks.ts` - Webhook configs

### **LOW (Informational)**
11. `models.ts` - Model registry (may be global)
12. `providers.ts` - Provider health (may be global)

---

## ✅ **CORRECT IMPLEMENTATION**

### **How Registration Works (CORRECT)**

```typescript
// auth.ts - register endpoint
// 1. Create new tenant for each user
const tenant = await queryOne(
  `INSERT INTO tenants (name, slug, plan, max_agents, max_policies)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING id`,
  [company || `${name}'s Organization`, slug, plan, maxAgents, maxPolicies]
);

// 2. Create user linked to that tenant
const user = await queryOne(
  `INSERT INTO users (tenant_id, email, password_hash, name, role)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING id`,
  [tenant.id, email, passwordHash, name, 'admin']
);

// 3. Token includes tenantId
const tokenPayload = {
  userId: user.id,
  tenantId: tenant.id,  // ✅ Included
  email: email
};
```

**Result:** Each user gets their own tenant ✅

---

## ❌ **BROKEN IMPLEMENTATION**

### **Example: proposals.ts (NO FILTERING)**

```typescript
// CURRENT (BROKEN):
router.get('/', async (req, res) => {
  const proposals = stateGraph.listProposals(filters);
  // Returns ALL proposals from ALL tenants ❌
  res.json({ proposals });
});

// SHOULD BE:
router.get('/', jwtAuthMiddleware, async (req, res) => {
  const tenantId = (req as AuthenticatedRequest).user.tenantId;
  const proposals = stateGraph.listProposals({
    ...filters,
    tenant_id: tenantId  // ✅ Filter by tenant
  });
  res.json({ proposals });
});
```

---

## 🔧 **REQUIRED FIXES**

### **Step 1: Add Tenant Context Middleware**

Create `src/middleware/tenantContext.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './jwtAuth.js';

export interface TenantRequest extends AuthenticatedRequest {
  tenantId: string;
}

/**
 * Middleware to extract tenantId from JWT and add to request
 * Must be used AFTER jwtAuthMiddleware
 */
export function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user || !authReq.user.tenantId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
    });
  }

  (req as TenantRequest).tenantId = authReq.user.tenantId;
  next();
}
```

### **Step 2: Update All Routes**

**Pattern:**
```typescript
// Before
router.get('/', async (req, res) => {
  const items = await query('SELECT * FROM items');
  res.json({ items });
});

// After
import { jwtAuthMiddleware } from '../middleware/jwtAuth.js';
import { tenantContextMiddleware, TenantRequest } from '../middleware/tenantContext.js';

router.get('/', jwtAuthMiddleware, tenantContextMiddleware, async (req, res) => {
  const tenantId = (req as TenantRequest).tenantId;
  const items = await query(
    'SELECT * FROM items WHERE tenant_id = $1',
    [tenantId]
  );
  res.json({ items });
});
```

### **Step 3: Add tenant_id to Database Tables**

**Check which tables need tenant_id column:**

```sql
-- Example: Add tenant_id to proposals table (if not exists)
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id 
ON proposals(tenant_id);
```

**Tables that MUST have tenant_id:**
- proposals
- agents
- policies
- policy_rules
- executions
- execution_ledger_events
- approval_requests
- artifacts
- webhooks
- objectives
- managed_objectives

---

## 🎯 **IMPLEMENTATION PRIORITY**

### **URGENT (Before Public Launch)**
1. ✅ Add tenant context middleware
2. ✅ Update proposals.ts (CRITICAL)
3. ✅ Update agents.ts (CRITICAL)
4. ✅ Update policies.ts (CRITICAL)
5. ✅ Update executions.ts (CRITICAL)

### **HIGH PRIORITY**
6. ✅ Update approvals.ts
7. ✅ Update dashboard.ts (tenant-specific stats)
8. ✅ Update artifacts.ts
9. ✅ Update webhooks.ts
10. ✅ Update audit.ts

### **MEDIUM PRIORITY**
11. Add tenant_id to missing DB tables
12. Create migration script
13. Backfill tenant_id for existing data
14. Add database constraints (FOREIGN KEY)

---

## ⚠️ **CURRENT RISK**

**Scenario:**
1. User A registers → Gets tenant `abc-123`
2. User B registers → Gets tenant `def-456`
3. User A creates proposal `prop_001` (should be in tenant `abc-123`)
4. User B calls `/api/v1/proposals` → **Sees User A's proposal** ❌

**This is a CRITICAL security vulnerability.**

---

## ✅ **VERIFICATION PLAN**

### **Test 1: Create Two Users**
```bash
# Register user 1
curl -X POST http://localhost:3100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@test.com", "password": "test123", "name": "User 1"}'

# Register user 2
curl -X POST http://localhost:3100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user2@test.com", "password": "test123", "name": "User 2"}'
```

### **Test 2: Create Data as User 1**
```bash
# Login as user 1
TOKEN1=$(curl -X POST http://localhost:3100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@test.com", "password": "test123"}' | jq -r '.data.tokens.accessToken')

# Create proposal as user 1
curl -X POST http://localhost:3100/api/v1/proposals \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"objective": "User 1 proposal", "actions": []}'
```

### **Test 3: Verify User 2 CANNOT See User 1's Data**
```bash
# Login as user 2
TOKEN2=$(curl -X POST http://localhost:3100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user2@test.com", "password": "test123"}' | jq -r '.data.tokens.accessToken')

# List proposals as user 2
curl -X GET http://localhost:3100/api/v1/proposals \
  -H "Authorization: Bearer $TOKEN2"

# Should return EMPTY array or only user 2's proposals ✅
# If it returns user 1's proposal → FAIL ❌
```

---

## 📋 **ACTION PLAN**

### **NOW (Before Launch)**
1. Create tenant context middleware
2. Fix proposals.ts route
3. Fix agents.ts route
4. Fix policies.ts route
5. Test with 2 users (verify isolation)

### **This Week**
6. Fix all remaining routes
7. Add tenant_id to database tables
8. Create migration script
9. Add integration tests
10. Security audit

### **Ongoing**
11. Add tenant_id to all new features
12. Document multi-tenant patterns
13. Add automated tests for isolation

---

## 🚨 **RECOMMENDATION**

**Do NOT launch publicly until tenant isolation is fixed.**

**Current state:** Any user can see all data from all users.

**Time to fix:** 2-4 hours for critical routes

**Priority:** 🔴 **BLOCKING LAUNCH**

---

**Audited By:** Vienna (Technical Lead)  
**Date:** 2026-03-29 17:32 EDT  
**Status:** 🔴 CRITICAL ISSUE - IMMEDIATE FIX REQUIRED
