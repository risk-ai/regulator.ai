# Phase 17 — Approval Workflow Planning

**Status:** Planning Phase  
**Created:** 2026-03-19  
**Goal:** Make approval a hard execution precondition for T1/T2 actions

---

## Executive Summary

Phase 17 implements approval as a **hard governance gate** in Vienna's execution pipeline, not a UI-only concept.

**Core principle:**
> Approval is a prerequisite for execution, enforced architecturally. Expired or missing approvals fail closed.

**Scope:**
- T0: No approval required
- T1: Operator approval required
- T2: Elevated approval required (operator + additional validation)

**Integration point:**
```
locks → reconciliation → policy → approval → warrant → execution → verification → release
```

---

## 1. Approval Object Schema

### ApprovalRequest

```javascript
{
  // Identity
  approval_id: string,           // UUID, primary key
  execution_id: string,          // Links to execution ledger
  plan_id: string,               // Links to plan
  step_id: string,               // Which step requires approval
  intent_id: string,             // Original intent
  
  // Approval requirement
  required_tier: string,         // 'T1' | 'T2'
  required_by: string,           // Role/authority level
  
  // State
  status: string,                // ApprovalStatus enum
  
  // Request metadata
  requested_at: string,          // ISO timestamp
  requested_by: string,          // System component (e.g., 'plan-executor')
  expires_at: string,            // ISO timestamp (TTL-based)
  
  // Decision metadata
  reviewed_by: string | null,    // Operator ID
  reviewed_at: string | null,    // ISO timestamp
  decision_reason: string | null, // Approval/denial explanation
  
  // Context for operator
  action_summary: string,        // Human-readable action
  risk_summary: string,          // Why approval is required
  target_entities: string[],     // What will be affected
  estimated_duration_ms: number, // Expected execution time
  rollback_available: boolean,   // Can this be undone
  
  // Metadata
  created_at: string,            // ISO timestamp
  updated_at: string             // ISO timestamp
}
```

### Database Table

```sql
CREATE TABLE approval_requests (
  approval_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  
  required_tier TEXT NOT NULL CHECK(required_tier IN ('T1', 'T2')),
  required_by TEXT NOT NULL,
  
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'denied', 'expired')),
  
  requested_at TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  
  reviewed_by TEXT,
  reviewed_at TEXT,
  decision_reason TEXT,
  
  action_summary TEXT NOT NULL,
  risk_summary TEXT NOT NULL,
  target_entities TEXT NOT NULL, -- JSON array
  estimated_duration_ms INTEGER NOT NULL,
  rollback_available INTEGER NOT NULL DEFAULT 0, -- Boolean
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (execution_id) REFERENCES execution_ledger_summary(execution_id),
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
  FOREIGN KEY (intent_id) REFERENCES intents(intent_id)
);

CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_execution ON approval_requests(execution_id);
CREATE INDEX idx_approval_requests_expires ON approval_requests(expires_at);
```

---

## 2. Approval State Machine

### States

```javascript
const ApprovalStatus = {
  NOT_REQUIRED: 'not_required',  // T0 actions
  PENDING: 'pending',            // Awaiting operator decision
  APPROVED: 'approved',          // Operator approved
  DENIED: 'denied',              // Operator denied
  EXPIRED: 'expired'             // TTL exceeded before decision
};
```

### Transitions

```javascript
const ApprovalTransitions = {
  NOT_REQUIRED: [],              // Terminal (no approval needed)
  PENDING: ['approved', 'denied', 'expired'],
  APPROVED: [],                  // Terminal (execution can proceed)
  DENIED: [],                    // Terminal (execution blocked)
  EXPIRED: []                    // Terminal (execution blocked)
};
```

### Transition Rules

| From | To | Trigger | Precondition |
|------|-----|---------|--------------|
| - | NOT_REQUIRED | Policy evaluation | risk_tier === 'T0' |
| - | PENDING | Approval required | risk_tier === 'T1' \|\| 'T2' |
| PENDING | APPROVED | Operator approval | reviewed_by populated, expires_at not passed |
| PENDING | DENIED | Operator denial | reviewed_by populated |
| PENDING | EXPIRED | TTL exceeded | current_time > expires_at |

