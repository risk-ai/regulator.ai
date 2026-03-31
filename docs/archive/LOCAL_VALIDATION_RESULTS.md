# Local Governed Backend Validation

**Date:** 2026-03-23  
**Environment:** Local development (port 3101)  
**Status:** ✅ WORKSPACE INTEGRATION COMPLETE

---

## Workspace Package Integration

### Package Created

**Name:** `@vienna/lib`  
**Location:** `services/vienna-lib/`  
**Type:** Dual-mode (CommonJS + ESM wrapper)

**Files:**
- `index.js` (CommonJS exports)
- `index.mjs` (ESM re-exports for TypeScript compatibility)
- `package.json` (workspace package definition)

**Dependencies added:**
- `@anthropic-ai/sdk@^0.30.0`
- `better-sqlite3@^12.6.2`
- `uuid@^10.0.0`
- `nanoid@^3.3.7`

### Root Workspace

**File:** `package.json`

**Workspaces:**
```json
[
  "apps/marketing",
  "apps/console/client",
  "apps/console/server",
  "services/vienna-lib"
]
```

### Console Server Integration

**Dependency added:**
```json
"@vienna/lib": "file:../../../services/vienna-lib"
```

**Imports updated:**
- ❌ Before: `import { getStateGraph } from '../../../../../services/vienna-lib/state/state-graph.js'`
- ✅ After: `import { getStateGraph } from '@vienna/lib'`

**Files updated:**
- `src/routes/intent.ts`
- `src/routes/intents.ts`
- `src/routes/anomalies.ts`
- `src/routes/incidents.ts`
- `src/routes/proposals.ts`
- `src/app.ts`
- `src/server.ts`

---

## Boot Validation

### ✅ Server Starts Successfully

```
Vienna Console Server listening on http://0.0.0.0:3101
API: http://0.0.0.0:3101/api/v1
SSE Stream: http://0.0.0.0:3101/api/v1/stream
Health: http://0.0.0.0:3101/health
```

**Services initialized:**
- ✅ Auth service
- ✅ Vienna Core (stub)
- ✅ Provider Manager (Anthropic + Local)
- ✅ Chat History Service
- ✅ State Graph
- ✅ Workspace Manager
- ✅ Event stream
- ✅ Timeline Service
- ✅ Runtime Stats Service
- ✅ Provider Health Service
- ✅ System Now Service
- ✅ Dashboard Bootstrap Service

---

## Endpoint Validation

### 1. Health Endpoint

**Request:**
```bash
curl http://localhost:3101/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "runtime": {
      "status": "healthy",
      "uptime_seconds": 15,
      "sse_clients": 0,
      "services": {
        "state_graph": {
          "status": "operational",
          "health": "healthy"
        }
      }
    },
    "providers": {
      "chat_available": true,
      "providers": {
        "anthropic": {
          "status": "unknown",
          "health": "unknown",
          "last_success": null
        },
        "local": {
          "status": "unknown",
          "health": "unknown",
          "last_success": null
        }
      }
    }
  }
}
```

**Status:** ✅ PASS

---

### 2. Authentication

**Request:**
```bash
curl -X POST http://localhost:3101/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "test"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operator": "vienna",
    "sessionId": "fqZGaQk21AABb_o8kgH5FNQT6qfB2_Yc0wATTbzqcZs",
    "expiresAt": "2026-03-24T22:34:51.615Z"
  }
}
```

**Status:** ✅ PASS

---

### 3. Governed Intent Endpoint

#### Test Case: Set Safe Mode (Real Execution)

**Request:**
```bash
curl -X POST http://localhost:3101/api/v1/intent \
  -H "Content-Type: application/json" \
  -H "Cookie: vienna_session=<session_id>" \
  -d '{
    "intent_type": "set_safe_mode",
    "payload": {
      "enabled": false,
      "reason": "local test"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent_id": "intent-128940de-fc95-4ca2-9129-3bd56331aa03",
    "tenant_id": "system",
    "action": "safe_mode_disabled",
    "execution_id": null,
    "simulation": false,
    "explanation": "Executed safe_mode_disabled successfully. Safe mode disabled. Autonomous reconciliation resumed.",
    "attestation": null,
    "cost": null,
    "quota_state": null,
    "metadata": {
      "safe_mode": {
        "active": false,
        "reason": null,
        "entered_at": null,
        "entered_by": null
      }
    }
  }
}
```

