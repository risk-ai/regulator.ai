# OpenClaw Endpoint Architecture

**Date:** 2026-03-12  
**Status:** Phase A — Endpoint Model Definition  

---

## Architectural Principle

**OpenClaw is a Vienna execution endpoint, not the platform Vienna depends on.**

```
Operator
  ↓
Vienna OS (control plane + governance + memory)
  ↓
Execution Endpoints
  ├── Local Executor (Vienna Core)
  └── OpenClaw Endpoint
        └── OpenClaw Vienna Agent
```

---

## Core Relationship

**Before:**
```
OpenClaw (platform)
  └── Vienna OS (sits on top)
```

**After:**
```
Vienna OS (control plane)
  ├── Local Executor
  └── OpenClaw Endpoint (governed backend)
```

---

## Endpoint Model

### Endpoint Types

**1. Local Executor Endpoint**
- Type: `local`
- Executor: Vienna Core QueuedExecutor
- Capabilities: File ops, service control, system commands
- Risk tiers: T0, T1, T2
- Governance: Warrant + Risk Tier + Trading Guard

**2. OpenClaw Endpoint**
- Type: `remote`
- Target: OpenClaw Vienna Agent
- Protocol: Structured instruction envelopes
- Capabilities: OpenClaw-managed operations
- Risk tiers: T0, T1, T2
- Governance: Warrant + Risk Tier + Trading Guard

### Endpoint Metadata Schema

```javascript
{
  endpoint_id: 'openclaw',
  endpoint_type: 'remote',
  endpoint_name: 'OpenClaw Gateway',
  status: 'active' | 'degraded' | 'offline',
  health: 'healthy' | 'unhealthy',
  connectivity: 'connected' | 'disconnected',
  last_heartbeat: ISO8601,
  last_successful_action: ISO8601,
  capabilities: [
    'query_status',
    'restart_service',
    'run_workflow',
    'diagnose',
    'collect_logs'
  ],
  version: string,
  metadata: {
    gateway_url: string,
    agent_id: string,
    max_concurrent: number
  }
}
```

---

## Execution Lanes

### Lane 1: Local Executor

**Flow:**
```
Operator Chat
  → Intent Parser
  → Action Classification (T0/T1/T2)
  → Governance Check
  → Local Executor
  → Adapter (File/Service/Exec)
  → System
  → Result
  → Operator Chat
```

**Examples:**
- `show status` (T0)
- `restart openclaw gateway` (T1)
- `modify trading config` (T2)

### Lane 2: OpenClaw Endpoint

**Flow:**
```
Operator Chat
  → Intent Parser
  → Instruction Envelope Builder
  → Governance Check
  → OpenClaw Endpoint Bridge
  → OpenClaw Vienna Agent
  → Execution
  → Result Envelope
  → Operator Chat
```

**Examples:**
- `query openclaw status` (T0)
- `tell openclaw to restart gateway` (T1)
- `tell openclaw to modify trading params` (T2)

---

## Governance Unified Across Lanes

**Principle:** Same governance rules apply to both lanes.

### T0 (Read-only)
- Local: Execute directly
- OpenClaw: Dispatch directly

### T1 (Moderate Side-Effect)
- Local: Warrant required → Execute
- OpenClaw: Warrant required → Dispatch instruction

### T2 (Critical/Irreversible)
- Local: Warrant + Metternich approval → Execute
- OpenClaw: Warrant + Metternich approval → Dispatch instruction

### Audit Trail
- Local: Executor audit events
- OpenClaw: Endpoint dispatch audit events

### Trading Guard
- Local: Checked before execution
- OpenClaw: Checked before dispatch

---

## Instruction Envelope Schema

**Structure for OpenClaw endpoint communications:**

```javascript
{
  instruction_id: 'inst_20260312_001',
  instruction_type: 'run_workflow',
  target_endpoint: 'openclaw',
  target_agent: 'openclaw-vienna-agent',
  action: 'restart_service',
  arguments: {
    service: 'openclaw-gateway',
    reason: 'operator request'
  },
  risk_tier: 'T1',
  warrant_id: 'wrt_20260312_001',
  issued_by: 'vienna-operator-chat',
  issued_at: ISO8601,
  timeout_ms: 30000,
  metadata: {}
}
```