### State Validators

```javascript
function isTerminalState(status) {
  return ['not_required', 'approved', 'denied', 'expired'].includes(status);
}

function isApprovalGranted(status) {
  return status === 'approved' || status === 'not_required';
}

function isApprovalBlocked(status) {
  return status === 'denied' || status === 'expired';
}

function requiresOperatorAction(status) {
  return status === 'pending';
}
```

---

## 3. Policy Integration — Approval Requirement Determination

### Policy Constraint: `approval_required`

Add new constraint type to `constraint-evaluator.js`:

```javascript
{
  constraint_type: 'approval_required',
  parameters: {
    tier: 'T1' | 'T2',
    reason: string,
    ttl_seconds: number,
    required_by: string  // 'operator' | 'elevated'
  }
}
```

### Evaluation Logic

```javascript
async function evaluateApprovalRequired(constraint, context) {
  const { tier, reason, ttl_seconds, required_by } = constraint.parameters;
  const { risk_tier } = context;
  
  // Only apply if risk tier matches
  if (risk_tier !== tier) {
    return { satisfied: true, reason: `Risk tier mismatch (${risk_tier} !== ${tier})` };
  }
  
  // Approval required
  return {
    satisfied: false,
    reason: reason || `${tier} approval required`,
    approval_tier: tier,
    ttl_seconds: ttl_seconds || 3600,  // Default 1 hour
    required_by: required_by || 'operator'
  };
}
```

### Policy Example

```javascript
{
  policy_id: 'pol_require_t1_approval',
  name: 'T1 Approval Required',
  description: 'All T1 actions require operator approval',
  priority: 100,
  constraints: [
    {
      constraint_type: 'approval_required',
      parameters: {
        tier: 'T1',
        reason: 'Side-effect action requires operator approval',
        ttl_seconds: 3600,
        required_by: 'operator'
      }
    }
  ],
  action: 'allow'  // Allow if approved
}
```

---

## 4. Pipeline Integration Point

### Execution Order (Updated)

```
1. Extract targets from step
2. Acquire locks (atomic set)
   ↓
3. Lock conflict?
   ├─ YES → DENY execution, emit lock_denied, STOP
   └─ NO  → Continue to governance
4. Reconciliation check
5. Policy evaluation
   ↓
6. Approval required?
   ├─ YES → Request approval, wait for decision
   │         ├─ APPROVED → Continue
   │         ├─ DENIED → STOP, emit approval_denied
   │         └─ EXPIRED → STOP, emit approval_expired
   └─ NO  → Continue
7. Warrant issuance
8. Execution
9. Verification
10. Release locks (ALWAYS in finally block)
```

### Integration in PlanExecutionEngine

```javascript
async executeStep(step, planContext) {
  const execution_id = planContext.execution_id;
  const plan_id = planContext.plan_id;
  
  try {
    // 1-2. Extract targets, acquire locks
    const targets = this.targetExtractor.extractTargets(step);
    const lockResult = await this.lockManager.acquireLocks(targets, execution_id);
    
    if (!lockResult.success) {
      // Lock conflict handling
      return { status: 'BLOCKED', reason: 'Lock conflict' };
    }
    
    // 3-4. Reconciliation check
    const reconciliationResult = await this.reconciliationGate.checkAdmission(...);
    
    // 5. Policy evaluation
    const policyResult = await this.policyEngine.evaluate(...);
    
    // 6. APPROVAL CHECK
    const approvalResult = await this.approvalGate.checkApproval({
      execution_id,
      plan_id,
      step_id: step.step_id,
      intent_id: planContext.intent_id,
      risk_tier: step.risk_tier,
      policy_result: policyResult,
      action_summary: step.description,
      target_entities: targets.map(t => t.target_id)
    });
    
    if (!approvalResult.granted) {
      await this.ledger.appendEvent({
        execution_id,
        event_type: approvalResult.status === 'denied' 
          ? 'approval_denied' 
          : 'approval_expired',
        metadata: { approval_id: approvalResult.approval_id }
      });
      return { status: 'DENIED', reason: approvalResult.reason };
    }
    
    // 7. Warrant issuance
    const warrant = await this.warrantSystem.issueWarrant(...);
    
    // 8. Execution
    const executionResult = await this.executor.execute(step, warrant);
    
    // 9. Verification
    const verificationResult = await this.verifier.verify(...);
    
    return { status: 'COMPLETED', execution_result: executionResult };
    
  } finally {
    // 10. Release locks
    await this.lockManager.releaseLocks(targets, execution_id);
  }
}
```

