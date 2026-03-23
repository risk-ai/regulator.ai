# Vienna OS — Comprehensive Overview

**Last Updated:** 2026-03-12  
**Purpose:** Complete context for new sessions to prevent scope drift  
**Status:** Phase 8.4 complete, Phase 8.5 ready to begin

---

## What is Vienna OS?

Vienna OS is a **governed AI operating system layer** built above OpenClaw. It enforces architectural boundaries so that AI agents cannot execute system commands directly—all actions must pass through Vienna's governed execution layer with operator approval.

**Core Rule:**
```
AI explains
Runtime executes
Operator approves
```

**Not:** A conversational assistant  
**Is:** A governance control plane with persistent memory and execution boundaries

---

## Fault-Management Architecture

Vienna applies fault-management principles from high-assurance systems to autonomous remediation: **detection is not authority, execution is bounded by governance, safe mode overrides autonomy, and every action is reconstructable after the fact.**

**Four core invariants:**

- **Command ≠ Execution** — Intent does not grant permission; governance evaluates admissibility
- **Detection ≠ Permission** — Observing drift does not authorize action; admission control decides
- **Safe Mode = Control State** — Operator override is a privileged control state, not an ad hoc flag
- **Reconstruction = Core Capability** — Every action preserves forensic evidence for post-event investigation

This architecture parallels spacecraft fault-protection systems: Vienna distinguishes between detecting anomalies, authorizing responses, executing bounded actions, and validating outcomes. Operators retain ultimate authority through safe mode and approval workflows.

---

## Architecture Overview

```
Operator
  ↓
Vienna OS (orchestrator + governance + memory)
  ↓
Vienna Runtime
  ├── State Graph (persistent memory)
  ├── Endpoint Manager (local + OpenClaw endpoints)
  ├── Chat Action Bridge (operator chat → local actions)
  ├── OpenClaw Bridge (structured remote instructions)
  ├── Executor (governed execution)
  ├── Provider Routing (Anthropic + Ollama fallback)
  ├── Recovery Copilot
  └── Workflow Engine
  ↓
Execution Backends / Endpoints
  ├── Local Executor
  └── OpenClaw Endpoint
        └── OpenClaw Vienna Agent
  ↓
Providers (Anthropic, Ollama)
  ↓
Governed Execution Pipeline
  Intent → Plan → Policy → Warrant → Execution → Verification → Outcome → Ledger
  ├── Warrant System (T0/T1/T2 authorization)
  ├── Policy Engine (constraint-based governance)
  ├── Trading Guard (trading safety enforcement)
  ├── Verification Engine (post-execution validation)
  └── Audit Trail (immutable ledger)
  ↓
System (services, cron jobs)
```

---

## The Diplomatic Trio — Agent Architecture

Vienna operates through **responsibility-based agents** (not subject-based):

### 🏛 Vienna (Orchestrator)
- **Role:** User-facing coordinator, execution orchestrator
- **Model:** Sonnet (default), Haiku (fast-path), Opus (T2 legal/governance)
- **Responsibilities:**
  - Route work by responsibility domain
  - Execute via governed pathways
  - Synthesize final responses
  - Maintain trading safety
  - Enforce cost discipline

### 🧠 Talleyrand (Strategy & Planning)
- **Model:** Sonnet (no override)
- **Responsibilities:**
  - Strategic planning
  - Multi-step coordination
  - Architecture design
  - Implementation roadmaps
  - Phase planning
- **When to delegate:** Planning/coordination needed, multi-step workflows, architecture decisions

### ⚖️ Metternich (Risk & Governance)
- **Model:** Sonnet OR Opus (T2 only)
- **Responsibilities:**
  - Risk assessment
  - Governance validation
  - T2 approval (required for trading-critical/irreversible changes)
  - Compliance review
  - Audit oversight
- **When to delegate:** T2 decisions, risk assessment, adversarial review, legal doctrine

### ⚙️ Castlereagh (Operations & Reliability)
- **Model:** Haiku (no override)
- **Responsibilities:**
  - Health monitoring
  - Service status checks
  - Log inspection
  - Routine operations
  - Fast-path execution
- **When to delegate:** Health checks, status queries, log inspection, monitoring

### 🔍 Hardenberg (Truth Reconciliation)
- **Model:** Haiku → Sonnet (escalate on high ambiguity)
- **Responsibilities:**
  - Source-of-truth resolution
  - State reconciliation
  - Conflict resolution
  - Ambiguity detection
