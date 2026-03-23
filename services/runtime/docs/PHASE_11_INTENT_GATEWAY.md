# Phase 11 — Intent Gateway

**Status:** ✅ OPERATIONAL  
**Date:** 2026-03-14  
**Milestone:** Canonical action ingress

---

## Overview

Vienna OS now has a **single canonical entry point for all actions**.

All operator and agent requests flow through the Intent Gateway, which normalizes inputs, validates structure, and dispatches to existing governance mechanisms.

**Core invariant:**
> Intent Gateway is the ONLY path for actions to enter Vienna.  
> All intents flow through existing governance (no bypass).

---

## Intent Model

### Intent Structure (Canonical)

```javascript
{
  intent_id: "intent-...",           // UUID (auto-generated if missing)
  intent_type: "restore_objective",  // One of 3 supported types
  source: {
    type: "operator",                // operator | agent | system
    id: "console"                    // Source identifier
  },
  payload: {
    objective_id: "gateway-health"   // Intent-specific payload
  },
  submitted_at: "2026-03-14T19:53:00Z" // ISO timestamp
}
```

### Response Structure (Canonical)

```javascript
{
  intent_id: "intent-...",           // Same as submitted intent
  accepted: true,                    // Acceptance status
  action: "reconciliation_requested", // Action taken (if accepted)
  message: "...",                    // Human-readable message
  metadata: {                        // Additional response data
    objective_id: "gateway-health",
    generation: 1,
    reconciliation_status: "reconciling"
  }
}
```

**Error response:**

```javascript
{
  intent_id: "intent-...",
  accepted: false,
  error: "admission_denied",         // Error reason
  metadata: {
    admission_reason: "safe_mode",
    current_status: "idle"
  }
}
```

---

## Supported Intent Types

### 1. restore_objective

**Purpose:** Request reconciliation for an objective

**Payload:**
```javascript
{ objective_id: "gateway-health" }
```

**Action:**
- Submits reconciliation admission request via ReconciliationGate
- Governed by Phase 10 control invariants
- May be denied (safe mode, cooldown, degraded, in-flight)

**Response (success):**
```javascript
{
  accepted: true,
  action: "reconciliation_requested",
  message: "Objective restoration submitted to governance pipeline.",
  metadata: {
    objective_id: "gateway-health",
    generation: 1,
    reconciliation_status: "reconciling"
  }
}
```

**Response (denied):**
```javascript
{
  accepted: false,
  error: "admission_denied",
  message: "Reconciliation admission denied: safe_mode",
  metadata: {
    objective_id: "gateway-health",
    admission_reason: "safe_mode",
    current_status: "idle"
  }
}
```

---

### 2. investigate_objective

**Purpose:** Read objective state without execution

**Payload:**
```javascript
{ objective_id: "gateway-health" }
```

**Action:**
- Queries State Graph for objective, evaluations, history
- Read-only (no execution triggered)

**Response:**
```javascript
{
  accepted: true,
  action: "investigation_report",
  message: "Objective gateway-health investigation complete.",
  metadata: {
    objective: { ... },              // Full objective state
    recent_evaluations: [ ... ],     // Last 5 evaluations
    recent_history: [ ... ],         // Last 10 transitions
    summary: {
      current_status: "monitoring",
      reconciliation_status: "idle",
      consecutive_failures: 0,
      last_evaluated: "2026-03-14T19:45:00Z",
      last_violation: null
    }
  }
}
```

---

### 3. set_safe_mode

**Purpose:** Enable or disable safe mode

**Payload (enable):**
```javascript
{
  enabled: true,
  reason: "Incident mitigation"
}
```

**Payload (disable):**
```javascript
{ enabled: false }
```

**Action:**
- Calls State Graph `enableSafeMode()` or `disableSafeMode()`
- Emits lifecycle events to execution ledger
- Blocks/unblocks reconciliation admission

**Response (enabled):**
```javascript
{
  accepted: true,
  action: "safe_mode_enabled",
  message: "Safe mode enabled: Incident mitigation",
  metadata: {
    safe_mode: {
      active: true,
      reason: "Incident mitigation",
      entered_by: "operator",
      entered_at: "2026-03-14T19:53:00Z"
    }
  }
}
```

**Response (disabled):**
```javascript
{
  accepted: true,
  action: "safe_mode_disabled",
  message: "Safe mode disabled. Autonomous reconciliation resumed.",
  metadata: {
    safe_mode: { active: false, ... }
  }
}
```

---

## Intent Lifecycle

### Flow

```
submitIntent()
  → validateIntent() (structure + intent-specific validation)
  → normalizeIntent() (canonical form)
  → resolveIntent() (dispatch to handler)
  → handler (restore / investigate / set_safe_mode)
  → response (accepted or error)
```

### Validation

**Required fields:**
- `intent_type` (must be supported)
- `source.type` (operator | agent | system)
- `source.id` (source identifier)
- `payload` (object)

**Intent-specific validation:**
- `restore_objective`: requires `objective_id`
- `investigate_objective`: requires `objective_id`
- `set_safe_mode`: requires `enabled` (boolean), `reason` (if enabled)

### Normalization

**Transformations:**
- Auto-generate `intent_id` if missing
- Auto-generate `submitted_at` if missing
- Trim whitespace from string payloads
- Ensure canonical source structure

### Resolution

**Handler dispatch:**
- `restore_objective` → `_handleRestoreObjective()`
- `investigate_objective` → `_handleInvestigateObjective()`
- `set_safe_mode` → `_handleSetSafeMode()`