---

## 5. Ledger Events

### New Event Types

```javascript
const ApprovalLedgerEvents = {
  APPROVAL_NOT_REQUIRED: 'approval.not_required',
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_APPROVED: 'approval.approved',
  APPROVAL_DENIED: 'approval.denied',
  APPROVAL_EXPIRED: 'approval.expired'
};
```

### Event Payloads

**approval.not_required**
```javascript
{
  event_type: 'approval.not_required',
  execution_id: string,
  event_timestamp: string,
  metadata: {
    risk_tier: 'T0',
    reason: 'T0 actions do not require approval'
  }
}
```

**approval.requested**
```javascript
{
  event_type: 'approval.requested',
  execution_id: string,
  event_timestamp: string,
  metadata: {
    approval_id: string,
    required_tier: 'T1' | 'T2',
    expires_at: string,
    action_summary: string,
    risk_summary: string
  }
}
```

**approval.approved**
```javascript
{
  event_type: 'approval.approved',
  execution_id: string,
  event_timestamp: string,
  metadata: {
    approval_id: string,
    reviewed_by: string,
    reviewed_at: string,
    decision_reason: string | null
  }
}
```

**approval.denied**
```javascript
{
  event_type: 'approval.denied',
  execution_id: string,
  event_timestamp: string,
  metadata: {
    approval_id: string,
    reviewed_by: string,
    reviewed_at: string,
    denial_reason: string
  }
}
```

**approval.expired**
```javascript
{
  event_type: 'approval.expired',
  execution_id: string,
  event_timestamp: string,
  metadata: {
    approval_id: string,
    expires_at: string,
    pending_duration_ms: number
  }
}
```

---

## 6. Failure Semantics

### Hard Stop Conditions

| Condition | Behavior | Event | Next Step Status |
|-----------|----------|-------|------------------|
| `status === 'pending'` | Block execution | `approval.requested` | WAITING_APPROVAL |
| `status === 'denied'` | Immediate failure | `approval.denied` | DENIED |
| `status === 'expired'` | Immediate failure | `approval.expired` | DENIED |
| Missing approval record when required | Immediate failure | `approval.missing` | DENIED |

### Fail-Closed Guarantees

```javascript
class ApprovalGate {
  async checkApproval(context) {
    const { risk_tier, policy_result } = context;
    
    // T0: No approval required
    if (risk_tier === 'T0') {
      return { granted: true, status: 'not_required' };
    }
    
    // Check if policy requires approval
    const approvalConstraint = this.extractApprovalConstraint(policy_result);
    
    if (!approvalConstraint) {
      // FAIL CLOSED: T1/T2 without explicit approval policy = deny
      throw new Error('APPROVAL_POLICY_MISSING: T1/T2 action without approval constraint');
    }
    
    // Create or retrieve approval request
    const approval = await this.getOrCreateApprovalRequest(context, approvalConstraint);
    
    // Check expiry
    if (new Date(approval.expires_at) < new Date()) {
      await this.transitionToExpired(approval.approval_id);
      return { granted: false, status: 'expired', approval_id: approval.approval_id };
    }
    
    // Check status
    switch (approval.status) {
      case 'approved':
        return { granted: true, status: 'approved', approval_id: approval.approval_id };
      case 'denied':
        return { granted: false, status: 'denied', approval_id: approval.approval_id };
      case 'pending':
        return { granted: false, status: 'pending', approval_id: approval.approval_id };
      default:
        // FAIL CLOSED: Unknown status
        throw new Error(`APPROVAL_INVALID_STATUS: ${approval.status}`);
    }
  }
}
```