- **When to delegate:** Conflicting state, ambiguous truth, source verification

### 🔬 Alexander (Learning & Pattern Detection)
- **Model:** Haiku → Sonnet (escalate on complex synthesis)
- **Responsibilities:**
  - Incident analysis
  - Pattern detection
  - System improvement recommendations
  - Learning from corrections
- **When to delegate:** Post-incident analysis, pattern detection (NOT after every task)

**Design Principle:** Route by **responsibility** (what kind of thinking), not subject matter.

**Subject domains** (legal, markets, systems) are handled through `playbooks/`, NOT separate agents.

---

## Phase Progression

### Phase 5 — Runtime Foundation ✅ COMPLETE
- Provider routing (Anthropic + Ollama fallback)
- Runtime isolation (prod/test separation at `~/.openclaw/runtime/{prod|test}/`)
- Replay log rotation
- Dashboard operational
- Queue and DLQ infrastructure

### Phase 6 — Observability & Hardening ✅ COMPLETE
- System hardening
- Recovery Copilot
- Command approval UI
- Audit trail
- Multi-step workflows
- Model control layer

### Phase 7.1 — State Graph Foundation ✅ COMPLETE (2026-03-12)
- **What:** Persistent memory layer (SQLite-backed State Graph)
- **Where:** `~/.openclaw/runtime/{prod|test}/state/state-graph.db`
- **Tracks:** Services, providers, incidents, objectives, runtime_context, endpoints, endpoint_instructions, state_transitions
- **Environment-aware:** Respects `VIENNA_ENV` (default: prod)
- **Test coverage:** 78/78 passing (100%)
- **Status:** Production-ready, 8 tables operational

### Phase 7.2 — Runtime Writers (DEFERRED)
- **Goal:** Connect core runtime events to State Graph
- **Scope:** Service status, provider health, runtime mode, incidents, objectives
- **Constraint:** Runtime-owned writes only, no broad agent access
- **Status:** Deferred pending operational need

### Phase 7.3 — State-Aware Reads (DEFERRED)
- Make Vienna read State Graph for diagnostics, status, recovery
- **Status:** Deferred pending Phase 7.2

### Phase 7.4 — Operational Safety ✅ COMPLETE
- Kill switch + pause persistence
- Rate limiting + agent budgets
- Dead letter queue
- Health monitor + integrity checker

### Phase 7.5 — OpenClaw Endpoint Integration ✅ COMPLETE (2026-03-12)
- **What:** Transform OpenClaw into governed execution endpoint
- **Components:** EndpointManager, ChatActionBridge, OpenClawBridge, InstructionQueue, ViennaInstructionHandler
- **Capabilities:** Full end-to-end remote dispatch operational
- **Governance:** No bypass paths, unified risk tiers across local + remote lanes
- **Schema:** endpoints + endpoint_instructions tables added to State Graph
- **Status:** 100% complete, production-ready
- **Test coverage:** All critical paths validated
- **File-based queue:** Bidirectional messaging operational
- **Supported instructions:** 8 local actions, 7 remote instructions (4 T0, 3 T1)

---

## Phase 7 Summary ✅ COMPLETE

**Delivered:**
- Persistent memory layer (State Graph)
- Operator chat actions (local execution)
- OpenClaw endpoint integration (remote dispatch)
- File-based instruction queue
- Instruction handler + background processor
- 8 tables in State Graph
- 15 total actions/instructions
- Unified governance across all execution lanes

**Status:** Phase 7 objectives met. Vienna OS has persistent memory and unified action system.

---

## Phase 8 — Governance Execution Pipeline ✅ COMPLETE (2026-03-12)

**Architecture delivered:**
```
Intent → Plan → Policy → Warrant → Execution → Verification → Outcome → Ledger
```

### Phase 8.1 — Plan Object ✅ COMPLETE
- Plan schema (workflow with steps, preconditions, postconditions)
- Plan generator (Intent → Plan transformation)
- State Graph plans table
- End-to-end Intent → Plan → Execution pipeline
- **Test coverage:** 16/16 (100%)

### Phase 8.2 — Verification Layer ✅ COMPLETE
- Verification schema (VerificationTask, VerificationResult, WorkflowOutcome)
- Verification engine with independent check handlers
- 7 reusable verification templates
- State Graph verifications + workflow_outcomes tables
- Three-layer separation (Execution / Verification / Outcome)
- **Test coverage:** 41/41 (100%)

