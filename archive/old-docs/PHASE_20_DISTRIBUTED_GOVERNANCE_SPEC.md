# Phase 20 — Distributed Governance

**Status:** ARCHITECTURALLY COMPLETE (Not Yet Implemented)  
**Category:** Distributed Systems (Governance Layer)  
**Dependencies:** Phases 19 + 19.1 (Distributed Execution + Remote Execution)

---

## Goal

Extend Vienna's governance model (policies, approvals, verification, audit) to distributed multi-node deployments while preserving safety guarantees.

**Core principle:**
> Governance is centralized. Execution is distributed. Trust is verified, not assumed.

---

## Architecture

### Distributed Locking

**Purpose:** Prevent concurrent execution of conflicting actions across multiple nodes

**Lock Manager (Centralized):**
```
Coordinator maintains all locks
→ Nodes request locks before execution
→ Coordinator grants/denies locks
→ Nodes execute only after lock acquired
→ Coordinator releases locks after execution
```

**Lock request flow:**
```
Node receives execution request
→ Node identifies required locks (target_id)
→ Node requests lock from coordinator
→ Coordinator checks lock availability
→ Lock available? → Grant lock → Node executes
→ Lock held? → Deny → Node returns "locked_by: node_002"
```

**Lock schema (from Phase 19):**
```javascript
{
  lock_id: "lock_abc123",
  target_type: "service" | "endpoint" | "resource",
  target_id: "auth-api",
  locked_by_node_id: "node_001",
  locked_by_execution_id: "exec_456",
  acquired_at: "2026-03-21T19:00:00Z",
  expires_at: "2026-03-21T19:05:00Z", // TTL-based expiry
  status: "active" | "released" | "expired"
}
```

**Lock expiry handling:**
```javascript
// Coordinator cron job (runs every 30s)
async cleanupExpiredLocks() {
  const expiredLocks = listLocks({
    status: 'active',
    expires_before: Date.now()
  });
  
  for (const lock of expiredLocks) {
    updateLock(lock.lock_id, { status: 'expired' });
    
    emitLedgerEvent('lock.expired', {
      lock_id: lock.lock_id,
      locked_by_node_id: lock.locked_by_node_id,
      locked_by_execution_id: lock.locked_by_execution_id,
      held_duration_ms: Date.now() - new Date(lock.acquired_at).getTime()
    });
  }
}
```

**Deadlock prevention:**
- Locks always acquired in deterministic order (alphabetical by target_id)
- Timeout-based expiry (TTL)
- No nested locks (single lock per execution)

---

### Global Policy Enforcement

**Purpose:** Apply consistent governance policies across all nodes

**Policy distribution:**
```
Coordinator stores policies
→ Nodes request policy evaluation before execution
→ Coordinator evaluates policy
→ Returns permit/deny decision
→ Node executes only if permit
```

**Policy evaluation protocol:**
```javascript
// Node requests policy evaluation
POST /policy/evaluate
{
  node_id: "node_001",
  execution_id: "exec_456",
  plan: { /* plan object */ },
  context: { /* execution context */ }
}

// Coordinator evaluates
const policies = listPolicies({ status: 'active' });
const decision = evaluatePolicies(policies, plan, context);

// Coordinator responds
{
  decision: "permit" | "deny",
  matched_policy_id: "policy_123",
  constraints_evaluated: [
    { constraint_type: "time_window", result: "pass" },
    { constraint_type: "rate_limit", result: "pass" }
  ],
  reason: "All constraints satisfied"
}
```

**Policy caching (optional optimization):**
```
Coordinator pushes policies to nodes
→ Nodes cache policies locally
→ Nodes evaluate policies locally (fast path)
→ Nodes report policy decisions back to coordinator (audit trail)
→ Coordinator detects policy version mismatch → force re-sync
```

**Policy versioning:**
```javascript
{
  policy_id: "policy_123",
  version: 5,
  last_updated_at: "2026-03-21T18:00:00Z",
  checksum: "sha256:abc123..."
}

// Node has policy_123 version 4
// Coordinator has policy_123 version 5
// Coordinator responds: "policy_outdated, re-sync required"
```

---

### Cross-Node Approval Coordination

**Purpose:** Enable operator approval workflows for actions spanning multiple nodes