---

## 7. Operator Workflow

### Minimal Operator Actions

**View Pending Approvals**
```
GET /api/v1/approvals?status=pending
→ Returns list of pending approval requests
```

**Get Approval Details**
```
GET /api/v1/approvals/:approval_id
→ Returns full approval context (action, risk, targets, expiry)
```

**Approve Request**
```
POST /api/v1/approvals/:approval_id/approve
{
  reviewed_by: string,
  decision_reason?: string
}
→ Transitions to approved, execution can proceed
```

**Deny Request**
```
POST /api/v1/approvals/:approval_id/deny
{
  reviewed_by: string,
  denial_reason: string
}
→ Transitions to denied, execution blocked
```

**Get Approval History**
```
GET /api/v1/approvals?execution_id=:execution_id
→ Returns all approval events for execution
```

### Operator Context Display

Minimal fields for operator decision:

```
Approval Request #ABC123

Action: Restart service openclaw-gateway
Risk Tier: T1
Reason: Service restart requires operator approval

Targets:
- service:openclaw-gateway

Estimated Duration: 5 seconds
Rollback Available: Yes (service can be restarted)

Requested: 2026-03-19 13:55:00 EDT
Expires: 2026-03-19 14:55:00 EDT (in 58 minutes)

[Approve] [Deny]
```

---

## 8. Implementation Sequence

### Stage 1: Core Approval Infrastructure (3-4 hours)

**Components:**
- `lib/core/approval-schema.js` — ApprovalRequest schema + validation
- `lib/core/approval-state-machine.js` — State transitions + validators
- `lib/state/schema.sql` — approval_requests table
- `lib/state/state-graph.js` — Approval CRUD methods
- `tests/phase-17/test-approval-schema.test.js` — Schema validation tests
- `tests/phase-17/test-approval-state-machine.test.js` — State machine tests

**Exit criteria:**
- Schema validated
- State machine deterministic
- CRUD operations functional
- 20+ tests passing

### Stage 2: Policy Integration (2-3 hours)

**Components:**
- `lib/core/constraint-evaluator.js` — Add `approval_required` constraint
- `lib/core/policy-engine.js` — Extract approval requirements from policy results
- Default policies for T1/T2
- `tests/phase-17/test-approval-policy-integration.test.js`

**Exit criteria:**
- Policy evaluation determines approval requirement
- T0 → no approval
- T1 → operator approval
- T2 → elevated approval
- 10+ tests passing

### Stage 3: Approval Gate (3-4 hours)

**Components:**
- `lib/core/approval-gate.js` — Core approval checking logic
- `lib/core/plan-execution-engine.js` — Integrate approval gate into pipeline
- `tests/phase-17/test-approval-gate.test.js`
- `tests/phase-17/test-approval-integration.test.js`

**Exit criteria:**
- Approval gate integrated in execution pipeline
- PENDING → blocks execution
- APPROVED → allows execution
- DENIED/EXPIRED → fails execution
- 15+ tests passing

### Stage 4: Ledger Integration (1-2 hours)

**Components:**
- `lib/state/state-graph.js` — Add approval ledger event methods
- `lib/core/approval-gate.js` — Emit ledger events
- `tests/phase-17/test-approval-ledger.test.js`

**Exit criteria:**
- All 5 approval events emitted
- Events linked to execution_id
- Ledger timeline includes approval events
- 10+ tests passing

### Stage 5: Operator API (2-3 hours)

**Components:**
- `console/server/src/routes/approvals.ts` — Approval endpoints
- `console/server/src/services/approvalService.ts` — Business logic
- `tests/phase-17/test-approval-api.test.js`

**Exit criteria:**
- GET pending approvals
- GET approval details
- POST approve
- POST deny
- API tests passing

### Stage 6: Validation & Documentation (1-2 hours)

