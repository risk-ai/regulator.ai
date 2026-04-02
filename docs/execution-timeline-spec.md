# Execution Timeline Specification

**Version:** 1.0  
**Date:** 2026-04-02  
**Status:** Canonical — enforce on all writes

---

## 1. Execution Record Shape

```typescript
interface Execution {
  // Identity
  execution_id: string;      // REQUIRED — format: exe_{random20}
  tenant_id: string;          // REQUIRED
  
  // Governance linkage
  warrant_id: string | null;  // REQUIRED for managed, null for delegated
  proposal_id: string | null; // Optional — links back to proposal
  
  // Classification
  execution_mode: 'managed' | 'delegated';  // REQUIRED
  risk_tier: 'T0' | 'T1' | 'T2' | 'T3';   // REQUIRED
  objective: string;          // REQUIRED — human-readable description
  
  // State
  state: ExecutionState;      // REQUIRED — see state machine below
  
  // Content
  steps: ExecutionStep[];     // REQUIRED — at least one step
  timeline: TimelineEntry[];  // REQUIRED — at least one entry
  result: ExecutionResult;    // REQUIRED after terminal state
  
  // Timestamps
  created_at: ISO8601;        // REQUIRED
  updated_at: ISO8601;        // REQUIRED
  completed_at: ISO8601 | null; // REQUIRED when state is terminal
}
```

## 2. State Machine

```
planned → approved → executing → verifying → complete
                  ↘              ↘           ↗
                   → cancelled    → failed ──→ (terminal)
                   
awaiting_callback → verifying → complete
                 ↘            ↗
                  → failed ──→ (terminal)
```

### Valid Transitions

| From | To | Trigger |
|---|---|---|
| planned | approved | Warrant issued or auto-approved |
| planned | cancelled | Operator cancellation |
| approved | executing | Execution started |
| approved | cancelled | Operator cancellation |
| executing | verifying | All steps complete |
| executing | failed | Step failure |
| executing | awaiting_callback | Delegated execution sent |
| awaiting_callback | verifying | Callback received (success) |
| awaiting_callback | failed | Callback received (failure) or timeout |
| verifying | complete | Verification passed |
| verifying | failed | Verification failed |

### Terminal States
`complete`, `failed`, `cancelled`

No transitions allowed from terminal states. Any attempt returns 409.

### Intermediate Timeout
Executions in `executing` or `awaiting_callback` for > 5 minutes are flagged by invariant audit.

## 3. Step Schema

```typescript
interface ExecutionStep {
  // Identity
  step_index: number;         // REQUIRED — 0-indexed, sequential, no gaps
  step_name: string;          // REQUIRED — human-readable
  
  // Classification
  tier: 'native' | 'managed' | 'delegated';  // REQUIRED
  
  // Action
  action: {
    type: string;             // REQUIRED — e.g., 'http_request', 'notify'
    method?: string;          // For HTTP: GET/POST/PUT/PATCH/DELETE
    url?: string;             // For HTTP: target URL
    [key: string]: any;       // Additional action-specific fields
  };
  
  // Parameters (non-sensitive)
  params: Record<string, any>;  // REQUIRED (can be empty {})
  
  // Adapter reference (never the secret itself)
  adapter_id: string | null;  // UUID of adapter_configs row, null for native
  
  // Execution result
  status: 'pending' | 'executing' | 'complete' | 'failed' | 'skipped';  // REQUIRED
  started_at: ISO8601 | null;
  completed_at: ISO8601 | null;
  latency_ms: number;         // REQUIRED after completion
  
  // Result (REDACTED before persistence)
  result: {
    success: boolean;
    output: any;              // Redacted adapter response
    error?: string;           // Redacted error message
    adapter_used: 'http' | 'passthrough' | 'none';
    status_code?: number;     // For HTTP adapter
  } | null;
  
  // Dependency
  depends_on: number[];       // step_index references
}
```

## 4. Timeline Entry Schema

```typescript
interface TimelineEntry {
  state: ExecutionState;      // REQUIRED — the state being entered
  detail: string;             // REQUIRED — human-readable description
  timestamp: ISO8601;         // REQUIRED
  
  // Optional context
  actor?: string;             // Who/what triggered this transition
  step_index?: number;        // Which step this relates to
  adapter_config_id?: string; // Which adapter was used
  callback_source?: string;   // For delegated: 'external'
  error?: string;             // For failures: redacted error
}
```