**Approval flow (multi-node):**
```
Node 1 requests execution (requires approval)
→ Node 1 sends approval request to coordinator
→ Coordinator creates approval request
→ Operator reviews approval
→ Operator approves/denies
→ Coordinator sends decision to Node 1
→ Node 1 executes (if approved) or aborts (if denied)
```

**Multi-step plan with cross-node approval:**
```
Plan: [
  Step 1: restart_service on node_001 (requires approval)
  Step 2: verify_health on node_002 (no approval)
]

Execution:
1. Coordinator dispatches Step 1 to node_001
2. Node 1 requests approval from coordinator
3. Coordinator creates approval request
4. Operator approves
5. Coordinator notifies node_001
6. Node 1 executes Step 1
7. Node 1 reports result to coordinator
8. Coordinator dispatches Step 2 to node_002 (no approval needed)
9. Node 2 executes Step 2
10. Node 2 reports result to coordinator
11. Coordinator aggregates results
```

**Approval delegation (future):**
```
Coordinator can delegate approval authority to regional operators
→ US-EAST approvals handled by US operator
→ EU-WEST approvals handled by EU operator
→ Fallback to global operator if regional operator unavailable
```

---

### Federated Audit Trail

**Purpose:** Unified ledger across all nodes

**Centralized ledger (recommended):**
```
All nodes send ledger events to coordinator
→ Coordinator persists events to central ledger
→ Coordinator provides unified query API
→ Operators query single ledger for complete history
```

**Event emission protocol:**
```javascript
// Node emits ledger event
POST /ledger/emit
{
  node_id: "node_001",
  event_type: "execution.step_completed",
  execution_id: "exec_456",
  step_id: "step_002",
  timestamp: "2026-03-21T19:00:15Z",
  metadata: { /* event details */ }
}

// Coordinator persists
appendLedgerEvent({
  event_id: generateId(),
  source_node_id: "node_001",
  event_type: "execution.step_completed",
  execution_id: "exec_456",
  timestamp: "2026-03-21T19:00:15Z",
  metadata: { /* event details */ }
});
```

**Distributed ledger (future, optional):**
```
Each node maintains local ledger
→ Nodes periodically sync events to coordinator
→ Coordinator merges events into global ledger
→ Conflict resolution: timestamp + node_id ordering
```

**Audit query API:**
```javascript
// Query events across all nodes
GET /ledger/events?execution_id=exec_456

// Response
{
  events: [
    { node_id: "coordinator", event_type: "execution.dispatched", ... },
    { node_id: "node_001", event_type: "execution.started", ... },
    { node_id: "node_001", event_type: "execution.step_completed", ... },
    { node_id: "node_002", event_type: "verification.started", ... },
    { node_id: "node_002", event_type: "verification.completed", ... }
  ],
  total: 5
}
```

---

### Trust Model

**Centralized trust (Phase 20.0):**
- Coordinator is trusted authority
- Nodes trust coordinator
- Coordinator verifies node identity
- Nodes verify coordinator identity
- No node-to-node trust required

**Distributed trust (Phase 20.1, future):**
- Nodes can challenge coordinator decisions
- Quorum-based approval (3/5 nodes must agree)
- Byzantine fault tolerance (optional, complex)

**Zero-trust verification (Phase 20.2, future):**
- Coordinator verifies all node results
- Independent verification nodes
- Merkle proofs for state transitions
- Cryptographic attestation

---

## State Graph Extensions

**Distributed governance extensions:**

```sql
-- Policy distribution tracking
CREATE TABLE policy_distributions (
  distribution_id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  policy_version INTEGER NOT NULL,
  distributed_at TEXT NOT NULL,
  acknowledged_at TEXT,
  status TEXT DEFAULT 'pending' -- pending, acknowledged, outdated
);

-- Cross-node approvals
CREATE TABLE cross_node_approvals (
  approval_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  requesting_node_id TEXT NOT NULL,
  plan TEXT, -- JSON
  context TEXT, -- JSON
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  denied_by TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

-- Federated audit trail
CREATE TABLE federated_ledger_events (
  event_id TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  execution_id TEXT,
  timestamp TEXT NOT NULL,
  metadata TEXT, -- JSON
  received_at TEXT NOT NULL -- Coordinator receipt timestamp
);

-- Indexes
CREATE INDEX idx_policy_dist_node ON policy_distributions(node_id);
CREATE INDEX idx_cross_approvals_execution ON cross_node_approvals(execution_id);
CREATE INDEX idx_federated_events_execution ON federated_ledger_events(execution_id);
CREATE INDEX idx_federated_events_node ON federated_ledger_events(source_node_id);
```