**Components:**
- End-to-end approval workflow test
- Browser validation checklist
- `PHASE_17_COMPLETE.md`

**Exit criteria:**
- Full T1 approval flow validated
- Expired approval behavior validated
- Denial behavior validated
- Documentation complete

**Total estimated time:** 12-18 hours

---

## 9. Test Strategy

### Test Categories

**Category A: Schema & State Machine (10 tests)**
- Schema validation
- State transitions
- Terminal state detection
- Expiry handling

**Category B: Policy Integration (10 tests)**
- T0 no approval
- T1 requires approval
- T2 requires approval
- Approval constraint extraction
- TTL from policy

**Category C: Approval Gate (15 tests)**
- T0 fast-path
- T1 pending blocks execution
- T1 approved allows execution
- T1 denied blocks execution
- T1 expired blocks execution
- Missing approval fails closed
- Unknown status fails closed

**Category D: Ledger Events (10 tests)**
- All 5 event types emitted
- Event metadata complete
- Events linked to execution
- Timeline includes approval

**Category E: Operator API (10 tests)**
- List pending
- Get details
- Approve request
- Deny request
- Expired request handling

**Category F: Integration (10 tests)**
- Full T1 approval workflow
- Multi-step plan with approval
- Approval expiry during execution
- Lock + approval interaction

**Total:** 65+ tests

---

## 10. Key Design Decisions

### Decision 1: Approval before Warrant

**Choice:** Approval check before warrant issuance

**Rationale:** Warrant should only issue when all prerequisites satisfied (locks + reconciliation + policy + approval)

**Alternative rejected:** Approval after warrant (would require warrant revocation logic)

### Decision 2: Fail Closed on Missing Policy

**Choice:** T1/T2 without explicit approval policy → deny execution

**Rationale:** Safer to require explicit approval configuration than assume approval not needed

**Alternative rejected:** Allow execution if policy doesn't mention approval (too permissive)

### Decision 3: Approval Request per Step

**Choice:** Each step requiring approval gets separate approval request

**Rationale:** Operator can evaluate each action independently, not batch-approve multi-step plan

**Alternative rejected:** One approval per plan (loses per-step visibility)

### Decision 4: TTL-Based Expiry

**Choice:** Approval expires after TTL (default 1 hour)

**Rationale:** Prevents stale approvals from executing much later in different system state

**Alternative rejected:** No expiry (could execute after system state changed)

### Decision 5: No Approval Retraction

**Choice:** Once approved, cannot be un-approved (only expires naturally)

**Rationale:** Simpler state machine, operator should deny if uncertain

**Alternative rejected:** Allow retraction (complex state management, unclear semantics)

---

## 11. Success Criteria

Phase 17 is complete when:

1. ✅ Approval schema persisted in State Graph
2. ✅ Approval state machine deterministic
3. ✅ Policy determines approval requirement
4. ✅ T0 actions bypass approval (fast-path)
5. ✅ T1/T2 actions require approval
6. ✅ PENDING status blocks execution
7. ✅ APPROVED status allows execution
8. ✅ DENIED/EXPIRED status fails execution
9. ✅ Missing approval fails closed
10. ✅ All 5 approval events in ledger
11. ✅ Operator can approve/deny via API
12. ✅ Full T1 workflow validated end-to-end
13. ✅ 65+ tests passing (100%)
14. ✅ Documentation complete

---

## 12. Post-Phase 17 Roadmap

**Phase 17.1 — Verification Template Expansion (4-6 hours)**
- Service-specific verification templates
- Action-specific checks
- Verification strength levels

**Phase 17.2 — Operator Debugging Context (3-4 hours)**
- Richer denial reasons
- Explain why action failed
- Suggest remediation

**Phase 16.3 — Queuing & Priority (6-8 hours)**
- Queue BLOCKED plans for retry
- Priority-based scheduling
- Concurrent execution limits

---

## Appendix: Approval Gate Pseudocode

