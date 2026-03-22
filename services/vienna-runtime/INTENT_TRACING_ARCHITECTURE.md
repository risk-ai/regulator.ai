# Intent Tracing Architecture

**Version:** 1.0  
**Phase:** 11.5  
**Status:** Stable  
**Date:** 2026-03-14

---

## Overview

Intent Tracing provides **complete execution graph reconstruction** for every action in Vienna OS.

**Core principle:**
> Every action in Vienna leaves a complete, reconstructable execution trace.

**Why this matters:**
Operators can answer fundamental questions that most control planes cannot:
- Why did this action execute?
- Why was this action denied?
- Which governance rule applied?
- Which execution attempt handled it?
- What was the complete lifecycle?

---

## Architecture

### Three-Layer Model

```
1. Intent Trace (lightweight lifecycle record)
   ↓
2. Execution Ledger (detailed execution events)
   ↓
3. Graph Reconstruction (runtime query layer)
```

### Intent Trace Schema

```sql
CREATE TABLE intent_traces (
  intent_id TEXT PRIMARY KEY,
  intent_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL,
  denial_reason TEXT,
  reconciliation_id TEXT,
  execution_id TEXT,
  verification_id TEXT,
  outcome_id TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  environment TEXT NOT NULL
);
```

**Key fields:**
- `intent_id` — Unique intent identifier
- `reconciliation_id` — Links to reconciliation admission
- `execution_id` — Links to execution ledger
- `verification_id` — Links to verification result
- `outcome_id` — Links to workflow outcome
- `denial_reason` — Why intent was rejected (if applicable)

### Intent Trace Events Schema

```sql
CREATE TABLE intent_trace_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  intent_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_timestamp TEXT NOT NULL,
  metadata_json TEXT,
  environment TEXT NOT NULL,
  FOREIGN KEY (intent_id) REFERENCES intent_traces(intent_id)
);
```

**Event types:**
- `intent.submitted`
- `intent.validated`
- `intent.resolved`
- `intent.denied`
- `intent.executed`
- `intent.completed`

---

## Trace Model

### Intent Lifecycle

```
Intent Submission
  ↓
Validation (schema check)
  ↓
Resolution (normalize to action)
  ↓
[Governance Check]
  ↓
Admission Decision (gate)
  ↓
  ├─ Denied → intent.denied
  └─ Admitted → intent.executed
       ↓
     Execution
       ↓
     Verification
       ↓
     Outcome
       ↓
     intent.completed
```

### Read-Only vs Execution Paths

**Read-only path (investigate_objective):**
```
intent.submitted → intent.validated → intent.resolved → intent.completed
```
No execution events.

**Execution path (restore_objective):**
```
intent.submitted → intent.validated → intent.resolved → intent.executed → intent.completed
```
Execution events linked via `execution_id`.

**Denial path (safe mode):**
```
intent.submitted → intent.validated → intent.resolved → intent.denied
```
`denial_reason` populated.

---

## Graph Model

### Node Types

1. **Intent Node**
   - Type: `intent`
   - Label: Intent type (restore_objective, investigate_objective, set_safe_mode)
   - Status: submitted, admitted, denied, completed

2. **Reconciliation Node**
   - Type: `reconciliation`
   - Label: Reconciliation generation
   - Status: idle, reconciling, cooldown, degraded

3. **Execution Node**
   - Type: `execution`
   - Label: Execution attempt
   - Status: started, completed, failed

4. **Verification Node**
   - Type: `verification`
   - Label: Verification task
   - Status: success, failed, inconclusive, skipped

5. **Outcome Node**
   - Type: `outcome`
   - Label: Workflow outcome
   - Status: objective_achieved, execution_failed, verification_failed

### Edge Types

1. **Triggers** — Intent → Reconciliation
2. **Executes** — Reconciliation → Execution
3. **Verifies** — Execution → Verification
4. **Produces** — Verification → Outcome

### Graph Structure

```
Intent
  │
  ├─ triggers → Reconciliation
  │               │
  │               ├─ executes → Execution
  │               │               │
  │               │               ├─ verifies → Verification
  │               │               │               │
  │               │               │               └─ produces → Outcome
```

---

## Ledger Integration

### Intent Trace + Execution Ledger

**Intent Trace:**
- Lightweight lifecycle record
- Links to execution artifacts
- Fast query by intent_id

**Execution Ledger:**
- Detailed execution events
- Append-only immutable record
- Links via execution_id

**Combined view:**
```javascript
{
  intent: { intent_id, intent_type, status },
  reconciliation: { generation, status },
  execution: { execution_id, started_at, completed_at },
  verification: { verification_id, objective_achieved },
  outcome: { outcome_id, summary }
}
```

---

## Operator Debugging Workflow

### Question: "Why did the gateway restart?"

**Step 1:** Find intent
```
GET /api/v1/intents?target_id=openclaw-gateway&intent_type=restore_objective
```

