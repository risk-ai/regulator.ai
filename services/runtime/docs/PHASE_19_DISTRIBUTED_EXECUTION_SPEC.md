# Phase 19 — Distributed Execution

**Status:** ARCHITECTURALLY COMPLETE (Not Yet Implemented)  
**Category:** Distributed Systems  
**Dependencies:** Phases 1-17

---

## Goal

Enable Vienna OS to execute plans across multiple Vienna nodes with coordinated governance.

**Core principle:**
> Execution may be distributed, but governance remains centralized. One authority, many executors.

---

## Architecture

### Node Registry

**Purpose:** Track available Vienna execution nodes and their capabilities

**Node Schema:**
```javascript
{
  node_id: "node_001",
  node_type: "executor" | "coordinator" | "hybrid",
  capabilities: [
    "restart_service",
    "health_check",
    "query_database",
    "deploy_config"
  ],
  environment: "production" | "staging" | "dev",
  region: "us-east-1",
  host: "10.0.1.42:8080",
  status: "online" | "offline" | "degraded",
  last_heartbeat_at: "2026-03-21T19:00:00Z",
  metadata: {
    os: "Linux",
    vienna_version: "2.1.0",
    max_concurrent_executions: 5,
    supported_verification_types: ["http_healthcheck", "tcp_port_open"]
  },
  registered_at: "2026-03-01T12:00:00Z"
}
```

**Capability registration:**
- Nodes advertise supported action types
- Capability matching for work distribution
- Dynamic capability updates (node can add/remove capabilities)

**Heartbeat mechanism:**
- Nodes send heartbeat every 30s
- Missed heartbeat → status = degraded (after 60s)
- Missed 3 heartbeats → status = offline (after 120s)
- Auto-recovery: heartbeat resumes → status = online

---

### Work Distribution

**Purpose:** Route execution to capable nodes

**Distribution strategies:**

**1. Capability-based routing:**
```
Plan requires: restart_service on auth-api
Available nodes: [node_001, node_002, node_003]
Capable nodes: [node_001, node_002] (both have restart_service capability)
Selected: node_001 (lowest current load)
```

**2. Load balancing:**
```
Capable nodes: [node_001 (load: 2/5), node_002 (load: 4/5), node_003 (load: 1/5)]
Selected: node_003 (lowest load)
```

**3. Region affinity:**
```
Target: auth-api in us-east-1
Nodes: [node_001 (us-east-1), node_002 (us-west-2)]
Selected: node_001 (same region as target)
```

**4. Environment isolation:**
```
Target: production service
Nodes: [node_001 (production), node_002 (staging)]
Selected: node_001 (environment match)
```

**Work Distribution Schema:**
```javascript
{
  distribution_id: "dist_abc123",
  execution_id: "exec_456",
  plan_id: "plan_789",
  selected_node_id: "node_001",
  selection_strategy: "capability_based" | "load_balanced" | "region_affinity" | "environment_isolation",
  candidate_nodes: ["node_001", "node_002", "node_003"],
  selection_reason: "Lowest load (2/5), same region",
  distributed_at: "2026-03-21T19:00:00Z",
  status: "pending" | "dispatched" | "executing" | "completed" | "failed"
}
```

---

### Execution Coordination

**Purpose:** Track distributed execution lifecycle

**Coordination flow:**

**1. Plan assignment:**
```
Vienna Coordinator receives plan
→ Determine required capabilities
→ Query node registry for capable nodes
→ Select node via distribution strategy
→ Create distribution record
```

**2. Work dispatch:**
```
Create execution envelope
→ Serialize plan + context
→ Send to selected node
→ Await acknowledgment
→ Mark distribution as 'dispatched'
```

**3. Execution tracking:**
```
Node begins execution
→ Node sends progress updates
→ Coordinator updates distribution status
→ Node completes execution
→ Node sends result
→ Coordinator records outcome
```

**4. Result aggregation:**
```
Receive execution result
→ Verify node signature (optional)
→ Persist result to ledger
→ Update distribution status to 'completed'
→ Trigger verification (if configured)
```

**Coordination Schema:**
```javascript
{
  coordination_id: "coord_abc123",
  execution_id: "exec_456",
  node_id: "node_001",
  plan: { /* serialized plan */ },
  context: { /* execution context */ },
  dispatched_at: "2026-03-21T19:00:00Z",
  acknowledged_at: "2026-03-21T19:00:01Z",
  started_at: "2026-03-21T19:00:02Z",
  completed_at: "2026-03-21T19:00:45Z",
  result: { /* execution result */ },
  status: "pending" | "dispatched" | "acknowledged" | "executing" | "completed" | "failed" | "timeout"
}
```

