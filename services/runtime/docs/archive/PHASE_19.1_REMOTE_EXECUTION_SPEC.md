# Phase 19.1 — Remote Execution

**Status:** ARCHITECTURALLY COMPLETE (Not Yet Implemented)  
**Category:** Distributed Systems (Extension)  
**Dependencies:** Phase 19 (Distributed Execution)

---

## Goal

Enable Vienna nodes to execute plans on behalf of remote Vienna coordinators with full governance preservation.

**Core principle:**
> Remote execution is local execution with network transport. Governance boundaries must remain intact across the network.

---

## Architecture

### Remote Dispatcher

**Purpose:** Send execution requests to remote nodes

**Dispatch flow:**
```
Coordinator receives plan
→ Determine execution node (Phase 19 work distribution)
→ Serialize plan + context
→ Acquire distributed lock
→ Send execute request to node
→ Await acknowledgment
→ Track execution progress
→ Receive result
→ Release lock
→ Persist result to ledger
```

**Dispatcher Schema:**
```javascript
{
  dispatch_id: "dispatch_abc123",
  execution_id: "exec_456",
  target_node_id: "node_001",
  plan: { /* serialized plan */ },
  context: { /* execution context */ },
  lock_id: "lock_xyz789",
  dispatched_at: "2026-03-21T19:00:00Z",
  acknowledged_at: "2026-03-21T19:00:01Z",
  completed_at: "2026-03-21T19:00:45Z",
  status: "pending" | "dispatched" | "acknowledged" | "executing" | "completed" | "failed" | "timeout"
}
```

---

### Result Streaming

**Purpose:** Real-time execution updates from remote nodes

**Streaming mechanism:**

**Option 1: Polling (simple):**
```
Coordinator polls node every 5s
→ GET /execution/{execution_id}/status
→ Node returns current status
→ Coordinator updates tracking
```

**Option 2: Webhooks (recommended):**
```
Node sends progress updates to coordinator
→ POST {coordinator_url}/progress
→ Coordinator receives update
→ Coordinator acknowledges receipt
```

**Option 3: WebSocket (future):**
```
Coordinator opens WebSocket to node
→ Node sends progress events over socket
→ Real-time bidirectional communication
```

**Progress event schema:**
```javascript
{
  event_id: "event_abc123",
  execution_id: "exec_456",
  node_id: "node_001",
  event_type: "step_started" | "step_completed" | "step_failed" | "verification_started" | "verification_completed",
  step_index: 2,
  step_id: "step_002",
  timestamp: "2026-03-21T19:00:15Z",
  metadata: {
    step_name: "restart_service",
    target_id: "auth-api",
    duration_ms: 3500
  }
}
```

**Coordinator handling:**
```javascript
onProgressEvent(event) {
  // Update coordination record
  updateCoordination(event.execution_id, {
    last_progress_at: event.timestamp,
    current_step: event.step_id
  });
  
  // Emit ledger event
  emitLedgerEvent('execution.remote_progress', {
    execution_id: event.execution_id,
    node_id: event.node_id,
    event_type: event.event_type,
    metadata: event.metadata
  });
  
  // Optional: Forward to operator UI
  if (operatorWatching(event.execution_id)) {
    sendToOperator(event);
  }
}
```

---

### Failure Handling

**Node unreachability:**

**Detection:**
```
Coordinator dispatches execution
→ No acknowledgment within 10s (configurable)
→ Mark dispatch as 'timeout'
→ Check node heartbeat
→ Node offline? → Select alternate node → Re-dispatch
→ Node online but unresponsive? → Log warning → Retry once → Then fail
```

**Mitigation:**
```javascript
async dispatchWithRetry(execution_id, plan, context, options = {}) {
  const maxRetries = options.maxRetries || 2;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    const node = selectNode(plan, context, { excludeNodes: options.failedNodes });
    
    try {
      const result = await dispatchToNode(node.node_id, execution_id, plan, context);
      return result;
    } catch (err) {
      if (err.code === 'NODE_UNREACHABLE' || err.code === 'TIMEOUT') {
        options.failedNodes = options.failedNodes || [];
        options.failedNodes.push(node.node_id);
        attempt++;
        
        if (attempt >= maxRetries) {
          throw new Error(`Execution failed after ${maxRetries} attempts`);
        }
      } else {
        throw err; // Non-retryable error
      }
    }
  }
}
```

