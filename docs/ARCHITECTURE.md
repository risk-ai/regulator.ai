# Vienna OS Architecture

**Governed AI Execution Control Plane**

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [System Components](#system-components)
4. [Warrant System](#warrant-system)
5. [Agent Orchestration](#agent-orchestration)
6. [Execution Pipeline](#execution-pipeline)
7. [State Management](#state-management)
8. [Security Model](#security-model)

---

## Overview

Vienna OS is a **governed execution control plane** for AI agents. It ensures that every AI action is:

1. **Validated** — Schema-checked, source-verified
2. **Classified** — Risk-tiered (T0/T1/T2)
3. **Authorized** — Warrant-based approval
4. **Executed** — Deterministic, auditable
5. **Attested** — Cryptographically signed proof

**Key insight:** Most AI frameworks (LangChain, AutoGPT, CrewAI) are **fire-and-forget**. Vienna OS is **fail-closed** — it pauses on uncertainty and requires explicit authorization for high-risk actions.

---

## Core Principles

### 1. Fail-Closed by Default

**Problem:** Traditional AI agents continue execution even when uncertain.

**Vienna OS approach:**
- Low confidence (<70%) → Pause + escalate to human
- High risk (T1/T2) → Pause + require warrant approval
- Missing preconditions → Pause + request clarification

**Result:** Zero unauthorized actions, even if AI hallucinates.

### 2. Transactional Governance (Warrants)

**Problem:** AI actions are not transactional — no rollback, no ACID guarantees.

**Vienna OS approach:**
- Every T1/T2 action requires a **warrant** (authorization + reasoning + rollback plan)
- Warrants are **atomic** (all-or-nothing)
- Warrants are **consistent** (follow defined rules)
- Warrants are **isolated** (concurrent executions don't interfere)
- Warrants are **durable** (immutable audit trail)

**Result:** ACID properties for AI execution.

### 3. Evidence-Based Reasoning

**Problem:** AI outputs are black boxes — no way to trace reasoning.

**Vienna OS approach:**
- Every decision has an **evidence chain** (source → interpretation → conclusion)
- Confidence scores are **calibrated** (70% score = 70% accuracy)
- Reasoning is **explainable** (natural language + citations)

**Result:** Auditable, trustworthy AI.

### 4. Separation of Concerns

**Problem:** Monolithic AI agents are hard to debug, test, and maintain.

**Vienna OS approach:**
- **Agents** = Reasoning components (LLM-based proposal generation)
- **Vienna Core** = Governance layer (validation, authorization, execution)
- **Adapters** = System integration (Slack, Jira, database, etc.)

**Result:** Clean architecture, easy to extend.

---

## System Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Vienna OS Stack                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Agents    │  │  Vienna Core │  │   Adapters   │      │
│  │             │  │              │  │              │      │
│  │ • Proposes  │─▶│ • Validates  │─▶│ • Slack      │      │
│  │   actions   │  │ • Authorizes │  │ • GitHub     │      │
│  │ • Generates │  │ • Executes   │  │ • Database   │      │
│  │   reasoning │  │ • Attests    │  │ • Email      │      │
│  │             │  │              │  │ • Custom     │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               State Graph (SQLite/Postgres)           │ │
│  │  • Warrants • Executions • Policies • Audit Trail    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. Intent Gateway

**Responsibility:** Validate and classify incoming intents

**Input:**
```json
{
  "action": "restart_service",
  "description": "Restart API server",
  "parameters": { "service_name": "api" },
  "source": "operator",
  "metadata": { "operator_id": "op_123" }
}
```

**Operations:**
1. Schema validation (is `action` registered?)
2. Parameter validation (does `service_name` exist?)
3. Source verification (is `operator` authorized?)
4. Risk classification (T0/T1/T2)

**Output:**
- Valid intent → Forward to Policy Engine
- Invalid intent → Return error + reason

### 2. Policy Engine

**Responsibility:** Evaluate governance rules

**Policy example:**
```json
{
  "name": "Block production restarts during trading hours",
  "conditions": [
    { "field": "action", "operator": "==", "value": "restart_service" },
    { "field": "environment", "operator": "==", "value": "production" },
    { "field": "time_window", "operator": "in", "value": ["09:30-16:00"] }
  ],
  "action": "block",
  "notification": {
    "channels": ["slack"],
    "message": "Production restart attempted during trading hours"
  }
}
```

**Operations:**
1. Load active policies for tenant
2. Evaluate conditions against intent
3. Execute policy action (block, approve, notify, require_approval)

**Output:**
- Approved → Forward to Warrant System
- Blocked → Return policy violation error
- Requires approval → Pause + notify operator

### 3. Warrant System

**Responsibility:** Generate execution authorization

**Warrant structure:**
```json
{
  "warrant_id": "warrant_abc123",
  "intent_id": "intent_def456",
  "action": "restart_service",
  "approved": true,
  "risk_tier": "T1",
  "reasoning": "Service restart requested by authorized operator. Impact: 2-minute downtime. Rollback: Automatic failover to secondary instance.",
  "preconditions": [
    "service_exists:api",
    "secondary_instance_healthy:true",
    "operator_authorized:op_123"
  ],
  "execution_plan": {
    "steps": [
      "Drain active connections (30s grace period)",
      "Stop API service",
      "Run health check",
      "Start API service",
      "Verify healthy (5s timeout)"
    ]
  },
  "rollback_plan": {
    "type": "failover",
    "target": "api-secondary"
  },
  "approved_by": "op_123",
  "approved_at": "2026-03-26T15:00:00Z",
  "expires_at": "2026-03-26T15:30:00Z"
}
```

**Operations:**
1. Generate reasoning (AI-powered impact analysis)
2. Extract preconditions (what must be true before execution)
3. Define execution plan (deterministic steps)
4. Define rollback plan (how to undo if fails)
5. Assign expiration (warrants expire after 30 minutes by default)

**Output:**
- T0 (low risk) → Auto-approve + forward to Executor
- T1 (medium risk) → Require operator approval
- T2 (high risk) → Require multi-party approval (+ Metternich review)

### 4. Executor

**Responsibility:** Deterministically execute warranted actions

**Execution flow:**
```
1. Validate warrant (signature, expiration, preconditions)
2. Lock resources (prevent concurrent modifications)
3. Execute steps sequentially
4. Log each step (ledger events)
5. On failure → Execute rollback plan
6. On success → Generate attestation
7. Unlock resources
```

**Guarantees:**
- **Atomic:** All steps succeed or rollback
- **Isolated:** Concurrent executions don't interfere
- **Logged:** Every step recorded in audit trail

### 5. State Graph

**Responsibility:** Persistent storage for warrants, executions, policies

**Schema (simplified):**
```sql
CREATE TABLE warrants (
  warrant_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  risk_tier TEXT CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  approved BOOLEAN NOT NULL,
  reasoning TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP,
  expires_at TIMESTAMP,
  preconditions JSON,
  execution_plan JSON,
  rollback_plan JSON
);

CREATE TABLE executions (
  execution_id TEXT PRIMARY KEY,
  warrant_id TEXT REFERENCES warrants(warrant_id),
  status TEXT CHECK(status IN ('pending', 'running', 'success', 'failure', 'rolled_back')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  result JSON,
  attestation_id TEXT
);

CREATE TABLE ledger_events (
  event_id TEXT PRIMARY KEY,
  execution_id TEXT REFERENCES executions(execution_id),
  event_type TEXT,
  timestamp TIMESTAMP,
  data JSON
);
```

---

## Warrant System

### Warrant Lifecycle

```
1. Intent Received
   ↓
2. Risk Classification (T0/T1/T2)
   ↓
3. Warrant Generation
   ↓
4. Approval Workflow
   ├─ T0: Auto-approve
   ├─ T1: Operator approval
   └─ T2: Multi-party + Metternich
   ↓
5. Execution (if approved)
   ↓
6. Attestation
   ↓
7. Audit Trail
```

### Warrant Expiration

**Warrants are time-limited:**
- Default: 30 minutes
- T0: 1 hour
- T1: 30 minutes
- T2: 15 minutes (urgent high-risk actions)

**Why:** Prevents stale authorization. If operator approves "restart API" but execution happens 3 hours later, context has changed.

### Warrant Revocation

**Operators can revoke warrants:**

```bash
vienna warrant revoke warrant_abc123 --reason "Maintenance window postponed"
```

**Effect:** Immediate cancellation, no execution.

---

## Agent Orchestration

### Agent Roles (Vienna Diplomatic Trio)

Vienna OS uses **responsibility-based agent specialization**:

**1. Talleyrand (Strategy)**
- **What:** Planning, coordination, roadmap
- **When:** Multi-step workflows, complex decisions, architecture changes
- **Model:** Sonnet (cost-efficient, high capability)

**2. Metternich (Risk & Governance)**
- **What:** Validation, compliance, audit, T2 approval
- **When:** High-stakes decisions, policy violations, regulatory questions
- **Model:** Sonnet → Opus (escalate to Opus for T2)

**3. Castlereagh (Operations)**
- **What:** Monitoring, health checks, routine tasks
- **When:** Status queries, log inspection, config updates
- **Model:** Haiku (fast, cheap, good enough for ops)

**Design principle:** Route by **responsibility** (what kind of thinking), not subject matter.

### Agent Communication

**Agents propose, Vienna executes:**

```javascript
// Agent generates proposal
const proposal = await agent.propose({
  action: 'restart_service',
  reasoning: 'Service unhealthy for 10 minutes, restart recommended'
});

// Vienna validates + executes
const result = await vienna.execute(proposal);
```

**Agents NEVER have direct execution authority.** All side effects go through Vienna Core.

---

## Execution Pipeline

### Full Pipeline

```
User/Agent Intent
      ↓
┌─────────────────┐
│ Intent Gateway  │ → Schema validation, source verification
└─────────────────┘
      ↓
┌─────────────────┐
│ Quota Check     │ → Tenant has quota remaining?
└─────────────────┘
      ↓
┌─────────────────┐
│ Policy Engine   │ → Governance rules (block/approve/notify)
└─────────────────┘
      ↓
┌─────────────────┐
│ Warrant System  │ → Generate authorization + reasoning
└─────────────────┘
      ↓
┌─────────────────┐
│ Approval Flow   │ → T0: auto, T1: operator, T2: multi-party
└─────────────────┘
      ↓
┌─────────────────┐
│ Executor        │ → Deterministic execution + rollback on failure
└─────────────────┘
      ↓
┌─────────────────┐
│ Attestation     │ → Cryptographic proof of execution
└─────────────────┘
      ↓
┌─────────────────┐
│ Cost Ledger     │ → Record execution cost (AI API calls)
└─────────────────┘
      ↓
┌─────────────────┐
│ Audit Trail     │ → Immutable log (regulator-friendly)
└─────────────────┘
```

### Bypass Prevention

**No component can bypass the pipeline:**
- Agents cannot call adapters directly (no `require('fs')`, no `exec()`)
- Adapters only accept warranted actions
- Vienna Core validates every step

**Enforcement:**
- Capability restriction (agents run in sandbox with limited tool set)
- Authorization check (warrant required for T1/T2)
- Execution mediation (only executor can call adapters)

---

## State Management

### State Graph Architecture

**Design:** Single source of truth for all Vienna OS state

**Isolation:** Multi-tenant with tenant_id scoping

**Concurrency:** SQLite WAL mode (write-ahead logging)

**Persistence:** Optional PostgreSQL for multi-instance deployments

### State Reconciliation

**Problem:** Agent state can drift from reality (cache staleness, concurrent modifications)

**Vienna OS solution:**
- Reconciliation loop (check reality every N minutes)
- Confidence decay (older state = lower confidence)
- Explicit refresh (agent can request state refresh)

### Truth Freshness

**Warrants include truth freshness:**

```json
{
  "warrant_id": "warrant_abc123",
  "preconditions": [
    {
      "condition": "service_exists:api",
      "verified_at": "2026-03-26T15:00:00Z",
      "confidence": 0.95
    }
  ]
}
```

**Expiration:** If preconditions verified >5 minutes ago, executor re-checks before execution.

---

## Security Model

### Threat Model

**Assumptions:**
1. Agents are LLM-based (prompt-following, not adversarial code)
2. Operators are trusted (but make mistakes)
3. Network is untrusted (TLS required)
4. State Graph database is trusted (local or encrypted RDS)

**Out of scope (for now):**
- Arbitrary code execution by agents (future: VM2 sandbox)
- Malicious operators (future: audit + anomaly detection)
- Database compromise (future: encrypted fields)

### Enforcement Layers

**Layer 1: Capability Restriction**
- Agents receive limited tool set (no `exec`, no `write`, no `edit`)
- Only Vienna Core has system access

**Layer 2: Authorization Check**
- T1/T2 actions require valid warrant
- Warrant signature validation (prevent forgery)

**Layer 3: Execution Mediation**
- Only executor can invoke adapters
- Adapters verify warrant before execution

**Layer 4: Audit Trail**
- Every action logged (who, what, when, why)
- Immutable append-only log

### Emergency Override

**Scope:** Trading guard preflight checks only (not warrant system)

**Governance:** Vienna + Metternich + Max approval required

**Time limit:** Max 60 minutes, auto-expiration

**Audit:** Full trail + 24hr post-review

**See:** `VIENNA_WARRANT_POLICY.md` for complete procedures

---

## Performance

### Latency Budget

**Target: p99 <500ms for T0 actions**

| Component | Latency (p50) | Latency (p99) |
|-----------|---------------|---------------|
| Intent Gateway | 10ms | 50ms |
| Policy Engine | 5ms | 20ms |
| Warrant System (T0) | 50ms | 200ms |
| Executor | 100ms | 300ms |
| State Graph | 5ms | 20ms |
| **Total (T0)** | **170ms** | **590ms** |

**T1/T2 actions:** Human approval latency dominates (seconds to minutes)

### Scalability

**Single-instance (NUC + Neon):** 500-1K req/sec  
**Multi-instance (Postgres):** 1K-10K req/sec  
**Multi-region:** 10K+ req/sec

**Current deployment:**
- **Hardware:** NUC (maxlawai) 
- **Database:** Neon Postgres (cloud-managed)
- **Tunnel:** Cloudflare Tunnel (low-latency proxy)

**Bottlenecks:**
1. AI API calls (Anthropic rate limits: 5K req/min)
2. Database writes (warrant generation)
3. Adapter latency (external API calls)

**Optimizations:**
- Warrant caching (reuse for identical intents)
- Policy caching (evaluate rules in-memory)
- Async execution (return warrant_id immediately, execute in background)

---

## Next Steps

**Deep dives:**
- [Warrant Policy](./WARRANT_POLICY.md) — Detailed warrant specifications
- [Agent Protocols](./AGENT_PROTOCOLS.md) — How agents communicate with Vienna
- [Adapter Development](./ADAPTER_DEVELOPMENT.md) — Build custom integrations
- [Production Deployment](./DEPLOYMENT.md) — Deploy to Fly.io/AWS/GCP

**Examples:**
- [Regulatory Monitor](../examples/regulatory-monitor/) — Compliance automation
- [Trading Agent](../examples/trading-agent/) — High-stakes execution
- [Legal Research](../examples/legal-research/) — Evidence-based reasoning

---

**Last Updated:** 2026-03-26  
**Version:** 8.0.0