---

## Implementation Components

**Planned Modules:**

1. **`lib/distributed/governance/distributed-lock-manager.js`**
   - Centralized lock acquisition
   - Lock expiry cleanup
   - Deadlock detection
   - Lock conflict resolution

2. **`lib/distributed/governance/policy-distributor.js`**
   - Policy push to nodes
   - Policy version tracking
   - Policy evaluation coordination
   - Cache invalidation

3. **`lib/distributed/governance/approval-coordinator.js`**
   - Cross-node approval workflow
   - Approval delegation (future)
   - Timeout enforcement

4. **`lib/distributed/governance/federated-ledger.js`**
   - Event aggregation
   - Unified query API
   - Event ordering
   - Conflict resolution

5. **`lib/distributed/governance/trust-verifier.js`**
   - Node identity verification
   - Result verification
   - Attestation validation

6. **`lib/distributed/governance/node-governance-client.js` (for executor nodes)**
   - Lock request sender
   - Policy evaluation requester
   - Approval request sender
   - Ledger event sender

**Planned Tests:**

- Distributed lock manager (30 tests)
- Policy distributor (25 tests)
- Approval coordinator (30 tests)
- Federated ledger (25 tests)
- Trust verifier (20 tests)
- Node governance client (25 tests)

**Total:** ~155 tests

---

## Success Criteria

**Phase 20 is complete when:**

1. ✅ Distributed locking operational (centralized lock manager, expiry, deadlock prevention)
2. ✅ Global policy enforcement operational (policy distribution, evaluation coordination)
3. ✅ Cross-node approval coordination operational (multi-node approval workflows)
4. ✅ Federated audit trail operational (centralized ledger, unified query API)
5. ✅ Trust verification operational (node identity, result verification)
6. ✅ 155+ tests passing (100%)

---

## Example Multi-Node Execution

**Scenario:** Restart auth-api service (requires approval, verification)

**Steps:**
1. Coordinator receives plan: restart auth-api
2. Coordinator determines node: node_001 (has restart_service capability for auth-api)
3. Coordinator creates approval request (T1 action)
4. Operator approves via dashboard
5. Coordinator dispatches to node_001 with lock request
6. node_001 requests lock for target:service:auth-api
7. Coordinator grants lock (lock_abc123)
8. node_001 executes restart
9. node_001 reports execution result to coordinator
10. Coordinator selects verification node: node_002
11. Coordinator dispatches verification to node_002
12. node_002 runs health checks
13. node_002 reports verification result to coordinator
14. Coordinator aggregates execution + verification
15. Coordinator releases lock
16. Coordinator persists workflow outcome to ledger

**Ledger events:**
```
1. execution.dispatched (coordinator)
2. lock.acquired (coordinator, node_001)
3. execution.started (node_001)
4. execution.completed (node_001)
5. verification.dispatched (coordinator, node_002)
6. verification.started (node_002)
7. verification.completed (node_002)
8. lock.released (coordinator)
9. workflow.outcome_finalized (coordinator)
```

**Total nodes involved:** 3 (coordinator, node_001, node_002)  
**Governance enforced:** Approval, locking, verification, audit trail

---

## Timeline Estimate

**Distributed Lock Manager:** 4-5 days  
**Policy Distributor:** 3-4 days  
**Approval Coordinator:** 4-5 days  
**Federated Ledger:** 3-4 days  
**Trust Verifier:** 3-4 days  
**Node Governance Client:** 3-4 days  
**Testing:** 4-5 days  
**Documentation:** 2-3 days  

**Total:** 26-34 days (5-7 weeks)

---

## Status

**Architecture:** ✅ COMPLETE  
**Implementation:** ⚙️ PENDING  
**Validation:** ⚙️ PENDING  

**Recommendation:** Implement after Phases 19 + 19.1 complete (distributed execution foundation required)

---

## Future Extensions (Phase 20+)

**Phase 20.1 — Distributed Trust:**
- Quorum-based approval
- Multi-coordinator consensus
- Byzantine fault tolerance

**Phase 20.2 — Zero-Trust Verification:**
- Independent result verification
- Cryptographic attestation
- Merkle proof state transitions

**Phase 20.3 — Multi-Region Governance:**
- Regional policy delegation
- Geo-distributed approval workflows
- Cross-region audit compliance
