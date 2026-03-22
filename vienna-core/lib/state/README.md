# State Graph — Vienna's Persistent Memory

**Status:** Phase 7.1a (aligned)  
**Environment-aware:** ✅ Yes  
**Executor integration:** ✅ Available (optional)

---

## Overview

State Graph provides persistent, structured memory for Vienna OS. It tracks:

- **Services** — system services, cron jobs, APIs, daemons
- **Providers** — LLM providers (Anthropic, Ollama), API credentials
- **Incidents** — failures, resolutions, patterns
- **Objectives** — tasks, milestones, projects
- **Runtime Context** — operational flags, configuration state
- **State Transitions** — audit trail of state changes

**Storage:** SQLite at environment-specific paths  
**Default:** `~/.openclaw/runtime/prod/state/state-graph.db`

---

## Environment Isolation

State Graph respects `VIENNA_ENV` for prod/test separation.

**Prod (default):**
```bash
node query-state-graph.js services
# → ~/.openclaw/runtime/prod/state/state-graph.db
```

**Test:**
```bash
VIENNA_ENV=test node query-state-graph.js services
# → ~/.openclaw/runtime/test/state/state-graph.db
```

**Test isolation verified:** Writes in test do not affect prod (12/12 tests passing).

---

## Basic Usage (Direct Access)

### Read Operations (No Warrant Required)

```javascript
const { getStateGraph } = require('./lib/state/state-graph');

const stateGraph = getStateGraph();
await stateGraph.initialize();

// List services
const services = stateGraph.listServices({ status: 'degraded' });

// Get specific service
const service = stateGraph.getService('kalshi-cron');

// List open incidents
const incidents = stateGraph.listIncidents({ status: 'open' });

// Check runtime flag
const flag = stateGraph.getRuntimeContext('autonomous_window_active');

stateGraph.close();
```

### CLI Query Tool

```bash
# List all services
node scripts/query-state-graph.js services

# Find degraded services
node scripts/query-state-graph.js services --status=degraded

# Find open critical incidents
node scripts/query-state-graph.js incidents --status=open --severity=critical

# View active objectives
node scripts/query-state-graph.js objectives --status=active

# Check runtime flags
node scripts/query-state-graph.js context

# View state transitions (audit trail)
node scripts/query-state-graph.js transitions --entity-id=kalshi-cron
```

---

## Advanced Usage (Executor Integration)

**Status:** Available but optional for Phase 7.1 thin-slice foundation.

For governed writes with warrant enforcement and audit trails:

```javascript
const { StateGraphAdapter } = require('./lib/execution/adapters/state-graph-adapter');

const adapter = new StateGraphAdapter();
await adapter.initialize();

// Define action
const action = {
  action_type: 'update',
  entity_type: 'service',
  entity_id: 'kalshi-cron',
  updates: { status: 'degraded', health: 'warning' }
};

// Validate action
const validation = adapter.validate(action);
if (!validation.valid) {
  throw new Error(validation.error);
}

// Check risk tier
const tier = adapter.getRiskTier(action); // 'T2' for trading-critical

// Execute with warrant
const warrant = { issued_by: 'castlereagh' };
const result = await adapter.execute(action, warrant);

console.log(result); 
// { success: true, entity_id: 'kalshi-cron', changes: 1 }
```

**When to use executor integration:**
- Trading-critical state changes (T2 actions)
- Audit trail required
- Warrant enforcement needed
- Agent-proposed updates

**When direct access is fine:**
- Read operations
- Manual operator updates
- Testing/debugging
- Non-critical state changes

---

## Bootstrap

Seed initial Vienna OS state:

```bash
node scripts/bootstrap-state-graph.js
# Seeds: 5 services, 2 providers, 3 runtime flags, 2 objectives
```

Idempotent (safe to rerun). Existing entities unchanged.

**Test environment:**
```bash
VIENNA_ENV=test node scripts/bootstrap-state-graph.js
```

---

## Schema