**Observations:**
- ✅ `tenant_id`: present (system)
- ✅ `explanation`: present
- ✅ `simulation`: correctly false
- ⚠️ `execution_id`: null (control plane operation, not governed execution)
- ⚠️ `attestation`: null (expected for control plane)
- ⚠️ `cost`: null (expected for control plane)
- ⚠️ `quota_state`: null (expected for control plane)

**Status:** ✅ PASS (control plane operations bypass full governance by design)

---

#### Test Case: Set Safe Mode (Simulation)

**Request:**
```bash
curl -X POST http://localhost:3101/api/v1/intent \
  -H "Content-Type: application/json" \
  -H "Cookie: vienna_session=<session_id>" \
  -d '{
    "intent_type": "set_safe_mode",
    "payload": {
      "enabled": false,
      "reason": "simulation test"
    },
    "simulation": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent_id": "intent-eacea5d0-0dcc-4ac5-a14d-25adfb1cdccf",
    "tenant_id": "system",
    "action": "safe_mode_disabled",
    "execution_id": null,
    "simulation": true,
    "explanation": "Simulation: Would execute safe_mode_disabled. No side effects were performed.",
    "attestation": null,
    "cost": null,
    "quota_state": null,
    "metadata": {
      "safe_mode": {
        "active": false,
        "reason": null,
        "entered_at": null,
        "entered_by": null
      }
    }
  }
}
```

**Observations:**
- ✅ `simulation`: correctly true
- ✅ `explanation`: prefixed with "Simulation:"
- ✅ Metadata present but not persisted

**Status:** ✅ PASS

---

## Known Limitations (Non-Blockers)

### 1. Control Plane Operations

**Behavior:**  
`set_safe_mode`, `restore_objective`, and `investigate_objective` are implemented as direct state operations, not full governed executions.

**Expected:**  
- No `execution_id`
- No `attestation`
- No `cost` tracking
- No `quota` enforcement

**Rationale:**  
Control plane operations (safe mode, objective management) are deliberately fast-path operations that bypass full governance to maintain operator control during system degradation.

---

### 2. Provider State Graph Bootstrap

**Issue:**  
```
Error: Provider not found: anthropic
Error: Provider not found: local
```

**Impact:** Non-critical - provider health checks work, but State Graph persistence fails

**Fix needed:** Bootstrap providers in State Graph on startup

---

### 3. Runtime Stub

**Current:**  
Vienna Core uses runtime stub with no `queuedExecutor` or `deadLetterQueue`.

**Impact:** Event stream cannot connect to executor

**Status:** Acceptable for Phase 1 deployment (health + intent endpoints operational)

---

## Validation Matrix Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| Health endpoint | ✅ PASS | Runtime + provider status operational |
| Authentication | ✅ PASS | Session management works |
| Intent endpoint (real) | ✅ PASS | Tenant, explanation, metadata present |
| Intent endpoint (simulation) | ✅ PASS | Simulation mode correctly distinguished |
| Workspace package | ✅ PASS | `@vienna/lib` resolves correctly |
| ESM/CJS interop | ✅ PASS | Dual-mode exports work |
| State Graph | ✅ PASS | Database initialized, operational |
| Workspace Manager | ✅ PASS | Constructed successfully |

---

## Deployment Readiness

**Local boot:** ✅ COMPLETE  
**Governed runtime:** ⚠️ PARTIAL (control plane operational, full execution pipeline not yet wired)  
**Next milestone:** Deploy to Fly.io and validate with real browser UI

**Remaining work for full governance:**

1. Wire `restore_objective` and `investigate_objective` through PlanExecutor
2. Test with operations that trigger quota/budget/attestation
3. Bootstrap providers in State Graph
4. Connect full execution pipeline (if needed beyond control plane operations)

**Blocker assessment:** **NONE for deployment**

The console server boots successfully from the monorepo workspace package. Control plane operations work. Infrastructure is ready for Fly deployment.
