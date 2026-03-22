# Vienna Core — Architecture Module Map

**Last Updated:** 2026-03-12 (Post-Phase 8.5 Cleanup)

**Purpose:** Canonical reference for module organization and responsibilities

---

## Directory Structure

```
vienna-core/
├── index.js                   — Runtime entrypoint
├── jest.config.js             — Test configuration
├── lib/                       — Core runtime code
├── tests/                     — Test suites (organized by phase)
├── scripts/                   — Operational scripts
├── docs/                      — Architecture & operations documentation
├── console/                   — Dashboard UI (React frontend + Express backend)
├── playbooks/                 — Operational playbooks
└── archive/                   — Historical artifacts
```

---

## lib/ — Core Runtime (Architecture Layers)

### lib/core/ — Core Services
**Responsibility:** Orchestration, planning, interpretation, execution coordination

**Key modules:**
- `vienna-core.js` — Main Vienna OS runtime coordinator
- `chat-action-bridge.js` — Operator chat → action dispatcher
- `intent-classifier.js` — Natural language → normalized intent
- `plan-generator.js` — Intent → Plan transformation
- `plan-execution-engine.js` — Multi-step plan execution with dependencies
- `endpoint-manager.js` — Execution endpoint registry (local + OpenClaw)
- `openclaw-bridge.js` — OpenClaw remote instruction dispatcher
- `instruction-queue.js` — File-based instruction queue
- `entity-normalization-table.js` — Entity name normalization (gateway → openclaw-gateway)
- `event-emitter.js` — Event bus for runtime coordination
- `workflow-engine.js` — Workflow orchestration
- `recovery-copilot.js` — Recovery workflow automation
- `crash-recovery-manager.js` — Crash recovery and restart logic
- `runtime-modes.js` — Runtime mode management (normal/degraded/local-only/operator-only)
- `runtime-integrity-guard.js` — Runtime integrity monitoring
- `runtime-config.js` — Runtime configuration management
- `startup-validator.js` — Startup validation and health checks
- `structured-logger.js` — Structured logging
- `audit-log.js` — Audit trail logging

### lib/governance/ — Governance Layer
**Responsibility:** Risk classification, warrants, trading safety, policy enforcement

**Key modules:**
- `warrant.js` — Warrant lifecycle (issuance, validation)
- `risk-tier.js` — Risk tier classification (T0/T1/T2)
- `trading-guard.js` — Trading safety enforcement
- `policy-engine.js` — Policy evaluation and enforcement
- `constraint-evaluator.js` — Policy constraint evaluation (10 constraint types)

### lib/execution/ — Execution Layer
**Responsibility:** Deterministic command execution, adapters for system interaction

**Key modules:**
- `executor.js` — Deterministic execution engine
- `adapters/` — System interaction adapters
  - `state-graph-adapter.js` — State Graph write adapter
  - `file-adapter.js` — File system operations
  - `service-adapter.js` — Service management (systemctl)
  - `exec-adapter.js` — Shell command execution

### lib/state/ — State Graph (Persistent Memory)
**Responsibility:** Persistent system memory, SQLite-backed state tracking

**Key modules:**
- `state-graph.js` — State Graph core API (15 tables)
- `schema.sql` — Database schema definition
- `README.md` — State Graph usage guide

**Tables:**
- services, providers, incidents, objectives, runtime_context
- endpoints, endpoint_instructions, state_transitions
- plans, verifications, workflow_outcomes
- execution_ledger_events, execution_ledger_summary
- policies, policy_decisions

### lib/providers/ — Provider Management
**Responsibility:** LLM provider routing, health monitoring, fallback logic

**Key modules:**
- `provider-router.js` — Provider selection and routing
- `anthropic-provider.js` — Anthropic Claude integration
- `ollama-provider.js` — Local Ollama integration
- `provider-health-manager.js` — Provider health monitoring
- `provider-health-bridge.js` — Provider health → State Graph integration

### lib/schemas/ — Canonical Schemas
**Responsibility:** Single source of truth for data structures