### services
- `service_id` (PK) — unique identifier
- `service_name` — display name
- `service_type` — 'cron' | 'api' | 'daemon' | 'worker' | 'other'
- `status` — 'running' | 'stopped' | 'degraded' | 'failed' | 'unknown'
- `health` — 'healthy' | 'unhealthy' | 'warning'
- `last_check_at` — ISO8601 timestamp
- `dependencies` — JSON array of service_ids
- `metadata` — JSON object

### providers
- `provider_id` (PK)
- `provider_name`
- `provider_type` — 'llm' | 'api' | 'data' | 'other'
- `status` — 'active' | 'inactive' | 'degraded' | 'failed'
- `health` — 'healthy' | 'unhealthy' | 'rate_limited'
- `credentials_status` — 'valid' | 'expired' | 'missing' | 'rotated'
- `rate_limit_info` — JSON object
- `metadata` — JSON object

### incidents
- `incident_id` (PK)
- `incident_type` — 'service_failure' | 'api_error' | 'data_corruption' | 'config_error' | 'security' | 'other'
- `severity` — 'critical' | 'high' | 'medium' | 'low'
- `status` — 'open' | 'investigating' | 'resolved' | 'closed'
- `affected_services` — JSON array
- `detected_at` — ISO8601 timestamp
- `detected_by` — agent name
- `resolved_at` — ISO8601 timestamp
- `resolution` — text
- `root_cause` — text
- `action_taken` — text
- `pattern_id` — link to recurring pattern

### objectives
- `objective_id` (PK)
- `objective_name`
- `objective_type` — 'task' | 'milestone' | 'project' | 'investigation' | 'other'
- `status` — 'active' | 'completed' | 'blocked' | 'cancelled' | 'deferred'
- `priority` — 'critical' | 'high' | 'medium' | 'low'
- `assigned_to` — agent name
- `blocked_reason` — text
- `dependencies` — JSON array of objective_ids
- `progress_pct` — 0-100
- `completion_criteria` — text

### runtime_context
- `context_key` (PK)
- `context_value`
- `context_type` — 'flag' | 'config' | 'mode' | 'status'
- `expires_at` — ISO8601 timestamp (optional)
- `metadata` — JSON object

### state_transitions
- `transition_id` (autoincrement PK)
- `entity_type` — 'service' | 'provider' | 'incident' | 'objective' | 'runtime_context'
- `entity_id`
- `field_name` — field that changed
- `old_value` — previous value
- `new_value` — new value
- `changed_by` — agent/user name
- `changed_at` — ISO8601 timestamp

---

## Test Coverage

**Total:** 78/78 passing (100%)

- 25 unit tests (schema + CRUD)
- 20 integration tests (adapter + execution)
- 21 governance tests (Phase 6-style)
- 12 environment isolation tests (Phase 7.1a)

---

## Design Decisions

### Why SQLite?
- Structured queries (JOIN, WHERE, ORDER BY)
- ACID compliance (crash recovery)
- Single-file portability
- Zero configuration
- Concurrent reads (WAL mode)
- No external dependencies

### Why envelope-based writes?
- Enforces Phase 7.2 governance
- Prevents agent authority bypass
- Enables audit trail
- Trading guard integration automatic

### Why separate from audit trail?
- Audit = immutable event log
- State Graph = current world state
- Different query patterns
- Different retention policies

---

## Rollback

Delete database files to fall back to flat file state:

```bash
rm -rf ~/.openclaw/runtime/prod/state/state-graph.db
rm -rf ~/.openclaw/runtime/test/state/state-graph.db
```

Agents fall back to `VIENNA_RUNTIME_STATE.md`. No governance disruption.

---

## Next Steps

**Phase 7.1a:** ✅ Complete (environment-aware foundation)

**Phase 7.1.1 (pending approval):** Agent integration
- Castlereagh → health monitoring
- Alexander → incident creation
- Hardenberg → truth reconciliation
- Talleyrand → objective tracking

**Phase 7.1.2 (pending approval):** Observability
- Dashboard State Graph viewer
- Staleness detection
- Health check integration