**Result Envelope:**

```javascript
{
  instruction_id: 'inst_20260312_001',
  status: 'success' | 'failure' | 'timeout',
  result: {
    action_taken: 'service_restarted',
    service: 'openclaw-gateway',
    state: 'running'
  },
  error: null | string,
  completed_at: ISO8601,
  duration_ms: number
}
```

---

## Endpoint Registration

**Local Endpoint (built-in):**

```javascript
{
  endpoint_id: 'local',
  endpoint_type: 'local',
  endpoint_name: 'Vienna Local Executor',
  status: 'active',
  health: 'healthy',
  capabilities: [
    'file_ops',
    'service_control',
    'system_commands',
    'state_queries'
  ]
}
```

**OpenClaw Endpoint (registered at startup):**

```javascript
{
  endpoint_id: 'openclaw',
  endpoint_type: 'remote',
  endpoint_name: 'OpenClaw Gateway',
  status: 'active' | 'offline',
  health: 'healthy' | 'unhealthy',
  connectivity: 'connected' | 'disconnected',
  last_heartbeat: ISO8601,
  capabilities: [
    'query_status',
    'restart_service',
    'run_workflow',
    'diagnose',
    'collect_logs'
  ],
  metadata: {
    gateway_url: 'http://localhost:18789',
    agent_id: 'openclaw-vienna-agent'
  }
}
```

---

## State Graph Integration

**Endpoints stored in State Graph:**

```sql
-- New table: endpoints
CREATE TABLE IF NOT EXISTS endpoints (
  endpoint_id TEXT PRIMARY KEY,
  endpoint_type TEXT NOT NULL CHECK(endpoint_type IN ('local', 'remote')),
  endpoint_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'degraded', 'offline', 'failed')),
  health TEXT NOT NULL CHECK(health IN ('healthy', 'unhealthy', 'unknown')),
  connectivity TEXT CHECK(connectivity IN ('connected', 'disconnected', 'unknown')),
  last_heartbeat TEXT,
  last_successful_action TEXT,
  capabilities TEXT, -- JSON array
  version TEXT,
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Instruction dispatch history
CREATE TABLE IF NOT EXISTS endpoint_instructions (
  instruction_id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  instruction_type TEXT NOT NULL,
  action TEXT NOT NULL,
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  warrant_id TEXT,
  issued_by TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'executing', 'success', 'failure', 'timeout')),
  result TEXT, -- JSON
  error TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (endpoint_id) REFERENCES endpoints(endpoint_id)
);
```

---

## Operator Chat Integration

**Chat intent routing:**

```
Operator: "show status"
→ Intent: show_status
→ Lane: local
→ Action: query_runtime_status
→ Execute locally
→ Return: status summary

Operator: "query openclaw status"
→ Intent: query_openclaw_status
→ Lane: openclaw
→ Instruction: { type: 'query_status', endpoint: 'openclaw' }
→ Dispatch to OpenClaw endpoint
→ Return: OpenClaw status

Operator: "restart openclaw gateway"
→ Intent: restart_service
→ Lane: local
→ Risk tier: T1
→ Warrant required
→ Execute locally via ServiceAdapter

Operator: "tell openclaw to restart gateway"
→ Intent: openclaw_restart_service
→ Lane: openclaw
→ Risk tier: T1
→ Warrant required
→ Dispatch instruction to OpenClaw endpoint
```

---

## Capability Registry

**Local Executor Capabilities:**

| Capability | Risk Tier | Description |
|------------|-----------|-------------|
| query_status | T0 | Read runtime status |
| query_services | T0 | Read service status |
| query_providers | T0 | Read provider health |
| read_logs | T0 | Read log files |
| restart_service | T1 | Restart system service |
| stop_service | T1 | Stop system service |
| start_service | T1 | Start system service |
| modify_config | T2 | Modify critical config |

**OpenClaw Endpoint Capabilities:**