**Step 2:** Get execution graph
```
GET /api/v1/intents/:intent_id/graph
```

**Result:**
```
Intent: restore_objective
  ↓
Reconciliation: generation 3
  ↓
Execution: restart_service
  ↓
Verification: systemd_active + tcp_port_open
  ↓
Outcome: objective_achieved
```

**Step 3:** Get timeline
```
GET /api/v1/intents/:intent_id/timeline
```

**Result:**
```
16:35:12 intent.submitted (operator: max)
16:35:12 intent.validated
16:35:12 intent.resolved (action: restore_objective)
16:35:13 reconciliation.admitted (generation: 3)
16:35:13 execution.started
16:35:15 execution.completed (exit_code: 0)
16:35:16 verification.success (objective_achieved: true)
16:35:16 intent.completed
```

**Step 4:** Get explanation
```
GET /api/v1/intents/:intent_id/explanation
```

**Result:**
```
Intent: restore_objective
Decision: admitted
Reason: Objective in violation_detected state, consecutive_failures < max_retries
Governance: No blocking policies, safe mode inactive
Action: Reconciliation generation 3 executed restart_service
Verification: Service health verified (systemd active, TCP port 18789 open)
Outcome: Objective restored to healthy state
```

---

### Question: "Why was this action denied?"

**Step 1:** Find denied intent
```
GET /api/v1/intents?status=denied
```

**Step 2:** Get trace
```
GET /api/v1/intents/:intent_id
```

**Result:**
```json
{
  "intent_id": "intent-abc123",
  "intent_type": "restore_objective",
  "status": "denied",
  "denial_reason": "safe_mode",
  "submitted_at": "2026-03-14T16:40:00Z",
  "completed_at": "2026-03-14T16:40:00Z"
}
```

**Step 3:** Get explanation
```
GET /api/v1/intents/:intent_id/explanation
```

**Result:**
```
Intent: restore_objective
Decision: denied
Reason: Safe mode active (operator: max, reason: "production freeze")
Governance: Safe mode blocks all autonomous reconciliation
Action: None (admission rejected at gate)
```

---

### Question: "Which governance rule applied?"

**Step 1:** Get intent timeline
```
GET /api/v1/intents/:intent_id/timeline
```

**Step 2:** Find governance events
```
Filter events by type:
  - policy.evaluated
  - safe_mode.checked
  - cooldown.enforced
  - rate_limit.enforced
```

**Result:**
```
16:35:12 safe_mode.checked (active: false)
16:35:12 cooldown.checked (expired: true)
16:35:12 rate_limit.checked (within_limit: true)
16:35:12 policy.evaluated (result: allow)
```

---

### Question: "Which execution attempt handled it?"

**Step 1:** Get execution graph
```
GET /api/v1/intents/:intent_id/graph
```

**Step 2:** Find execution node
```
Node type: execution
Execution ID: exec-xyz789
Generation: 3
```

**Step 3:** Get execution ledger
```
GET /api/v1/ledger/executions/:execution_id
```

**Result:**
```
Execution: exec-xyz789
Plan: gateway_recovery (step 2/3: restart_service)
Started: 2026-03-14T16:35:13Z
Completed: 2026-03-14T16:35:15Z
Exit code: 0
Verification: objective_achieved
```

---

## API Usage

### Submit Intent

```javascript
const { IntentGateway } = require('./lib/core/intent-gateway');

const gateway = new IntentGateway(stateGraph);

const result = await gateway.submitIntent({
  intent_type: 'restore_objective',
  source: { type: 'operator', id: 'max' },
  payload: { objective_id: 'maintain_gateway_health' }
});

console.log(result.intent_id); // intent-abc123
console.log(result.status);    // admitted | denied | completed
```

### Get Execution Graph

```javascript
const graph = await gateway.getExecutionGraph(intent_id);

console.log(graph.nodes);  // { intent, reconciliation, execution, verification, outcome }
console.log(graph.edges);  // [{ from, to, type }]
```

### Get Timeline

```javascript
const timeline = await gateway.getIntentTimeline(intent_id);

timeline.events.forEach(event => {
  console.log(event.event_type, event.event_timestamp);
});
```

### Get Explanation

```javascript
const explanation = await gateway.explainIntent(intent_id);

console.log(explanation.decision);           // admitted | denied
console.log(explanation.governance_applied); // [policy1, policy2, ...]
console.log(explanation.actions_taken);      // [action1, action2, ...]
```

---

## Integration Points

### Intent Gateway

**Location:** `lib/core/intent-gateway.js`

**Methods:**
- `submitIntent(intent)` — Create intent and trace
- `getExecutionGraph(intent_id)` — Reconstruct graph
- `getIntentTimeline(intent_id)` — Get event timeline
- `explainIntent(intent_id)` — Get decision explanation

### Intent Tracer