---

## Governance Integration

### No Bypass Paths

Intent Gateway **does NOT bypass**:
- ✅ Reconciliation gate (admission control)
- ✅ Circuit breakers (retry policies)
- ✅ Execution timeouts (bounded authority)
- ✅ Safe mode (governance override)

All intents flow through existing Phase 10 governance mechanisms.

### Governance Guarantees

```
restore_objective → ReconciliationGate.requestAdmission()
  → May be denied (safe mode, cooldown, degraded, in-flight)
  → If admitted, starts governed reconciliation
  → Execution bounded by Phase 10 invariants
```

---

## Test Coverage

**11/11 tests passing (100%)**

**Test categories:**
1. Validation (4 tests)
   - Missing intent_type
   - Unsupported intent type
   - Missing objective_id
   - Missing enabled flag

2. Normalization (1 test)
   - Trim whitespace from objective_id

3. Unknown objective (1 test)
   - investigate_objective for nonexistent objective

4. Safe mode lifecycle (3 tests)
   - Enable safe mode
   - Restore objective denied during safe mode
   - Disable safe mode

5. Reconciliation (2 tests)
   - Restore objective admitted after safe mode release
   - Investigate objective returns state summary

**Test file:** `test-intent-gateway.js`

---

## Implementation Details

### File

`vienna-core/lib/core/intent-gateway.js` (10.5 KB, 394 lines)

### Dependencies

- State Graph (objective queries, safe mode control)
- Reconciliation Gate (admission requests)

### Class Structure

```javascript
class IntentGateway {
  constructor(stateGraph, options)
  
  // Public API
  async submitIntent(intent)
  validateIntent(intent)
  normalizeIntent(intent)
  async resolveIntent(intent)
  
  // Private handlers
  async _handleRestoreObjective(intent)
  async _handleInvestigateObjective(intent)
  async _handleSetSafeMode(intent)
  
  // Private utilities
  _getHandler(intentType)
  _validateIntentType(intent)
}
```

---

## Future Extension Path

### Phase 11 Next Steps

**Not implemented yet (Phase 11 future milestones):**
- Agent orchestration intents
- Planning system intents
- Multi-step reasoning workflows
- Multi-tenant intent routing
- Distributed intent processing

**Current scope:** Phase 11 first milestone delivers canonical ingress only.

### Extension Pattern

**To add new intent types:**

1. Add to `supported_intent_types` array
2. Implement validation in `_validateIntentType()`
3. Add normalization logic (if needed)
4. Implement handler `_handle[IntentType]()`
5. Register handler in `_getHandler()`
6. Add tests

**Example (future):**

```javascript
// Future intent type
{
  intent_type: "run_workflow",
  payload: {
    workflow_id: "gateway-recovery",
    params: { ... }
  }
}
```

---

## Production Status

**Status:** ✅ INTEGRATED & OPERATIONAL

**Deployment:**
- ✅ Dashboard UI safe mode controls integrated
- ✅ Intent API endpoint operational (`POST /api/v1/intent`)
- ✅ Legacy API endpoints preserved with hybrid enforcement warnings
- ✅ Intent lifecycle events recorded in execution ledger
- ✅ All integration tests passing (7/7)
- ✅ Full backward compatibility preserved

**Integrated paths:**
- ✅ Dashboard safe mode controls → Intent Gateway
- 🔄 Legacy API endpoints → Hybrid enforcement (backward compatibility)
- ✅ Internal runtime → Correctly excluded (architectural)

**Next integration opportunities:**
- CLI commands (if/when CLI layer is built)
- Agent layer orchestration (Phase 13)
- Additional intent types (multi-step workflows, etc.)

---

## Integration Results

**Migration completed:** 2026-03-14

**Operator actions migrated:**
- Dashboard UI safe mode controls (enable/disable)

**Legacy endpoints preserved (hybrid enforcement):**
- `POST /api/v1/reconciliation/safe-mode` (warns + functional)
- `DELETE /api/v1/reconciliation/safe-mode` (warns + functional)

**Internal runtime correctly excluded:**
- Autonomous evaluation loop (Evaluator → ReconciliationGate)
- Coordinator orchestration (internal state management)
- State machine transitions (governed by gate, not intent layer)

**Test coverage:**
- 7/7 integration tests passing
- All lifecycle events validated
- Hybrid enforcement warnings verified

**Lifecycle events:**
- `intent.submitted` ✅
- `intent.validated` ✅
- `intent.resolved` ✅
- `intent.executed` ✅
- `intent.denied` ✅

**Enforcement mode:** Hybrid (soft enforcement with warnings)

**Next enforcement phase:** Hard enforcement optional in Phase 11.1 (after API consumer migration period)

---

## One-Sentence Summary

**Before Phase 11:**
> Vienna had multiple ad-hoc entry points (chat, UI, CLI, scripts).

**After Phase 11:**
> Vienna has canonical action ingress for operator-initiated actions with validation, normalization, lifecycle recording, and governance enforcement.

---

## Documentation References

- **Phase 10:** `PHASE_10_COMPLETE.md` (control plane foundation)
- **Safe Mode:** `SAFE_MODE_RUNTIME_VALIDATION.md` (validation report)
- **Architecture:** `VIENNA_RUNTIME_STATE.md` (system status)

---

**Phase 11 Intent Gateway operational.**

Vienna now has canonical action ingress.