**Key schemas:**
- `envelope.js` — Envelope schema (execution wrapper)
- `plan-schema.js` — Plan object schema
- `plan-step-schema.js` — Plan step schema (dependencies, conditions, retries)
- `policy-schema.js` — Policy schema (constraints, triggers)
- `policy-decision-schema.js` — Policy decision schema
- `verification-schema.js` — Verification task/result/outcome schemas

### lib/verification/ (if created)
**Responsibility:** Post-execution verification, independent checks

**Key modules:**
- `verification-engine.js` — Verification orchestration (currently in lib/core/)
- `verification-templates.js` — Reusable verification templates (currently in lib/core/)
- `verification-handlers.js` — Check handlers (systemd, TCP, HTTP, file)

### lib/audit/ — Audit Trail
**Responsibility:** Forensic execution record, compliance trail

**Key modules:**
- `execution-ledger.js` — Execution ledger (events + summary)
- `audit-exporter.js` — Audit trail export

### lib/agent/ — Agent Integration
**Responsibility:** OpenClaw Vienna agent integration, instruction handling

**Key modules:**
- `vienna-instruction-handler.js` — Instruction processor
- `vienna-instruction-processor.js` — Background polling service
- `query-agent.js` — Conversational query handler

### lib/adapters/ — System Adapters
**Responsibility:** Abstraction layer for system interactions

**Modules:** See lib/execution/adapters/ above

### lib/commands/ — Command Handlers
**Responsibility:** Operator command processing

**Modules:** Command-specific handlers

---

## tests/ — Test Suites

**Organization:** Tests organized by phase and category

### tests/phase-5/ — Phase 5 Tests
Runtime foundation, provider routing

### tests/phase-6/ — Phase 6 Tests
Observability, hardening, recovery

### tests/phase-7/ — Phase 7 Tests
State Graph, endpoints, operational safety

### tests/phase-8/ — Phase 8 Tests
Plan layer, verification, ledger, policy engine, multi-step execution

### tests/integration/ — Integration Tests
End-to-end workflow validation

### tests/regression/ — Regression Tests
Canonical behavior preservation

---

## scripts/ — Operational Scripts

**bootstrap-state-graph.js** — Seed initial State Graph data
**query-state-graph.js** — CLI State Graph query tool

---

## docs/ — Documentation

### docs/architecture/
Architecture specifications, schemas, boundaries

**Key documents:**
- `INTERPRETER_BOUNDARY.md` — Intent interpreter boundary specification
- `INTENT_SCHEMA.md` — Intent object schema
- `OPENCLAW_ENDPOINT_ARCHITECTURE.md` — Endpoint system design
- `CHAT_ARCHITECTURE.md` — Chat action architecture
- `OPERATOR_SHELL_ARCHITECTURE.md` — Operator shell design
- `PROVIDER_ARCHITECTURE.md` — Provider routing design
- `DETERMINISTIC_CORE.md` — Deterministic execution principles
- `EXECUTOR_STATE_SEMANTICS.md` — Executor state machine
- `PROVIDER_HEALTH_STATUS.md` — Provider health model
- `Phase_4_Reliability_Stack.md` — Reliability architecture

### docs/operations/
Operational procedures, testing, hardening

**Key documents:**
- `REGRESSION_TEST_SUITE.md` — Canonical regression tests
- `UX_PRINCIPLES.md` — Operator UX principles
- `PRODUCT_DEFINITION.md` — Product definition
- `HARDENING_GUIDE.md` — Security hardening guide
- `API_CONTRACT_EXTENDED.md` — API contracts

---

## console/ — Dashboard UI