---

### Cross-Node Locking

**Challenge:** Prevent concurrent execution of conflicting actions across nodes

**Solution:** Centralized lock manager (coordinator-managed locks)

**Lock acquisition:**
```
Node requests execution
→ Coordinator checks locks
→ Lock available? → Grant lock → Dispatch work
→ Lock held? → Deny dispatch → Return "locked_by: node_002"
```

**Lock schema:**
```javascript
{
  lock_id: "lock_abc123",
  target_type: "service" | "endpoint" | "resource",
  target_id: "auth-api",
  locked_by_node_id: "node_001",
  locked_by_execution_id: "exec_456",
  acquired_at: "2026-03-21T19:00:00Z",
  expires_at: "2026-03-21T19:05:00Z",
  status: "active" | "released" | "expired"
}
```

**Lock enforcement:**
- Coordinator holds all locks (single source of truth)
- Nodes request locks, do NOT manage locks themselves
- Lock expiry: TTL = plan execution timeout + 60s buffer
- Expired locks auto-released (coordinator cron job)

---

### Remote Verification

**Challenge:** Verify execution results from remote nodes

**Solution:** Verification delegation or centralized verification

**Option 1: Delegated verification (node performs verification):**
```
Node completes execution
→ Node runs verification checks
→ Node sends execution result + verification result
→ Coordinator persists both
```

**Option 2: Centralized verification (coordinator performs verification):**
```
Node completes execution
→ Node sends execution result only
→ Coordinator triggers verification
→ Coordinator selects verification node (may be same or different node)
→ Verification node runs checks
→ Verification result sent to coordinator
```

**Recommended:** Option 2 (centralized verification)
- Ensures verification is independent of execution
- Allows verification node to be different from execution node
- Simpler trust model (coordinator decides truth)

**Verification dispatch schema:**
```javascript
{
  verification_id: "verif_abc123",
  execution_id: "exec_456",
  verification_node_id: "node_002",
  verification_task: { /* verification checks */ },
  dispatched_at: "2026-03-21T19:00:50Z",
  completed_at: "2026-03-21T19:01:00Z",
  result: { /* verification result */ },
  status: "pending" | "dispatched" | "completed" | "failed"
}
```

---

## State Graph Extensions

**New Tables:**

```sql
-- Node registry
CREATE TABLE execution_nodes (
  node_id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL,
  capabilities TEXT NOT NULL, -- JSON array
  environment TEXT NOT NULL,
  region TEXT,
  host TEXT NOT NULL,
  status TEXT DEFAULT 'offline',
  last_heartbeat_at TEXT,
  metadata TEXT, -- JSON
  registered_at TEXT NOT NULL
);

-- Work distribution
CREATE TABLE work_distributions (
  distribution_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  plan_id TEXT,
  selected_node_id TEXT REFERENCES execution_nodes(node_id),
  selection_strategy TEXT,
  candidate_nodes TEXT, -- JSON array
  selection_reason TEXT,
  distributed_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
);

-- Execution coordination
CREATE TABLE execution_coordinations (
  coordination_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  node_id TEXT REFERENCES execution_nodes(node_id),
  plan TEXT, -- JSON
  context TEXT, -- JSON
  dispatched_at TEXT NOT NULL,
  acknowledged_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  result TEXT, -- JSON
  status TEXT DEFAULT 'pending'
);

-- Cross-node locks
CREATE TABLE distributed_locks (
  lock_id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  locked_by_node_id TEXT REFERENCES execution_nodes(node_id),
  locked_by_execution_id TEXT,
  acquired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT DEFAULT 'active'
);

-- Remote verification
CREATE TABLE remote_verifications (
  verification_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  verification_node_id TEXT REFERENCES execution_nodes(node_id),
  verification_task TEXT, -- JSON
  dispatched_at TEXT NOT NULL,
  completed_at TEXT,
  result TEXT, -- JSON
  status TEXT DEFAULT 'pending'
);

-- Indexes
CREATE INDEX idx_nodes_status ON execution_nodes(status);
CREATE INDEX idx_nodes_capabilities ON execution_nodes(capabilities);
CREATE INDEX idx_distributions_execution ON work_distributions(execution_id);
CREATE INDEX idx_coordinations_execution ON execution_coordinations(execution_id);
CREATE INDEX idx_locks_target ON distributed_locks(target_type, target_id);
CREATE INDEX idx_locks_status ON distributed_locks(status);
CREATE INDEX idx_verifications_execution ON remote_verifications(execution_id);
```

