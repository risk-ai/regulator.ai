# Vienna OS — Canonical Glossary

**Last Updated:** 2026-03-12 21:14 EDT

This glossary defines the authoritative names for Vienna OS components. Use these terms consistently across documentation, UI copy, and code comments.

---

## Core Components

### Vienna OS
**The full governed control plane.**

Includes:
- Dashboard (operator interface)
- API (control plane endpoints)
- Vienna Core (runtime/governance)
- State Graph (persistent memory)
- Endpoint management (local + OpenClaw)

**Vienna OS is the system.** It is not an agent.

---

### Conductor
**The orchestrator intelligence.**

Responsibilities:
- Interprets operator intent
- Routes work to specialized agents (Talleyrand, Metternich, Castlereagh, Hardenberg, Alexander)
- User-facing interface (Telegram, web chat, Slack)
- **Proposes actions, never executes directly**

**Conductor is the mind.** It reasons and delegates.

**Previously called:** "Vienna" (the orchestrator agent)

**Code identifiers:** May still reference "vienna" or "main" agent internally—this is acceptable for now. Conceptual clarity comes from documentation.

---

### Vienna Core
**The runtime/governance engine.**

Components:
- Warrant system (bind truth/plan/approval)
- Risk tier classification (T0/T1/T2)
- Executor + adapters (execution boundary)
- Trading guard (protect trading-critical services)
- State Graph (persistent memory layer)
- Endpoint management (local + OpenClaw endpoints)
- Audit trail

**Vienna Core is the enforcement layer.** It validates governance and dispatches execution.

**Package/folder:** `vienna-core` (unchanged for now)

---

### Executor Agent
**The OpenClaw-side execution worker.**

Responsibilities:
- Receives structured instruction envelopes from Vienna OS
- Processes instructions via `ViennaInstructionHandler`
- Executes via OpenClaw context (has tool access)
- Returns results via instruction queue
- Background processor polls for new instructions

**Executor Agent is the worker.** It performs the actual execution.

**Previously called:** "Vienna in OpenClaw" or "OpenClaw Vienna agent"

**Code identifiers:** `vienna-instruction-handler.js`, `vienna-instruction-processor.js` (unchanged for now)

---

## Agent Architecture

**Conductor** routes work to specialized agents by **responsibility**:

### 🧠 Talleyrand
- **Responsibility:** Strategy, planning, coordination
- **Model:** Sonnet
- **When:** Multi-step planning, architecture design, cross-module coordination

### ⚖️ Metternich
- **Responsibility:** Risk assessment, governance validation, T2 approval
- **Model:** Sonnet → Opus (T2 only)
- **When:** T2 decisions, risk assessment, adversarial review, compliance validation

### ⚙️ Castlereagh
- **Responsibility:** Operations, monitoring, health checks
- **Model:** Haiku (HARD)
- **When:** Service status, health monitoring, log inspection, routine ops

### 🔍 Hardenberg
- **Responsibility:** Truth reconciliation, source-of-truth resolution
- **Model:** Haiku → Sonnet (escalate on high ambiguity)
- **When:** Conflicting state, ambiguous truth, state drift detection

### 🔬 Alexander
- **Responsibility:** Learning, pattern detection, system improvement
- **Model:** Haiku → Sonnet (escalate on complex synthesis)
- **When:** Post-incident analysis, pattern detection, architectural improvements

**Note:** Subject domains (legal, markets, systems) live in `playbooks/`, not as separate agents.

---

## Execution Flow

```
Operator (dashboard, Telegram, Slack)
  ↓
Conductor (interprets intent, proposes action)
  ↓
Vienna Core (validates governance, issues warrant if T1/T2)
  ↓
  ├─ Local Executor (for local actions)
  └─ Executor Agent (for OpenClaw actions)
      ↓
    OpenClaw context (tool access, system calls)
      ↓
    Result → Queue → Vienna Core → Conductor → Operator
```

**Key principle:**
- **Conductor** proposes
- **Vienna Core** validates and dispatches
- **Executor Agent** performs
- **Vienna OS** is the whole system

---

## Governance Layers

### 1. Risk Tier Classification
- **T0**: Read-only, reversible (execute immediately)
- **T1**: Side-effecting, moderate risk (requires warrant)
- **T2**: Irreversible, high-risk (requires warrant + approval)

### 2. Warrant System
For T1/T2, execution must bind to valid warrant:
- Truth snapshot (state at planning time)
- Plan ID (what's being executed)
- Approval (who authorized it, T2 only)
- Expiration (default 15 minutes)

### 3. Executor Boundary
**Agents do NOT execute directly.**

Flow:
```
Agent → Vienna Core → Validator → Executor → Adapter → System
```

Only executor and adapters perform real side effects.

### 4. Trading & Safety Guardrails
Trading-critical services/flags architecturally protected:
- kalshi-cron, kalshi-api, nba-data-feed
- autonomous_window_active, trading_enabled, risk_kill_switch

---

## State Graph (Persistent Memory)

Vienna Core's persistent memory layer (SQLite-backed).

**8 Tables:**
- `services` — Service status, health, dependencies
- `providers` — LLM provider health, credentials, rate limits
- `incidents` — Failures, resolutions, patterns
- `objectives` — Tasks, milestones, projects
- `runtime_context` — Operational flags, configuration
- `endpoints` — Execution endpoints (local, OpenClaw)
- `endpoint_instructions` — Instruction dispatch history
- `state_transitions` — Audit trail of state changes

**Location:** `~/.openclaw/runtime/{prod|test}/state/state-graph.db`

**Environment-aware:** Respects `VIENNA_ENV` (prod/test isolation)

---

## Common Phrases (Correct Usage)

### ✅ Correct
- "Conductor interprets operator intent and routes to Metternich."
- "Vienna Core validates the warrant before execution."
- "Executor Agent receives the instruction and runs the command."
- "Vienna OS is the governed control plane."

### ❌ Avoid
- ~~"Vienna dispatches to Vienna"~~ (ambiguous)
- ~~"The Vienna agent executes the command"~~ (which Vienna?)
- ~~"Vienna validates governance"~~ (which layer?)

### Clarify When Ambiguous
If context is unclear, use full names:
- "Conductor (orchestrator agent)"
- "Vienna Core (runtime layer)"
- "Executor Agent (OpenClaw worker)"

---

## Migration Notes

**Code identifiers may lag documentation:**
- Internal agent names may still reference "vienna" or "main"
- Package folders still named `vienna-core`
- File names may contain "vienna"

**This is acceptable for now.** Conceptual clarity comes from:
- Documentation
- UI copy
- Comments
- Architecture diagrams

**Filesystem/package renaming deferred** until later for stability.

---

## References

**Primary Documentation:**
- `AGENTS.md` — Agent architecture (updated with Conductor)
- `ROUTING.md` — Routing by responsibility (updated)
- `VIENNA_OS_OVERVIEW.md` — System overview (to be updated)
- `VIENNA_RUNTIME_STATE.md` — Runtime state (to be updated)

**Architecture:**
- Vienna OS encompasses all components
- Conductor orchestrates
- Vienna Core governs
- Executor Agent executes

**Governance is architectural, not behavioral.**

---

**Glossary Version:** 1.0  
**Adopted:** 2026-03-12 21:14 EDT  
**Status:** Canonical naming model for all Vienna OS documentation