**client/** — React frontend
**server/** — Express backend
**scripts/** — Build and deployment scripts
**README.md** — Dashboard documentation

---

## playbooks/ — Operational Playbooks

**dlq-spike.md** — Dead letter queue investigation
**executor-degraded.md** — Executor degradation response
**gateway-disconnected.md** — Gateway connectivity issues
**provider-unavailable.md** — Provider fallback procedures

---

## archive/ — Historical Artifacts

**phase-artifacts/** — Phase completion reports
**experiments/** — Exploratory work, debugging, temporary fixes
**old-tests/** — Deprecated test files
**temp-scripts/** — One-off scripts, demos

---

## Stable Interfaces

### Vienna Core API
**Entrypoint:** `lib/core/vienna-core.js`

**Key methods:**
- `initialize()` — Runtime initialization
- `shutdown()` — Graceful shutdown
- `handleOperatorMessage(message)` — Process operator input

### State Graph API
**Entrypoint:** `lib/state/state-graph.js`

**Key methods:**
- `initialize()` — Open database connection
- `getService(id)` / `listServices(filters)` — Service queries
- `createPlan(planData)` / `updatePlan(id, updates)` — Plan management
- `appendLedgerEvent(event)` — Ledger event recording
- `evaluatePolicy(policyId, context)` — Policy evaluation

### Chat Action Bridge API
**Entrypoint:** `lib/core/chat-action-bridge.js`

**Key methods:**
- `interpretAndExecute(message, context)` — Natural language → execution
- `executeAction(actionType, args)` — Direct action execution

### Endpoint Manager API
**Entrypoint:** `lib/core/endpoint-manager.js`

**Key methods:**
- `registerEndpoint(endpoint)` — Register execution endpoint
- `dispatchInstruction(endpointId, instruction)` — Send instruction
- `getEndpointHealth(endpointId)` — Check endpoint health

---

## Import Conventions

### Schemas
```javascript
const { createPlan } = require('./lib/schemas/plan-schema');
const { createEnvelope } = require('./lib/schemas/envelope');
```

### State Graph
```javascript
const { getStateGraph } = require('./lib/state/state-graph');
const stateGraph = getStateGraph();
await stateGraph.initialize();
```

### Governance
```javascript
const { issueWarrant } = require('./lib/governance/warrant');
const { classifyRiskTier } = require('./lib/governance/risk-tier');
const { checkTradingSafety } = require('./lib/governance/trading-guard');
```

### Execution
```javascript
const { execute } = require('./lib/execution/executor');
const { StateGraphAdapter } = require('./lib/execution/adapters/state-graph-adapter');
```

---

## Module Ownership

### Governance Layer
**Owner:** Metternich (risk, compliance, audit)
**Stability:** HIGH — Warrant system, trading guard are architectural constraints

### Execution Layer
**Owner:** Vienna Core runtime
**Stability:** HIGH — Deterministic execution, adapter boundary are core principles

### State Layer
**Owner:** State Graph
**Stability:** HIGH — Schema changes require migration, backward compatibility

### Interpretation Layer
**Owner:** Chat Action Bridge + Intent Classifier
**Stability:** MEDIUM — Can evolve patterns, but must preserve governance boundary

### Verification Layer
**Owner:** Verification Engine
**Stability:** MEDIUM — Can add new check types, templates

### Policy Layer
**Owner:** Policy Engine
**Stability:** MEDIUM — Can add new constraint types

---

## Deprecation Policy

**Before removing any module:**
1. Check import references (`grep -r "require.*module-name"`)
2. Update all imports or provide compatibility shim
3. Run full test suite
4. Update this module map

**Before changing schemas:**
1. Check all consumers
2. Consider migration path for persisted data
3. Update State Graph schema version if needed
4. Run schema migration tests

---

## Next Architecture Phases

**Phase 9:** Objective Orchestration
- Objective schema and state machine
- Monitoring and evaluation loops
- Remediation trigger paths
- Multi-objective coordination

**Phase 10:** Operator Control Plane UI
- Dashboard integration with State Graph
- Real-time execution visibility
- Approval workflows in UI
- Objective management surface

**Phase 11:** Distributed / Identity / Tenancy
- Multi-instance coordination
- Identity and authorization
- Tenant isolation
- Distributed State Graph

---

**This module map should be updated whenever:**
- New directories are created
- Modules move between directories
- Stable interfaces change
- Architecture layers are added/removed