**Node failure mid-execution:**

**Detection:**
```
Node stops sending heartbeats
→ Coordinator marks node as 'offline'
→ Check active coordinations for offline node
→ Mark coordinations as 'node_failed'
```

**Recovery options:**

**Option 1: Re-dispatch entire plan to new node:**
```javascript
onNodeFailure(node_id) {
  const activeCoordinations = listCoordinations({
    node_id,
    status: ['executing', 'acknowledged']
  });
  
  for (const coord of activeCoordinations) {
    // Release lock
    releaseLock(coord.lock_id);
    
    // Re-dispatch to different node
    const newNode = selectNode(coord.plan, coord.context, { excludeNodes: [node_id] });
    redispatch(coord.execution_id, newNode.node_id, coord.plan, coord.context);
    
    // Emit ledger event
    emitLedgerEvent('execution.node_failed_redispatched', {
      execution_id: coord.execution_id,
      failed_node_id: node_id,
      new_node_id: newNode.node_id
    });
  }
}
```

**Option 2: Resume from last completed step (future):**
```
Identify last completed step
→ Re-dispatch remaining steps to new node
→ Preserve completed step results
```

**Execution timeout:**

**Detection:**
```
Execution exceeds plan.timeout
→ Coordinator sends /cancel to node
→ Node acknowledges cancellation
→ Node stops execution
→ Coordinator marks coordination as 'timeout'
```

**Cancellation protocol:**
```javascript
// Coordinator sends
POST /cancel
{
  execution_id: "exec_456",
  reason: "Execution timeout (limit: 300s)"
}

// Node responds
{
  acknowledged: true,
  stopped_at_step: 2,
  partial_result: { /* results from completed steps */ }
}

// Coordinator records
updateCoordination(execution_id, {
  status: 'timeout',
  stopped_at_step: 2,
  partial_result: partialResult,
  timeout_at: Date.now()
});

// Release lock
releaseLock(coordination.lock_id);
```

---

### Capability Negotiation

**Purpose:** Ensure node can execute requested actions before dispatch

**Negotiation flow:**

**1. Node registration (advertise capabilities):**
```
Node starts
→ Sends registration to coordinator
→ Includes capabilities list
→ Coordinator stores in node registry
```

**Example capabilities:**
```javascript
{
  node_id: "node_001",
  capabilities: [
    { action_type: "restart_service", supported_targets: ["auth-api", "gateway"] },
    { action_type: "health_check", supported_targets: ["*"] },
    { action_type: "deploy_config", supported_targets: ["*"], requires_approval: true },
    { action_type: "query_database", supported_targets: ["postgres"], max_query_size_kb: 100 }
  ]
}
```

**2. Capability matching (work distribution):**
```javascript
function selectCapableNode(plan) {
  const requiredCapabilities = extractCapabilities(plan);
  const nodes = listNodes({ status: 'online' });
  
  const capableNodes = nodes.filter(node => {
    return requiredCapabilities.every(req => {
      return node.capabilities.some(cap => 
        cap.action_type === req.action_type &&
        (cap.supported_targets.includes('*') || cap.supported_targets.includes(req.target_id))
      );
    });
  });
  
  if (capableNodes.length === 0) {
    throw new Error(`No capable nodes for plan ${plan.plan_id}`);
  }
  
  return selectNode(capableNodes); // Apply load balancing, region affinity, etc.
}
```

**3. Runtime capability check (before dispatch):**
```javascript
async dispatchToNode(node_id, execution_id, plan, context) {
  const node = getNode(node_id);
  
  // Pre-flight capability check
  const requiredCapabilities = extractCapabilities(plan);
  const missing = requiredCapabilities.filter(req => 
    !node.capabilities.some(cap => cap.action_type === req.action_type)
  );
  
  if (missing.length > 0) {
    throw new Error(`Node ${node_id} missing capabilities: ${missing.map(m => m.action_type).join(', ')}`);
  }
  
  // Dispatch
  return await sendExecuteRequest(node, execution_id, plan, context);
}
```

