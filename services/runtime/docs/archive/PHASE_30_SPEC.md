# Phase 30 — Federation (Multi-Node Execution)

**Goal:** Coordinate execution across multiple Vienna nodes  
**Duration:** 4-5 hours  
**Critical For:** Distributed deployment, scale-out

---

## Problem Statement

**Current state:** Single-node execution:
- One Vienna instance handles all work
- No horizontal scaling
- No geographic distribution
- Single point of failure

**Need:** Multi-node coordination with unified governance

---

## What to Build

### 1. Node Registry

**Track available nodes:**
```json
{
  "node_id": "vienna-us-east",
  "node_type": "execution",
  "capabilities": ["restart_service", "health_check", "query_agent"],
  "region": "us-east-1",
  "status": "active",
  "health": "healthy",
  "capacity": {
    "max_concurrent_executions": 10,
    "current_load": 3
  },
  "url": "https://vienna-us-east.law.ai"
}
```

### 2. Execution Router

**Route execution to best node:**
- Capability matching (node must support action)
- Load balancing (prefer less-loaded nodes)
- Geographic proximity (prefer nearby nodes)
- Health status (skip degraded nodes)

### 3. Cross-Node Communication

**Protocol:** HTTP/HTTPS (using Phase 19 transport)

**Endpoints:**
- POST `/api/v1/execute` — Execute plan on remote node
- GET `/api/v1/capabilities` — Query node capabilities
- GET `/health` — Node health check
- POST `/api/v1/cancel/:execution_id` — Cancel remote execution

### 4. Federated State

**Challenge:** State Graph is local per node

**Solution:**
- Execution ledger events replicate to central State Graph
- Cross-node execution visible in unified audit trail
- Node-local caching for performance

---

## Implementation Plan

### Component 1: NodeRegistry

**Location:** `vienna-core/lib/federation/node-registry.js`

```javascript
class NodeRegistry {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  // Register node
  async registerNode(nodeConfig) {
    await this.stateGraph.query(`
      INSERT OR REPLACE INTO federation_nodes (
        node_id, node_type, capabilities, region, url,
        status, health, capacity, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nodeConfig.node_id,
      nodeConfig.node_type,
      JSON.stringify(nodeConfig.capabilities),
      nodeConfig.region,
      nodeConfig.url,
      'active',
      'healthy',
      JSON.stringify(nodeConfig.capacity),
      JSON.stringify(nodeConfig.metadata || {})
    ]);
  }

  // List available nodes
  listActiveNodes() {
    return this.stateGraph.query(`
      SELECT * FROM federation_nodes
      WHERE status = 'active' AND health IN ('healthy', 'warning')
      ORDER BY region, node_id
    `).map(node => ({
      ...node,
      capabilities: JSON.parse(node.capabilities),
      capacity: JSON.parse(node.capacity),
      metadata: JSON.parse(node.metadata)
    }));
  }

  // Find capable nodes
  findCapableNodes(requiredCapabilities) {
    const nodes = this.listActiveNodes();
    return nodes.filter(node =>
      requiredCapabilities.every(cap =>
        node.capabilities.includes(cap)
      )
    );
  }
}
```

### Component 2: ExecutionRouter

**Location:** `vienna-core/lib/federation/execution-router.js`

```javascript
class ExecutionRouter {
  constructor(nodeRegistry, httpTransport) {
    this.nodeRegistry = nodeRegistry;
    this.transport = httpTransport;
  }

  // Route execution to best node
  async routeExecution(plan, context) {
    // Extract required capabilities
    const requiredCapabilities = this._extractCapabilities(plan);

    // Find capable nodes
    const capableNodes = this.nodeRegistry.findCapableNodes(requiredCapabilities);

    if (capableNodes.length === 0) {
      throw new Error('No capable nodes available');
    }

    // Select best node
    const selectedNode = this._selectBestNode(capableNodes, context);

    // Dispatch to node
    const result = await this.transport.sendExecuteRequest(
      selectedNode.url,
      plan,
      context
    );

    return {
      node_id: selectedNode.node_id,
      result
    };
  }

  _selectBestNode(nodes, context) {
    // Sort by:
    // 1. Geographic proximity (if context has region)
    // 2. Current load (prefer less loaded)
    // 3. Health score

    return nodes.sort((a, b) => {
      // Prefer same region
      if (context.region) {
        if (a.region === context.region && b.region !== context.region) return -1;
        if (b.region === context.region && a.region !== context.region) return 1;
      }

      // Prefer lower load
      const aLoad = a.capacity.current_load / a.capacity.max_concurrent_executions;
      const bLoad = b.capacity.current_load / b.capacity.max_concurrent_executions;

      return aLoad - bLoad;
    })[0];
  }

  _extractCapabilities(plan) {
    const capabilities = new Set();

    for (const step of plan.workflow.steps) {
      capabilities.add(step.action_type);
    }

    return Array.from(capabilities);
  }
}
```

### Component 3: FederatedLedger

**Location:** `vienna-core/lib/federation/federated-ledger.js`

**Purpose:** Replicate execution events to central State Graph

```javascript
class FederatedLedger {
  constructor(stateGraph, centralStateGraphUrl) {
    this.stateGraph = stateGraph;
    this.centralUrl = centralStateGraphUrl;
  }

  // Record event locally and replicate to central
  async recordEvent(event) {
    // Write locally
    await this.stateGraph.appendLedgerEvent(event);

    // Replicate to central (async, non-blocking)
    this._replicateEventAsync(event);
  }