```javascript
class ApprovalGate {
  constructor(stateGraph, policyEngine, ledger) {
    this.stateGraph = stateGraph;
    this.policyEngine = policyEngine;
    this.ledger = ledger;
  }
  
  async checkApproval(context) {
    const { execution_id, plan_id, step_id, intent_id, risk_tier, policy_result } = context;
    
    // T0 fast-path
    if (risk_tier === 'T0') {
      await this.ledger.appendEvent({
        execution_id,
        event_type: 'approval.not_required',
        metadata: { risk_tier: 'T0' }
      });
      return { granted: true, status: 'not_required' };
    }
    
    // Extract approval constraint from policy
    const approvalConstraint = this.extractApprovalConstraint(policy_result);
    
    if (!approvalConstraint) {
      // FAIL CLOSED
      throw new Error('APPROVAL_POLICY_MISSING');
    }
    
    // Get or create approval request
    let approval = await this.stateGraph.getApprovalByExecution(execution_id, step_id);
    
    if (!approval) {
      approval = await this.createApprovalRequest(context, approvalConstraint);
      
      await this.ledger.appendEvent({
        execution_id,
        event_type: 'approval.requested',
        metadata: {
          approval_id: approval.approval_id,
          required_tier: approval.required_tier,
          expires_at: approval.expires_at
        }
      });
    }
    
    // Check expiry
    if (this.isExpired(approval)) {
      await this.transitionToExpired(approval.approval_id);
      
      await this.ledger.appendEvent({
        execution_id,
        event_type: 'approval.expired',
        metadata: { approval_id: approval.approval_id }
      });
      
      return { granted: false, status: 'expired', approval_id: approval.approval_id };
    }
    
    // Check status
    switch (approval.status) {
      case 'approved':
        return { granted: true, status: 'approved', approval_id: approval.approval_id };
        
      case 'denied':
        return { granted: false, status: 'denied', approval_id: approval.approval_id, reason: approval.decision_reason };
        
      case 'pending':
        return { granted: false, status: 'pending', approval_id: approval.approval_id, message: 'Awaiting operator approval' };
        
      default:
        // FAIL CLOSED
        throw new Error(`APPROVAL_INVALID_STATUS: ${approval.status}`);
    }
  }
  
  async approve(approval_id, reviewed_by, decision_reason = null) {
    const approval = await this.stateGraph.getApproval(approval_id);
    
    if (!approval) {
      throw new Error('APPROVAL_NOT_FOUND');
    }
    
    if (approval.status !== 'pending') {
      throw new Error(`APPROVAL_INVALID_TRANSITION: Cannot approve from ${approval.status}`);
    }
    
    if (this.isExpired(approval)) {
      throw new Error('APPROVAL_EXPIRED');
    }
    
    const updated = await this.stateGraph.updateApprovalStatus(approval_id, 'approved', {
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      decision_reason
    });
    
    await this.ledger.appendEvent({
      execution_id: approval.execution_id,
      event_type: 'approval.approved',
      metadata: {
        approval_id,
        reviewed_by,
        reviewed_at: updated.reviewed_at
      }
    });
    
    return updated;
  }
  
  async deny(approval_id, reviewed_by, denial_reason) {
    const approval = await this.stateGraph.getApproval(approval_id);
    
    if (!approval) {
      throw new Error('APPROVAL_NOT_FOUND');
    }
    
    if (approval.status !== 'pending') {
      throw new Error(`APPROVAL_INVALID_TRANSITION: Cannot deny from ${approval.status}`);
    }
    
    const updated = await this.stateGraph.updateApprovalStatus(approval_id, 'denied', {
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      decision_reason: denial_reason
    });
    
    await this.ledger.appendEvent({
      execution_id: approval.execution_id,
      event_type: 'approval.denied',
      metadata: {
        approval_id,
        reviewed_by,
        denial_reason
      }
    });
    
    return updated;
  }
  
  isExpired(approval) {
    return new Date(approval.expires_at) < new Date();
  }
}
```

---

**Status:** Planning complete, ready for implementation

**Next:** Begin Stage 1 (Core Approval Infrastructure)