---

## Communication Protocol

**Transport:** HTTP/REST (Phase 19), gRPC (Phase 20 optional upgrade)

**Endpoints:**

**Coordinator → Node:**
- `POST /execute` — Dispatch plan for execution
- `POST /verify` — Dispatch verification task
- `POST /cancel` — Cancel running execution
- `GET /status` — Query node status

**Node → Coordinator:**
- `POST /heartbeat` — Report node health
- `POST /ack` — Acknowledge work receipt
- `POST /progress` — Report execution progress
- `POST /result` — Report execution result
- `POST /verification-result` — Report verification result

**Request/Response schemas:**

**Dispatch execution:**
```javascript
// Request
POST /execute
{
  execution_id: "exec_456",
  plan: { /* plan object */ },
  context: { /* execution context */ },
  lock_id: "lock_abc123"
}

// Response
{
  acknowledged: true,
  node_id: "node_001",
  estimated_duration_ms: 45000
}
```

**Report result:**
```javascript
// Request
POST /result
{
  execution_id: "exec_456",
  node_id: "node_001",
  result: { /* execution result */ },
  completed_at: "2026-03-21T19:00:45Z"
}

// Response
{
  received: true,
  coordinator_id: "coord_abc123"
}
```

---

## Failure Handling

**Node unreachability:**
```
Coordinator dispatches work
→ No acknowledgment within 10s
→ Mark distribution as 'timeout'
→ Select alternate node
→ Re-dispatch work
```

**Node dies mid-execution:**
```
Node stops sending heartbeats
→ Coordinator marks node as 'offline'
→ Check active coordinations for offline node
→ Mark coordinations as 'failed'
→ Release locks held by offline node
→ Option: Re-dispatch work to different node
```

**Execution timeout:**
```
Execution exceeds plan.timeout
→ Coordinator sends /cancel to node
→ Mark coordination as 'timeout'
→ Release lock
→ Record timeout in ledger
```

**Partial failure (multi-step plans):**
```
Step 1 succeeds on node_001
→ Step 2 fails on node_001
→ Coordinator decides: retry on same node OR retry on different node
→ If different node: dispatch remaining steps to node_002
```

---

## Implementation Components

**Planned Modules:**

1. **`lib/distributed/node-registry.js`**
   - Node registration
   - Capability tracking
   - Heartbeat processing
   - Health monitoring

2. **`lib/distributed/work-distributor.js`**
   - Capability matching
   - Load balancing
   - Node selection
   - Distribution logging

3. **`lib/distributed/execution-coordinator.js`**
   - Work dispatch
   - Progress tracking
   - Result aggregation
   - Timeout enforcement

4. **`lib/distributed/lock-manager.js`**
   - Lock acquisition
   - Lock release
   - Expiry cleanup
   - Conflict detection

5. **`lib/distributed/verification-dispatcher.js`**
   - Verification node selection
   - Verification task dispatch
   - Result collection

6. **`lib/distributed/node-client.js` (for executor nodes)**
   - Heartbeat sender
   - Work receiver
   - Result sender
   - Cancellation handler

**Planned Tests:**

- Node registry (20 tests)
- Work distributor (25 tests)
- Execution coordinator (30 tests)
- Lock manager (25 tests)
- Verification dispatcher (20 tests)
- Node client (20 tests)

**Total:** ~140 tests

---

## Success Criteria

**Phase 19 is complete when:**

1. ✅ Node registry operational (registration, heartbeat, health tracking)
2. ✅ Work distribution operational (capability matching, load balancing)
3. ✅ Execution coordination operational (dispatch, tracking, result aggregation)
4. ✅ Cross-node locking operational (centralized lock manager)
5. ✅ Remote verification operational (delegated verification dispatch)
6. ✅ Failure handling operational (node unreachability, timeouts, partial failures)
7. ✅ 140+ tests passing (100%)

---

## Timeline Estimate

**Node Registry:** 2-3 days  
**Work Distributor:** 3-4 days  
**Execution Coordinator:** 4-5 days  
**Lock Manager:** 3-4 days  
**Verification Dispatcher:** 2-3 days  
**Node Client:** 3-4 days  
**Testing:** 3-4 days  
**Documentation:** 1-2 days  

**Total:** 21-29 days (4-6 weeks)

---

## Status

**Architecture:** ✅ COMPLETE  
**Implementation:** ⚙️ PENDING  
**Validation:** ⚙️ PENDING  

**Recommendation:** Implement after Phase 18 complete (learning foundation recommended before distribution complexity)