  async _replicateEventAsync(event) {
    try {
      await fetch(`${this.centralUrl}/api/v1/ledger/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      // Log replication failure but don't block execution
      console.error('Ledger replication failed:', error.message);
    }
  }
}
```

---

## Database Schema

```sql
-- Federation nodes
CREATE TABLE IF NOT EXISTS federation_nodes (
  node_id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL CHECK(node_type IN ('execution', 'storage', 'router')),
  capabilities TEXT NOT NULL, -- JSON array
  region TEXT,
  url TEXT NOT NULL,
  
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'maintenance')),
  health TEXT NOT NULL CHECK(health IN ('healthy', 'warning', 'degraded', 'failed')),
  
  capacity TEXT, -- JSON: { max_concurrent_executions, current_load }
  metadata TEXT, -- JSON
  
  last_heartbeat_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_federation_nodes_status ON federation_nodes(status, health);
CREATE INDEX IF NOT EXISTS idx_federation_nodes_region ON federation_nodes(region);

-- Federated executions (track cross-node execution)
CREATE TABLE IF NOT EXISTS federated_executions (
  execution_id TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('routing', 'dispatched', 'executing', 'completed', 'failed')),
  
  dispatched_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,
  
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_federated_executions_source ON federated_executions(source_node_id);
CREATE INDEX IF NOT EXISTS idx_federated_executions_target ON federated_executions(target_node_id);
CREATE INDEX IF NOT EXISTS idx_federated_executions_status ON federated_executions(status);
```

---

## Node-Side HTTP Endpoints

### POST /api/v1/execute

**Request:**
```json
{
  "plan": { ... },
  "context": {
    "execution_id": "exec_123",
    "tenant_context": { ... }
  }
}
```

**Response:**
```json
{
  "execution_id": "exec_123",
  "status": "completed",
  "result": { ... },
  "duration_ms": 1234
}
```

### GET /api/v1/capabilities

**Response:**
```json
{
  "node_id": "vienna-us-east",
  "capabilities": ["restart_service", "health_check", "query_agent"],
  "capacity": {
    "max_concurrent_executions": 10,
    "current_load": 3,
    "available": 7
  }
}
```

### GET /health

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "state_graph": "healthy",
    "execution_engine": "healthy",
    "lock_manager": "healthy"
  },
  "uptime_seconds": 12345
}
```

---

## Integration Points

### IntentGateway (Routing Decision)

```javascript
// Check if should route to remote node
const shouldRoute = this._shouldRouteRemotely(plan, context);

if (shouldRoute) {
  // Route to best node
  const result = await executionRouter.routeExecution(plan, context);
  return result;
} else {
  // Execute locally
  return await this.planExecutionEngine.execute(plan, context);
}
```

**Routing criteria:**
- Multi-step plans with >5 steps → prefer remote
- High-cost executions → load balance
- Region-specific actions → route to region

---

## Test Plan

### Test 1: Node Registration
- Register 3 nodes
- Verify: All nodes in registry
- Check: Capabilities indexed

### Test 2: Capability Matching
- Plan requires `restart_service` + `health_check`
- Find capable nodes
- Verify: Only nodes with both capabilities returned

### Test 3: Load Balancing
- 2 nodes available
- Execute 10 plans
- Verify: Work distributed evenly

### Test 4: Cross-Node Execution
- Route plan to remote node
- Verify: Execution completes
- Check: Ledger events replicated

### Test 5: Node Failure Handling
- Mark node as degraded
- Verify: Router skips degraded node
- Check: Fallback to healthy node

---

## Acceptance Criteria

1. ✅ Node registry operational
2. ✅ Execution routing working
3. ✅ Cross-node execution successful
4. ✅ Ledger replication functional
5. ✅ Load balancing effective

---

## Files to Deliver

1. `vienna-core/lib/federation/node-registry.js`
2. `vienna-core/lib/federation/execution-router.js`
3. `vienna-core/lib/federation/federated-ledger.js`
4. `vienna-core/lib/state/schema.sql` (federation_nodes, federated_executions)
5. `vienna-core/console/server/src/routes/execute.ts` (node endpoint)
6. `tests/phase-30/test-federation.js`
7. `PHASE_30_COMPLETE.md`

---

## Estimated Duration

- NodeRegistry: 60 minutes
- ExecutionRouter: 90 minutes
- FederatedLedger: 60 minutes
- HTTP endpoints + integration: 90 minutes

**Total: 4-5 hours**

---

## Production Deployment

**Minimal federation setup:**
1. Deploy 2 Vienna nodes (us-east, us-west)
2. Configure node registry in central State Graph
3. Enable routing in IntentGateway
4. Monitor cross-node executions

**Expected result:** Work distributed across nodes, unified audit trail

---

## Phase 30 Benefits

- **Horizontal scaling** — Add nodes to increase capacity
- **Geographic distribution** — Nodes in multiple regions
- **High availability** — Failover to healthy nodes
- **Load balancing** — Distribute work evenly
- **Unified governance** — Same policies across all nodes

---

**End of Phase 30 spec**

After Phase 30, Vienna OS has:
- ✅ Production-grade failure handling (Phase 26)
- ✅ Clear execution explanations (Phase 27)
- ✅ Multi-tenant isolation (Phase 28)
- ✅ Cost tracking + budgets (Phase 29)
- ✅ Federated execution (Phase 30)

**Ready for production deployment.**