### Phase 8.3 — Execution Ledger ✅ COMPLETE
- Forensic execution record (append-only events + derived summary)
- State Graph execution_ledger_events + execution_ledger_summary tables
- 15 event types (intent → plan → policy → approval → execution → verification → outcome)
- Query API (by objective, risk_tier, status, target_id, time range)
- Rebuild capability (immutable events → derived summary)
- **Test coverage:** 20/20 (100%)

### Phase 8.4 — Policy Engine ✅ COMPLETE
- Policy schema (constraints as trigger conditions, not validation rules)
- Constraint evaluation engine
- 10 constraint types (time_window, service_status, rate_limit, cooldown, etc.)
- Policy evaluation before execution
- Policy decisions recorded in ledger
- State Graph policies + policy_decisions tables
- **Test coverage:** 32/32 (100%)

**Phase 8 Summary:**
- State Graph: 13 tables operational
- Complete governance spine operational
- 109/109 tests passing across all Phase 8 components
- Production-ready execution-governance architecture

---

## Phase 8.5 — Multi-Step Plan Execution (NEXT)

**Status:** Ready to begin  
**Goal:** Move from single-action workflows to governed multi-step execution graphs

**Core invariant:**
> Each plan step is independently governable, observable, and ledgered, while the plan as a whole remains the policy-approved execution unit.

**Planned components:**
- Plan step schema (dependencies, conditions, retry policies, per-step verification)
- Plan execution engine (dependency resolution, step scheduling, branching, retries)
- Step-level ledger events (plan_step_started, plan_step_completed, etc.)
- Plan execution state tracking (pending, ready, running, completed, failed, skipped, blocked)

**First target workflow:** Gateway recovery (check_health → restart_service → verify_health → escalate_incident)

**After 8.5:**
- Phase 9 — Objective Orchestration
- Phase 10 — Operator Control Plane UI
- Phase 11 — Distributed / Identity / Tenancy

---

## State Graph — Persistent Memory

**Location:** `~/.openclaw/runtime/{prod|test}/state/state-graph.db`

**Schema (15 tables, 100% operational):**
1. **services** — system services (status, health, dependencies)
2. **providers** — LLM providers (Anthropic, Ollama, credentials, rate limits)
3. **incidents** — failures, resolutions, patterns
4. **objectives** — tasks, milestones, projects
5. **runtime_context** — operational flags, configuration
6. **endpoints** — execution endpoints (local, OpenClaw)
7. **endpoint_instructions** — instruction dispatch history (T0/T1/T2 tracked)
8. **state_transitions** — audit trail of state changes
9. **plans** — workflow plans (steps, preconditions, postconditions)
10. **verifications** — post-execution validation results
11. **workflow_outcomes** — final workflow outcomes (execution + verification)
12. **execution_ledger_events** — immutable lifecycle events (append-only)
13. **execution_ledger_summary** — derived execution summaries (rebuildable)
14. **policies** — governance policies (constraints, triggers, actions)
15. **policy_decisions** — policy evaluation history

**Current usage:**
- Endpoints: 2 registered (local, openclaw)
- Instruction types: 15 total (8 local, 7 remote)
- Environment isolation: prod/test separation enforced
- Full execution pipeline: Intent → Plan → Policy → Warrant → Execute → Verify → Ledger

**Access Patterns:**

**Direct reads (no warrant):**
```javascript
const { getStateGraph } = require('./lib/state/state-graph');
const stateGraph = getStateGraph();
await stateGraph.initialize();

const services = stateGraph.listServices({ status: 'degraded' });
const service = stateGraph.getService('openclaw-gateway');
```

**CLI query:**
```bash
node scripts/query-state-graph.js services
node scripts/query-state-graph.js incidents --status=open
VIENNA_ENV=test node scripts/query-state-graph.js services
```

**Governed writes (via executor, optional):**
```javascript
const { StateGraphAdapter } = require('./lib/execution/adapters/state-graph-adapter');
const adapter = new StateGraphAdapter();

const action = {
  action_type: 'update',
  entity_type: 'service',
  entity_id: 'openclaw-gateway',
  updates: { status: 'degraded' }
};

const warrant = { issued_by: 'castlereagh' };
const result = await adapter.execute(action, warrant);
```

**Bootstrap:**
```bash
node scripts/bootstrap-state-graph.js
# Seeds: 5 services, 2 providers, 3 runtime flags, 2 objectives
```

---

## Governance Model

### Risk Tiers

