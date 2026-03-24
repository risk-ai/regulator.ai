# Intent Submission Guide

**Status:** Operational  
**Deployment:** Production (2026-03-23)

---

## Overview

Vienna OS now has a **structured Intent Submission UI** for governed execution, distinct from the conversational chat interface.

**Two execution paths:**

1. **Conversational path** (Chat) — Ollama/LLM-assisted guidance, help, interpretation
2. **Governed execution path** (Intent) — Structured intents through Intent Gateway

---

## Access

**Console:** `https://console.regulator.ai`

**Navigation:** Main nav → **Intent** tab

---

## Intent Submission UI

### Location

`apps/console/client/src/pages/IntentPage.tsx`

### Features

- **Intent type selection** (dropdown)
- **JSON payload editor** (textarea with syntax validation)
- **Quick-load test cases** (for validation)
- **Simulation mode toggle** (dry run)
- **Structured result display** (tenant, explanation, attestation, cost, quota)

### Supported Intent Types

1. `test_execution` — Run test execution for validation (5 validation cases)
2. `restore_objective` — Restore a failed objective
3. `investigate_objective` — Investigate objective state
4. `set_safe_mode` — Enable/disable safe mode

### Test Payloads (Quick Load)

```json
// Success
{"mode": "success", "description": "Successful execution"}

// Simulation
{"mode": "simulation", "description": "Dry run mode"}

// Quota Block
{"mode": "quota_block", "description": "Quota exhaustion"}

// Budget Block
{"mode": "budget_block", "description": "Budget limit exceeded"}

// Failure
{"mode": "failure", "description": "Execution failure"}
```

---

## Backend Path

**Endpoint:** `POST /api/v1/intent`

**Route:** `apps/console/server/src/routes/intent.ts`

**Handler:** `IntentGateway.submitIntent(intent, context)`

**Request schema:**

```json
{
  "intent_type": "test_execution",
  "payload": { "mode": "success" },
  "simulation": false  // optional
}
```

**Response schema (success):**

```json
{
  "success": true,
  "data": {
    "intent_id": "uuid",
    "tenant_id": "system",
    "action": "test_execution",
    "execution_id": "uuid",
    "simulation": false,
    "explanation": "Test execution completed successfully",
    "attestation": {
      "attestation_id": "uuid",
      "status": "success",
      "attested_at": "2026-03-23T19:00:00.000Z"
    },
    "cost": {
      "total_cost": 0.0105,
      "input_tokens": 1000,
      "output_tokens": 500
    },
    "quota_state": {
      "available": 95.5,
      "utilization": 0.045
    },
    "metadata": {}
  },
  "timestamp": "2026-03-23T19:00:00.000Z"
}
```

**Response schema (failure):**

```json
{
  "success": false,
  "error": "Quota exceeded",
  "code": "QUOTA_EXCEEDED",
  "data": {
    "intent_id": "uuid",
    "tenant_id": "system",
    "explanation": "Tenant quota exhausted (100% utilization)",
    "quota_state": {
      "available": -5.0,
      "utilization": 1.05
    },
    "cost": null,
    "metadata": {}
  },
  "timestamp": "2026-03-23T19:00:00.000Z"
}
```

---

## Agent Connectivity

### Goal

External agents submit commands through the same governed boundary.

### Required Design

**Endpoint:** `POST /api/v1/intent`

**Authentication:** Session-based (same as operator console)

**Tenant attribution:** Extracted from `req.session.tenant_id` (defaults to `"system"`)

**Operator source:** Extracted from `req.session.operator.id` (defaults to `"console"`)

### Governance Applied

All agent submissions pass through:

1. **Intent Gateway** (canonical entry point)
2. **Quota enforcement** (tenant-level)
3. **Cost tracking** (execution accounting)
4. **Policy evaluation** (constraint validation)
5. **Attestation generation** (verifiable records)
6. **Audit trail** (immutable ledger)

### Agent Request Format

```json
{
  "intent_type": "restore_objective",
  "payload": {
    "objective_id": "obj_12345",
    "strategy": "retry",
    "max_attempts": 3
  },
  "simulation": false
}
```

### Authentication Model

**Current:** Session-based (cookies)

**Future (if needed):** API key or token-based auth for non-browser agents

**Constraint:** Agents MUST NOT bypass Intent Gateway. No direct executor access.

---

## Validation Readiness

### 5 Test Cases

The Intent UI supports all 5 validation cases:

1. ✅ **Success** — `{"mode": "success"}`
2. ✅ **Simulation** — `{"mode": "simulation"}` or simulation toggle
3. ✅ **Quota Block** — `{"mode": "quota_block"}`
4. ✅ **Budget Block** — `{"mode": "budget_block"}`
5. ✅ **Failure** — `{"mode": "failure"}`

### Execution Path

```
User → Intent UI → POST /api/v1/intent
  → IntentGateway.submitIntent()
    → Policy evaluation
    → Quota check (Phase 22)
    → Budget check (Phase 29)
    → Execution (if approved)
    → Verification (Phase 8.2)
    → Attestation (Phase 23)
    → Ledger (Phase 8.3)
  → Response → Intent UI result panel
```

### Result Display

The UI shows:

- ✅ **Tenant ID** (attribution)
- ✅ **Explanation** (human-readable outcome)
- ✅ **Simulation state** (dry run flag)
- ✅ **Cost** (tokens + total cost)
- ✅ **Attestation** (execution record)
- ✅ **Quota state** (available units + utilization %)
- ✅ **Blocked/error reason** (if applicable)

---

## Architecture Separation

### Conversational Chat (Existing)

**Path:** `POST /api/v1/chat/message` → `ViennaRuntimeService.processChatMessage()`

**Purpose:**
- Operator help
- Natural language interpretation
- Guidance and support
- Future: NL-to-intent conversion (not implemented yet)

**Model:** Ollama/LLM-assisted

**Execution:** None (conversational only, may propose commands)

### Governed Execution (New)

**Path:** `POST /api/v1/intent` → `IntentGateway.submitIntent()`

**Purpose:**
- Structured intent submission
- Governed execution
- Validation and testing
- Agent connectivity

**Model:** Deterministic (schema-driven)

**Execution:** Full governance pipeline (quota, policy, attestation, ledger)

---

## Key Constraints

### 1. No Chat-to-Intent Bypass

The chat interface does NOT automatically convert messages into intents.

**Why:** Governance must be explicit, testable, and auditable.

**Future:** Chat may propose intents, but operator must explicitly submit through Intent UI or approve proposed actions.

### 2. Intent Gateway is Mandatory

All execution (operator or agent) MUST route through Intent Gateway.

**No bypass paths:**
- ❌ Direct executor calls
- ❌ Direct adapter access
- ❌ Direct State Graph writes (for governed actions)

**Enforcement:** Architectural (executor requires warrant, warrant requires Intent Gateway admission)

### 3. Agent Requests = Operator Requests

Agents submit the same structured intents as operators.

**No special agent path.**

**Same governance:**
- Quota enforcement
- Policy evaluation
- Cost tracking
- Attestation generation
- Audit trail

---

## Next Steps

### For Validation (Immediate)

1. Open `https://console.regulator.ai`
2. Log in with operator password
3. Navigate to **Intent** tab
4. Submit 5 test cases (success, simulation, quota block, budget block, failure)
5. Verify result display for each case
6. Submit validation results to `POST /api/v1/validation/log`

### For Agent Integration (Future)

1. Define agent authentication model (API keys or token-based)
2. Document agent connection pattern
3. Provide agent SDK or reference implementation
4. Test agent → Intent Gateway → governed execution flow
5. Validate quota/policy/cost enforcement for agent requests

### For Phase 28 Validation (After Intent Tests)

1. Verify persistence (tenant, cost, attestation, quota/budget denial)
2. Validate one real Phase 28 path (end-to-end governed execution)
3. Lock final phase classification and remove dead paths

---

## Files Changed

### Frontend

- `apps/console/client/src/pages/IntentPage.tsx` — Intent submission UI (new)
- `apps/console/client/src/api/intent.ts` — Intent API client (new)
- `apps/console/client/src/App.tsx` — Added Intent route
- `apps/console/client/src/components/layout/MainNav.tsx` — Added Intent nav item

### Backend

- `apps/console/server/src/routes/intent.ts` — Intent Gateway route (already exists, unchanged)
- `apps/console/server/fly.Dockerfile` — Fixed monorepo paths for deployment

### Deployment

- Console frontend rebuilt (2026-03-23)
- Console server deployed to `vienna-os.fly.dev` (2026-03-23)
- Console accessible at `console.regulator.ai`

---

## Summary

✅ **Intent Submission UI** — Operational  
✅ **Backend path** — Intent Gateway (`POST /api/v1/intent`)  
✅ **Validation readiness** — 5 test cases supported  
✅ **Agent connectivity** — Same endpoint, same governance  
✅ **Architecture separation** — Chat (guidance) vs Intent (execution) distinct  

**Rule enforced:** Governed execution must remain explicit and testable. Chat can help operators, but execution goes through Intent Gateway.