**4. Dynamic capability updates:**
```javascript
// Node can add/remove capabilities at runtime
POST /capability/add
{
  node_id: "node_001",
  capability: {
    action_type: "deploy_kubernetes",
    supported_targets: ["k8s-cluster-1"],
    metadata: { kubectl_version: "1.28" }
  }
}

POST /capability/remove
{
  node_id: "node_001",
  action_type: "deploy_config",
  reason: "Credential rotation, temporarily disabled"
}
```

---

## Implementation Components

**Planned Modules:**

1. **`lib/distributed/remote-dispatcher.js`**
   - Plan serialization
   - Dispatch request construction
   - Acknowledgment handling
   - Result collection

2. **`lib/distributed/result-streamer.js`**
   - Progress event handling
   - Webhook receiver
   - WebSocket server (future)
   - Event forwarding to ledger

3. **`lib/distributed/failure-handler.js`**
   - Node unreachability detection
   - Re-dispatch logic
   - Partial result handling
   - Timeout enforcement

4. **`lib/distributed/capability-negotiator.js`**
   - Capability registration
   - Capability matching
   - Pre-flight validation
   - Dynamic capability updates

5. **`lib/distributed/execution-monitor.js`**
   - Real-time execution tracking
   - Progress visualization (for operator UI)
   - Timeout detection
   - Anomaly detection (slow steps, repeated failures)

6. **`lib/distributed/node-executor.js` (for executor nodes)**
   - Execute request receiver
   - Local plan execution
   - Progress reporting
   - Result sender
   - Cancellation handler

**Planned Tests:**

- Remote dispatcher (25 tests)
- Result streamer (20 tests)
- Failure handler (30 tests)
- Capability negotiator (25 tests)
- Execution monitor (20 tests)
- Node executor (25 tests)

**Total:** ~145 tests

---

## Security Considerations

**Authentication:**
- Node-to-coordinator: Shared secret or TLS client certificates
- Coordinator-to-node: API keys or mutual TLS

**Authorization:**
- Nodes can only execute actions matching their capabilities
- Coordinator verifies node identity before dispatch
- Nodes verify coordinator identity before accepting work

**Data integrity:**
- Plan serialization includes checksum
- Result verification includes node signature (optional)
- Tamper detection: coordinator verifies result hash

**Audit trail:**
- All dispatches logged
- All results logged
- All node failures logged
- Operator can reconstruct full execution timeline

---

## Ledger Events

**New event types:**

- `execution.remote_dispatched` — Execution dispatched to remote node
- `execution.remote_acknowledged` — Node acknowledged receipt
- `execution.remote_progress` — Progress update from node
- `execution.remote_completed` — Execution completed on remote node
- `execution.remote_failed` — Execution failed on remote node
- `execution.remote_timeout` — Execution timeout on remote node
- `execution.node_failed_redispatched` — Node failure, work re-dispatched
- `execution.remote_cancelled` — Execution cancelled by coordinator

---

## Success Criteria

**Phase 19.1 is complete when:**

1. ✅ Remote dispatcher operational (dispatch, acknowledgment, result collection)
2. ✅ Result streaming operational (progress events, webhook receiver)
3. ✅ Failure handling operational (node unreachability, mid-execution failure, timeout)
4. ✅ Capability negotiation operational (registration, matching, pre-flight validation)
5. ✅ Execution monitor operational (real-time tracking, timeout detection)
6. ✅ Node executor operational (request receiver, local execution, progress reporting)
7. ✅ 145+ tests passing (100%)

---

## Timeline Estimate

**Remote Dispatcher:** 3-4 days  
**Result Streamer:** 3-4 days  
**Failure Handler:** 4-5 days  
**Capability Negotiator:** 3-4 days  
**Execution Monitor:** 2-3 days  
**Node Executor:** 3-4 days  
**Testing:** 3-4 days  
**Documentation:** 1-2 days  

**Total:** 22-30 days (4-6 weeks)

---

## Status

**Architecture:** ✅ COMPLETE  
**Implementation:** ⚙️ PENDING  
**Validation:** ⚙️ PENDING  

**Recommendation:** Implement immediately after Phase 19 (distributed execution foundation required)