### Required Timeline Entries
Every execution MUST have at minimum:
1. `planned` — when execution is created
2. One terminal state entry (`complete`, `failed`, or `cancelled`)

## 5. Event Type Taxonomy

Events logged to `execution_ledger_events`:

| Event Type | Stage | Description |
|---|---|---|
| `state:planned` | plan | Execution created |
| `state:approved` | plan | Warrant issued |
| `state:executing` | execute | Execution started |
| `state:verifying` | verify | Steps complete, verifying |
| `state:complete` | verify | Execution verified complete |
| `state:failed` | execute/verify | Execution or verification failed |
| `state:cancelled` | plan | Operator cancelled |
| `adapter:request` | execute | HTTP adapter sent request |
| `adapter:response` | execute | HTTP adapter received response |
| `adapter:timeout` | execute | HTTP adapter timed out |
| `adapter:retry` | execute | HTTP adapter retrying |
| `gate:blocked` | plan | Policy blocked execution |
| `gate:approval_required` | plan | Waiting for operator approval |
| `callback:received` | execute | Delegated callback received |
| `callback:rejected` | execute | Callback rejected (replay/invalid) |
| `error:step` | execute | Step-level error |
| `error:adapter` | execute | Adapter-level error |
| `error:verification` | verify | Verification failed |

## 6. Result Schema

```typescript
interface ExecutionResult {
  state: ExecutionState;              // Final state
  execution_id: string;
  results: StepResultSummary[];       // Per-step summary
  callback_received?: ISO8601;        // For delegated
  callback_status?: 'success' | 'failure';
  verification_passed?: boolean;
  total_latency_ms: number;
  error?: string;                     // Redacted
}

interface StepResultSummary {
  step_index: number;
  status: string;
  latency_ms: number;
  adapter_used: string;
  status_code?: number;               // For HTTP
}
```

## 7. Ordering Guarantees

1. Timeline entries are ordered by timestamp (ascending)
2. Steps execute in `step_index` order (0, 1, 2, ...)
3. A step with `depends_on: [0]` does not start until step 0 is complete
4. Ledger events have a `sequence_num` that is monotonically increasing per execution
5. If two events have the same timestamp, `sequence_num` determines order

## 8. Redaction Rules (Reference)

Before ANY persistence write, all data passes through `redactSecrets()`:
- Sensitive keys (authorization, token, secret, password, api_key, etc.) → `[REDACTED:key_name]`
- Known credential values → `[REDACTED:credential:<config_id>]`
- Bearer/Basic token patterns → `[REDACTED:value]`

See `services/secretRedaction.ts` for full implementation.

## 9. Validation Function

```typescript
function validateExecution(execution: Execution): ValidationResult {
  const errors: string[] = [];
  
  if (!execution.execution_id?.startsWith('exe_')) errors.push('Invalid execution_id format');
  if (!execution.tenant_id) errors.push('Missing tenant_id');
  if (!execution.state) errors.push('Missing state');
  if (!VALID_STATES.includes(execution.state)) errors.push(`Invalid state: ${execution.state}`);
  if (!execution.steps?.length) errors.push('No steps');
  if (!execution.timeline?.length) errors.push('No timeline entries');
  
  // Validate step ordering
  execution.steps.forEach((step, i) => {
    if (step.step_index !== i) errors.push(`Step ${i} has wrong step_index: ${step.step_index}`);
  });
  
  // Validate timeline ordering
  for (let i = 1; i < execution.timeline.length; i++) {
    if (new Date(execution.timeline[i].timestamp) < new Date(execution.timeline[i-1].timestamp)) {
      errors.push(`Timeline entry ${i} is out of order`);
    }
  }
  
  // Terminal state checks
  if (TERMINAL_STATES.includes(execution.state) && !execution.completed_at) {
    errors.push('Terminal state without completed_at');
  }
  
  return { valid: errors.length === 0, errors };
}
```

This function MUST be called before every INSERT/UPDATE to execution_log.
