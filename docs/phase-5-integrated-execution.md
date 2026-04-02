# Phase 5: Integrated Execution Pipeline

**Status:** Implementation  
**Authors:** Aiden (COO) + Vienna (Technical Lead)  
**Date:** 2026-04-02  
**Scope:** Connect governance pipeline to execution engine, persist everything, make it visible and reliable

---

## Overview

Phase 4A built the execution primitives: credential vault, HTTP adapter, callback receiver, adapter resolver. Phase 5 connects them into a single coherent pipeline that an operator can use end-to-end.

**Goal:** Intent → policy → warrant → execute (real HTTP) → verify → persist → visible in UI → auditable → hardened.

## Non-Goals

- New adapter types (only HTTP)
- Multi-region execution
- Custom workflow DSL
- Advanced scheduling/orchestration

---

## 5.1 — Intent-to-Execution Bridge (Aiden)

### Problem
The intent pipeline creates proposals and warrants. The execution engine runs steps. They don't talk to each other.

### Solution
When a warrant is issued for an action that has execution steps configured, auto-trigger managed execution.

#### Flow
```
POST /api/v1/agent/intent
  → policy evaluation
  → proposal created
  → warrant issued (if approved)
  → execution triggered automatically
  → steps executed via adapter resolver
  → results persisted to execution_log + execution_steps
  → timeline updated
  → verification
  → complete/failed
```

#### Implementation
In `console-proxy/api/server.js`, after warrant issuance (line ~1020), add:

```javascript
// After warrant is issued and not simulation:
if (warrant && !simulation) {
  // Check if action has registered execution steps
  const actionConfig = await query(
    'SELECT * FROM regulator.action_types WHERE action_type = $1',
    [action]
  );
  
  if (actionConfig[0]?.execution_config) {
    const execConfig = actionConfig[0].execution_config;
    // Trigger managed execution
    const executionId = `exe_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    
    // Write to execution_log
    await query(
      `INSERT INTO regulator.execution_log 
       (execution_id, tenant_id, warrant_id, execution_mode, state, risk_tier, objective, steps, timeline, created_at, updated_at)
       VALUES ($1, $2, $3, 'managed', 'planned', $4, $5, $6, $7, NOW(), NOW())`,
      [executionId, tenantId, warrant.id, riskTier, action, 
       JSON.stringify(execConfig.steps), 
       JSON.stringify([{ state: 'planned', detail: 'Execution created from intent', timestamp: new Date().toISOString() }])]
    );
    
    // Execute steps...
  }
}
```

#### Schema Addition
Add `execution_config` JSONB column to `action_types` table:
```sql
ALTER TABLE regulator.action_types ADD COLUMN IF NOT EXISTS execution_config JSONB;
```

This stores the step template for each action type:
```json
{
  "steps": [
    {
      "step_name": "Call external API",
      "tier": "managed",
      "action": { "type": "http_request", "method": "POST", "url": "{{endpoint_url}}" },
      "adapter_alias": "my-api-adapter"
    }
  ]
}
```

---

## 5.2 — Execution Lifecycle Persistence (Aiden)

### Problem
`/executions/run` returns results but doesn't persist to any table. Execution tracking tables are unused.

### Solution
Every managed execution writes the full lifecycle:

1. **execution_log** — main record with state, timeline, result
2. **execution_steps** — per-step detail with adapter info, latency, redacted result
3. **execution_ledger_events** — event stream for every state transition
4. **audit_log** — governance audit entry

#### Persistence Points
| Moment | Table | Event |
|---|---|---|
| Execution created | execution_log (state=planned) | execution.created |
| Execution approved | execution_log (state=approved) | execution.approved |
| Step started | execution_steps (status=executing) | step.started |
| Step completed | execution_steps (status=complete) | step.completed |
| Step failed | execution_steps (status=failed) | step.failed |
| Execution verifying | execution_log (state=verifying) | execution.verifying |
| Execution complete | execution_log (state=complete) | execution.complete |
| Execution failed | execution_log (state=failed) | execution.failed |

All results are redacted before persistence.

---

## 5.3 — Console-Proxy Parity (Aiden)

### Problem
Console-proxy (Vercel-deployed) is missing execution routes that exist in app.ts.

### Solution
Add to console-proxy/api/server.js:
- `/api/v1/executions/run` — managed execution with full persistence
- `/api/v1/webhooks/execution-callback` — callback receiver
- `/api/v1/executions` — list executions
- `/api/v1/executions/:id` — execution detail with timeline

These use the same credential resolution and redaction logic, inlined for serverless.

---

## 5.4 — Execution Monitoring UI (Vienna)

### Problem
Operators can't see execution status in the console.

### Solution
Add/update console pages:

#### Executions List Page
- Table: execution_id, objective, state, risk_tier, adapter, latency, timestamp
- Color-coded state badges (planned=gray, executing=blue, complete=green, failed=red)
- Filter by state, risk tier, date range
- Click → detail view

#### Execution Detail Page
- Header: execution_id, state, objective, warrant reference
- Timeline: vertical list of all state transitions with timestamps
- Steps: expandable cards showing adapter_config name, method, URL, status code, latency
- Result panel: redacted response body
- Audit trail: all related audit_log entries

#### Intent Page Enhancement
- After successful intent submission with warrant, show execution status inline
- Real-time update via polling (every 2s while executing)
- Show "Execution Complete" with link to detail page

Design: dark theme, consistent with existing console. Use existing `var(--*)` CSS variables.

---

## 5.5 — Retry + Timeout Policy (Vienna)

### Schema
Add to `adapter_configs`:
```sql
ALTER TABLE regulator.adapter_configs ADD COLUMN IF NOT EXISTS retry_config JSONB DEFAULT '{"max_retries": 0, "backoff_base_ms": 1000, "backoff_max_ms": 30000}';
```

### Behavior
- `max_retries: 0` = no retries (current behavior)
- `max_retries: 1-3` = retry with exponential backoff + jitter
- Each retry logged as a separate timeline entry
- After exhausting retries, step goes to dead letter queue if configured
- Execution-level timeout: if total elapsed > configured max, abort remaining steps

### Implementation
In `http-adapter.ts`, wrap the fetch call:
```typescript
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    const result = await fetch(...);
    if (expectedStatus.includes(result.status)) return result;
    if (attempt < maxRetries) await backoff(attempt);
  } catch (err) {
    if (attempt < maxRetries) await backoff(attempt);
    else throw err;
  }
}
```

---

## 5.6 — Invariant Audit Script (Vienna)

File: `scripts/audit-invariants.js`

Checks:
1. Every execution_log row has exactly one terminal state or is in a valid intermediate state
2. No illegal state transitions (e.g., complete → executing)
3. No executions stuck in intermediate states > 5 minutes old
4. Step ordering consistency (step_index sequential, no gaps)
5. Every execution with steps has corresponding execution_steps rows
6. No plaintext secrets in any execution_log.result, steps, or timeline field

Output: PASS/FAIL + list of violations.

Run: `node scripts/audit-invariants.js` — exit code 0 = pass, 1 = fail.

---

## 5.7 — Execution Timeline Spec (Aiden)

File: `docs/execution-timeline-spec.md`

Defines:
- Canonical shape of execution record
- Required fields on every execution
- Step schema with all fields
- Event type taxonomy
- State machine with valid transitions
- Ordering guarantees

Enforced by validation function called before every persistence write.

---

## 5.8 — Attack Hardening (Vienna)

Add test coverage + handling for:

1. **Concurrent execution** — execution lock: `SELECT ... FOR UPDATE` on execution_log row before state mutation
2. **Callback after completion** — already handled (409), add load test
3. **Duplicate callback bursts** — add rate limiting per execution_id (max 1 callback/second)
4. **Approve spam** — idempotent approval (second approve returns same warrant)
5. **Malformed webhooks** — JSON schema validation on callback payload
6. **Credential timing attack** — constant-time comparison for HMAC signatures

---

## Work Assignment

### Aiden (Implementation Order)
1. ✅ Phase 5 design doc (this file)
2. 5.7 — Execution timeline spec
3. 5.1 — Intent-to-execution bridge
4. 5.2 — Execution lifecycle persistence
5. 5.3 — Console-proxy parity (execution + callback routes)
6. Review Vienna's UI + hardening work

### Vienna (Implementation Order)
1. 5.6 — Invariant audit script
2. 5.4 — Execution monitoring UI (list + detail + intent page enhancement)
3. 5.5 — Retry + timeout policy
4. 5.8 — Attack hardening + tests
5. Review Aiden's bridge + persistence work

### Sync Points
- After 5.1 + 5.2: Aiden notifies Vienna → Vienna tests UI against real execution data
- After 5.4: Vienna notifies Aiden → Aiden reviews UI for data correctness
- After 5.6: Vienna runs audit → both review results
- Final: Both run full demo flows + audit, confirm Definition of Done

---

## Definition of Done

All of these must be true:

1. Operator submits intent → full pipeline executes → result visible in UI
2. All execution data persists to execution_log, execution_steps, execution_ledger_events
3. Timeline spec enforced — no loose fields, no missing events
4. Invariant audit passes clean on production data
5. No secrets in any persisted surface (verified by audit script)
6. Retry policy works (configurable per adapter)
7. All adversarial patterns rejected cleanly
8. Execution detail page shows complete story in <5 seconds
9. Console-proxy has full parity with app.ts execution routes
10. Demo flows work against real endpoints (not mocks)