| Capability | Risk Tier | Description |
|------------|-----------|-------------|
| query_status | T0 | Query OpenClaw status |
| refresh_runtime | T0 | Refresh OpenClaw runtime |
| inspect_gateway | T0 | Inspect gateway health |
| collect_logs | T0 | Collect OpenClaw logs |
| run_workflow | T1 | Run approved workflow |
| restart_service | T1 | Restart OpenClaw service |
| recovery_action | T1 | Run recovery action |
| modify_trading_params | T2 | Modify trading parameters |

---

## Heartbeat and Health

**OpenClaw endpoint heartbeat:**
- Interval: 30 seconds
- Method: HTTP GET to `/health`
- Timeout: 5 seconds
- On failure: Mark endpoint degraded
- After 3 consecutive failures: Mark endpoint offline

**Health checks:**
- Endpoint connectivity
- Last successful instruction dispatch
- Instruction failure rate
- Average instruction duration

---

## Security and Containment

**OpenClaw endpoint cannot:**
- Bypass Vienna governance
- Execute without warrant (T1/T2)
- Write to State Graph directly
- Execute arbitrary shell commands
- Bypass trading guard
- Bypass audit trail

**OpenClaw endpoint MUST:**
- Accept only structured instruction envelopes
- Return structured result envelopes
- Operate within declared capabilities
- Respect risk tier classification
- Surface failures clearly

---

## Failure Modes and Degradation

**OpenClaw endpoint offline:**
- Vienna marks endpoint offline
- Operator notified
- OpenClaw lane instructions fail gracefully
- Local lane continues normally
- Diagnostic: "OpenClaw endpoint unavailable"

**OpenClaw endpoint degraded:**
- High instruction failure rate
- Slow response times
- Vienna marks endpoint degraded
- Operator warned
- Instructions continue with caution

**OpenClaw instruction timeout:**
- Instruction marked timeout
- Audit event created
- Operator notified
- No retry (operator must re-issue)

---

## Rollback and Recovery

**Disable OpenClaw endpoint:**
```bash
export VIENNA_OPENCLAW_ENDPOINT_ENABLED=false
# Restart Vienna Core
```

Vienna operates with local lane only.

**Re-enable OpenClaw endpoint:**
```bash
export VIENNA_OPENCLAW_ENDPOINT_ENABLED=true
# Restart Vienna Core
```

Vienna re-registers OpenClaw endpoint and resumes endpoint communications.

---

## Monitoring

**Key metrics:**
- Endpoint connectivity status
- Last successful heartbeat
- Instruction dispatch rate
- Instruction success rate
- Instruction failure rate
- Average instruction duration
- Endpoint health score

**Alerting:**
- Endpoint offline (critical)
- Endpoint degraded (warning)
- High failure rate (warning)
- Slow response times (info)

---

## Implementation Phases

**Phase A: Endpoint Model** ✅ CURRENT
- Define endpoint abstraction
- Design metadata schema
- State Graph integration design

**Phase B: Local Execution Lane**
- Chat action bridge
- Local executor integration
- T0/T1/T2 routing

**Phase C: OpenClaw Endpoint Lane**
- Instruction envelope protocol
- OpenClaw bridge/client
- Result handling

**Phase D: Unified Governance**
- Risk tier unified
- Warrant integration
- Audit trail coverage

**Phase E: Operator Chat UX**
- Intent parsing
- Lane routing
- Result formatting

**Phase F: State Graph Integration**
- Endpoint registration
- Health tracking
- Instruction history

**Phase G: Validation**
- Test coverage
- Governance validation
- Security validation

---

## Success Criteria

✅ OpenClaw represented as endpoint in Vienna architecture  
✅ Endpoint metadata tracked in State Graph  
✅ Heartbeat and health monitoring operational  
✅ Operator can see OpenClaw as Vienna endpoint, not platform  
✅ Clear distinction between local and OpenClaw execution lanes  
✅ Governance boundaries preserved  

---

**Phase A Status:** Architecture defined, ready for implementation.

**Next:** Phase B (Chat Action Bridge for local execution)