**T0 (reversible, low-stakes):**
- Read operations
- Status checks
- Log inspection
- No warrant required

**T1 (moderate stakes):**
- File writes
- Config edits
- Service restarts (non-trading)
- **Warrant required**

**T2 (irreversible, high-stakes):**
- Trading configuration
- Service restarts (trading-critical: kalshi-cron, kalshi-api, nba-data-feed)
- Trading flags (autonomous_window_active, trading_enabled, risk_kill_switch)
- Legal/compliance decisions
- **Warrant + Metternich approval REQUIRED**

### Warrant System

**Location:** `vienna-core/lib/governance/warrant.js`

**Flow:**
```
Action → Risk Tier Classification → Warrant Issuance → Executor Validation → Execute
```

**T1/T2 actions must have valid warrant binding:**
- Truth snapshot (source-of-truth at time of planning)
- Plan ID (what's being executed)
- Approval (who authorized it)

### Trading Guard

**Location:** `vienna-core/lib/governance/trading-guard.js`

**Protection:** Blocks trading-critical changes during autonomous window

**Trading-critical services:**
- kalshi-cron
- kalshi-api
- nba-data-feed

**Trading flags:**
- autonomous_window_active
- trading_enabled
- risk_kill_switch

**Enforcement:** Architectural (executor preflight checks), not behavioral

---

## Execution Boundaries (Phase 7.2 Architecture)

**Agents are reasoning components:**
- LLM-based proposal generation (text output only)
- Read-only system access (can query State Graph, read logs)
- Structured envelope proposals
- **NO direct tool execution** (no `exec()`, `write()`, `edit()`)

**Vienna executes via:**
```
Agent → Envelope → Vienna Core → Validator → Executor → Adapter → System
```

**Enforcement:**
1. **Capability** — Agents receive restricted tool set
2. **Authorization** — Executor requires valid warrant for T1/T2
3. **Mediation** — All execution through deterministic executor
4. **Privilege** — Only adapters have `require('fs')` / `require('child_process')`

**No bypass path exists.**

---

## File Structure

**Workspace:** `/home/maxlawai/.openclaw/workspace`

### Core Context Files
```
AGENTS.md              — Vienna + agent definitions, routing policy
SOUL.md                — Vienna persona (disciplined authority, strategic composure)
USER.md                — Max Anderson profile
TOOLS.md               — Tool registry
IDENTITY.md            — Vienna operator identity
MEMORY.md              — Promoted learnings, corrections
```

### Vienna Runtime State
```
VIENNA_RUNTIME_STATE.md      — System status, mission, architecture
VIENNA_DAILY_STATE_LOG.md    — Daily work summary
VIENNA_WARRANT_POLICY.md     — Transactional execution control
```

### Vienna Core (Governance Engine)
```
vienna-core/
├── lib/
│   ├── governance/
│   │   ├── warrant.js              — Warrant lifecycle
│   │   ├── risk-tier.js            — T0/T1/T2 classification
│   │   └── trading-guard.js        — Trading safety
│   ├── execution/
│   │   ├── executor.js             — Deterministic execution
│   │   └── adapters/
│   │       ├── state-graph-adapter.js  — State Graph writes
│   │       └── ...                 — File, service, exec adapters
│   └── state/
│       ├── state-graph.js          — State Graph core API
│       ├── schema.sql              — Database schema
│       └── README.md               — Usage guide
├── scripts/
│   ├── bootstrap-state-graph.js   — Seed initial state
│   ├── query-state-graph.js       — CLI query tool
│   ├── issue-warrant-core.js      — Warrant issuance
│   └── verify-warrant-core.js     — Warrant verification
└── tests/
    ├── state-graph.test.js                — Schema + CRUD (25 tests)
    ├── state-graph-adapter.test.js        — Executor integration (20 tests)
    ├── state-graph-governance.test.js     — Phase 6-style validation (21 tests)
    └── state-graph-environment.test.js    — Prod/test isolation (12 tests)
```

### Subagents
```
subagents/
├── talleyrand/AGENT.md    — Strategy + planning
├── metternich/AGENT.md    — Risk + governance
├── castlereagh/AGENT.md   — Operations + reliability
├── hardenberg/AGENT.md    — Truth reconciliation
├── alexander/AGENT.md     — Learning + pattern detection
└── ROUTING.md             — Delegation policy
```

### Playbooks (Subject Domains)
```
playbooks/
├── legal/          — Legal research workflows
├── markets/        — Trading/strategy workflows
└── systems/        — Infrastructure ops workflows
```

### Runtime State (Environment-Aware)
```
~/.openclaw/runtime/
├── prod/
│   ├── state/
│   │   └── state-graph.db         — Production State Graph
│   ├── queue/                     — Execution queue
│   ├── dlq/                       — Dead letter queue
│   └── replay/                    — Replay logs
└── test/
    ├── state/
    │   └── state-graph.db         — Test State Graph
    └── ...
```

---

## Operational Patterns

### Session Startup

**Vienna reads on new session:**
1. `VIENNA_RUNTIME_STATE.md` (primary system state)
2. `VIENNA_DAILY_STATE_LOG.md` (daily work summary)
3. Summarize Vienna OS status as primary context
4. Include secondary project status only if explicitly highest priority

**Preferred startup framing:**
```
Vienna operational. Phase 6 complete. Runtime isolation and log rotation active. 
Provider routing available with local fallback. Next priority: Phase 7.2 Runtime Writers.
```

### Delegation Rules

**Max depth:** 1 (Vienna → Subagent only)

**Use:** `scripts/delegate-with-validation.js` or `sessions_spawn(runtime="subagent")`

**Pass compressed context:**
- Task summary
- Risk tier
- Constraints
- Expected output schema
- NOT full transcripts

**Structured outputs required:**
- Hardenberg: `authoritative_sources`, `current_best_truth`, `confidence`
- Alexander: `observed_pattern`, `recommended_changes`, `priority`
- Metternich: `approved`, `risks`, `conditions`
- Talleyrand: `plan`, `assumptions`, `next_step`
- Castlereagh: `actions_taken`, `results`, `artifacts`

### Model Policy (HARD enforcement)

**Haiku** (`haiku`) — $0.30/M input:
- Castlereagh (required, no override)
- Hardenberg (default)
- Alexander (default)
- Log inspection, status checks, config edits

**Sonnet** (default) — $3/M input:
- Vienna (default)
- Talleyrand (required, no override)
- Metternich (default)
- Architecture, orchestration, synthesis

**Opus** (`opus`) — $15/M input:
- Metternich (T2 only)
- Legal doctrine, adversarial review
- Confidence <60% on high-stakes work

**NEVER:**
- Haiku for trading config, legal doctrine, gate logic
- Sonnet bypass for Castlereagh work
- Full-chain routing on T0 tasks

### Cost Discipline

**Target distribution:**
- 70-80%: Vienna or Vienna→Castlereagh
- 10-20%: +Hardenberg or +Alexander
- 5-10%: Full T1/T2 chains
- <2%: Opus escalation

**Warning signs:**
- Sonnet for Castlereagh work
- Full-chain on T0 tasks
- Alexander after every task
- Giant contexts to subagents
- Repeated re-verification of unchanged state

### Session Rotation (HARD)

**Rotate when ANY trigger:**
- 30 messages
- 60 minutes
- 150K tokens
- 15 tool calls

**On cap:** Stop immediately, return `CAP HIT: rotate now`. Do NOT attempt internal reset.

---

## Current Priorities

### Phase 7 Complete

**All Phase 7 objectives delivered:**
- ✅ State Graph Foundation (7.1)
- ✅ Operational Safety (7.4)
- ✅ OpenClaw Endpoint Integration (7.5)
- ⚠️ Runtime Writers (7.2) — Deferred pending operational need
- ⚠️ State-Aware Reads (7.3) — Deferred pending operational need

### Phase 8 Planning

**Status:** Ready to begin  
**Next step:** Define Phase 8 scope and objectives based on operational priorities

**Candidate initiatives:**
- Autonomous incident detection and response
- Advanced pattern recognition (Alexander integration)
- Multi-step workflow automation
- Trading system operational enhancements
- Dashboard UI polish (operator chat integration)
- Memory-aware reasoning (State Graph-driven context)

### Deferred / Optional

- Runtime event writers (Phase 7.2) — Can activate when needed
- State-aware diagnostics (Phase 7.3) — Can activate when needed
- Broad agent State Graph integration — Pending governance model finalization
- Dashboard State Graph viewer — Pending UI priorities

---

## Trading Protection (Background Project)

**Status:** NBA Kalshi v1 live trading exists as autonomous background project

**⚠️ Before ANY trading-related actions:**
1. Check `VIENNA_RUNTIME_STATE.md` for autonomous window status
2. Check cron status (`crontab -l | grep clv`)
3. Verify no blockers

**Escalate ONLY on blockers:**
- API failure
- Cron failure
- Risk limits breached
- Data corruption

**If autonomous + no blocker:** Continue automatically, do NOT ask approval.

**Trading is NOT Vienna's primary context** unless explicitly requested by operator.

---

## Common Mistakes to Avoid

1. ❌ **Anchoring startup on NBA v1** — Vienna OS is primary context
2. ❌ **Routing by subject instead of responsibility** — Use agents by thinking type, not topic
3. ❌ **Using Sonnet for Castlereagh work** — Haiku required (HARD rule)
4. ❌ **Over-delegating on T0 tasks** — Fast-path when routing overhead > execution cost
5. ❌ **Using old storage paths** — State Graph is at `~/.openclaw/runtime/{prod|test}/state/`
6. ❌ **Ignoring VIENNA_ENV** — Prod and test are isolated, respect environment
7. ❌ **Bypassing warrant system for T1/T2** — Governance is architectural, not optional
8. ❌ **Progress narration** — Silent execution default, batch operations
9. ❌ **Full transcripts to subagents** — Compressed context only

---

## Quick Reference Commands

### State Graph
```bash
# Bootstrap
node scripts/bootstrap-state-graph.js

# Query
node scripts/query-state-graph.js services
node scripts/query-state-graph.js incidents --status=open

# Test environment
VIENNA_ENV=test node scripts/query-state-graph.js services
```

### Health Checks
```bash
# OpenClaw status
openclaw status

# Gateway status
systemctl --user status openclaw-gateway

# Tailscale status (required dependency)
tailscale status

# Cron jobs (if relevant)
crontab -l | grep clv
```

### Tests
```bash
cd vienna-core

# All State Graph tests
npm test -- tests/state-graph*.test.js

# Environment isolation
npm test -- tests/state-graph-environment.test.js

# Full test suite
npm test
```

---

## Key Recovery Paths

### OpenClaw Not Responding

1. Check Tailscale FIRST: `tailscale status`
2. If expired: `tailscale logout && tailscale up`
3. Check gateway: `systemctl --user status openclaw-gateway`
4. If failed: `systemctl --user restart openclaw-gateway`
5. Full runbook: `runbooks/openclaw-recovery.md`

### State Graph Issues

1. Check environment: `echo $VIENNA_ENV` (should be unset or 'prod')
2. Check database exists: `ls -lh ~/.openclaw/runtime/prod/state/state-graph.db`
3. Query health: `node scripts/query-state-graph.js services`
4. Rollback: Delete database, falls back to flat files

### Test Pollution

1. Verify environment separation: `VIENNA_ENV=test npm test`
2. Clean test state: `rm -rf ~/.openclaw/runtime/test/`
3. Never run tests without `VIENNA_ENV=test` if they write state

---

## Persona & Communication

**Vienna is disciplined authority:**
- Composed, deliberate, precise
- Strategically minded, disciplined
- Quietly authoritative
- Under pressure: more structured, not louder

**Communication style:**
- Concise, structured, confident
- Avoid: hype, excitement, drama, excessive explanation
- Sound like strategic operator, not conversational assistant

**Priorities:**
```
stability > speed
clarity > verbosity
structure > improvisation
correctness > momentum
```

---

## Documentation References

**OpenClaw:** `~/.npm-global/lib/node_modules/openclaw/docs/`  
**Vienna Core:** `vienna-core/lib/state/README.md`  
**Phase Reports:** `PHASE_*.md` in workspace  
**Recovery:** `runbooks/openclaw-recovery.md`  
**Skills:** `~/.npm-global/lib/node_modules/openclaw/skills/`

---

## Version History

- **2026-01-15:** Vienna OS conception
- **2026-03-10:** Fenrir → Vienna rename, agent architecture established
- **2026-03-11:** Phase 7.1.0 (warrant extraction), Phase 7.2 (executor boundary), Phase 7.4 (operational safety)
- **2026-03-12:** Phase 7.1 State Graph Foundation + 7.1a alignment corrections
- **2026-03-12:** Phase 7.2 Runtime Writers planning initiated

---

**This document provides complete context for new sessions. Read this FIRST to prevent scope drift.**

**Current status:** Phase 7.1 complete, Phase 7.2 in planning  
**Next milestone:** Runtime event integration to State Graph  
**Primary context:** Vienna OS governance layer, NOT legacy project automation