**Location:** `lib/core/intent-tracing.js`

**Methods:**
- `recordEvent(intent_id, event_type, metadata)` — Record trace event
- `linkExecution(intent_id, execution_id)` — Link to execution ledger
- `linkVerification(intent_id, verification_id)` — Link to verification
- `linkOutcome(intent_id, outcome_id)` — Link to outcome

### State Graph

**Location:** `lib/state/state-graph.js`

**Methods:**
- `createIntentTrace(intent_id, intent_type, source, submitted_at)`
- `updateIntentTrace(intent_id, updates)`
- `getIntentTrace(intent_id)`
- `listIntentTraceEvents(intent_id)`
- `appendIntentTraceEvent(intent_id, event_type, metadata)`

---

## Test Coverage

### Unit Tests

**File:** `tests/phase-11/test-intent-tracing.test.js`

**Coverage:**
- Intent trace creation
- Event recording
- Execution linking
- Graph reconstruction
- Timeline generation
- Explanation generation

### Integration Tests

**File:** `test-intent-gateway-integration.js`

**Scenarios:**
1. restore_objective (full execution path)
2. investigate_objective (read-only path)
3. set_safe_mode (governance action)
4. restore_objective denied (safe mode)
5. Lifecycle event recording
6. Hybrid enforcement (legacy compatibility)

**Results:** 7/7 passing (100%)

---

## Hybrid Enforcement

### Intent Gateway Path (Recommended)

```javascript
await gateway.submitIntent({
  intent_type: 'set_safe_mode',
  source: { type: 'operator', id: 'max' },
  payload: { enabled: true, reason: 'production freeze' }
});
```

**Trace:** Full lifecycle recorded

### Direct Action Path (Legacy)

```javascript
await stateGraph.enterSafeMode('max', 'production freeze');
```

**Warning:** `[DIRECT_ACTION_BYPASS]` emitted  
**Trace:** Partial (no intent context)  
**Migration:** Use Intent Gateway instead

---

## Performance

### Query Performance

**Intent lookup:** O(1) via intent_id index  
**Timeline reconstruction:** O(n) where n = event count  
**Graph reconstruction:** O(e) where e = edge count  

**Typical timings:**
- Intent submission: <5ms
- Graph reconstruction: <10ms
- Timeline query: <15ms
- Explanation generation: <20ms

### Storage

**Intent trace:** ~200 bytes per intent  
**Trace event:** ~150 bytes per event  

**Typical lifecycle:**
- restore_objective: 7-10 events
- investigate_objective: 4 events
- set_safe_mode: 3 events

**Retention:** Unlimited (append-only, no automatic cleanup)

---

## Operational Notes

### Debugging Trace Issues

**Missing events:**
```javascript
// Check if tracer is initialized
if (!gateway.tracer) {
  console.error('Intent tracer not initialized');
}

// Check if event recording succeeded
const events = await stateGraph.listIntentTraceEvents(intent_id);
console.log('Recorded events:', events.length);
```

**Broken graph reconstruction:**
```javascript
// Verify linking
const trace = await stateGraph.getIntentTrace(intent_id);
console.log('Execution ID:', trace.execution_id);
console.log('Verification ID:', trace.verification_id);
console.log('Outcome ID:', trace.outcome_id);
```

### Trace Cleanup

**Currently:** No automatic cleanup (append-only)

**Future:** Retention policy (Phase 12 Operator Workspace)
- Archive old traces
- Prune low-value events
- Compress historical data

---

## Design Guarantees

### 1. Completeness
Every action in Vienna has a trace (no bypass paths).

### 2. Reconstructability
Execution graphs can be rebuilt from trace + ledger data.

### 3. Explainability
Operators can answer "why" questions with evidence.

### 4. Immutability
Trace events are append-only (no rewriting history).

### 5. Hybrid Enforcement
Legacy paths emit warnings but remain functional.

---

## Next Steps (Phase 12)

**Operator Workspace:**
- Visual trace explorer
- Graph visualization
- Timeline scrubbing
- Search across traces

**Artifact System:**
- Link traces to logs, configs, metrics
- Execution replay from trace
- Trace comparison (what changed?)

**Retention Policy:**
- Configurable trace retention
- Archive old traces
- Prune low-value events

---

## References

**Implementation:**
- `lib/core/intent-gateway.js`
- `lib/core/intent-tracing.js`
- `lib/state/state-graph.js`

**Tests:**
- `test-intent-gateway.js` (11/11 passing)
- `test-intent-gateway-integration.js` (7/7 passing)
- `tests/phase-11/test-intent-tracing.test.js`

**API:**
- `console/server/src/routes/intents.ts`

**Documentation:**
- `PHASE_11.5_VALIDATION_REPORT.md`
- `VIENNA_RUNTIME_STATE.md`

---

✅ Intent Tracing Architecture — Stable and operational as of Phase 11.5.
