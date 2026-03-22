# Phase 6.5 — Recovery Copilot + Provider Fallback

**Status:** Core Components Complete ✓  
**Date:** 2026-03-12  
**Implementation:** Single continuous build pass (not staged weekly)

---

## Objective

Transform Vienna Chat into an **operator recovery copilot** and introduce **provider fallback routing**.

**Gap addressed:** Vienna had observability but not operator assistance. Provider health was informational, not actionable.

---

## Design Constraints (Enforced)

**Non-negotiable rule:**

> No conversational path may produce side effects unless it resolves into an existing governed runtime action.

**Recovery copilot = flight deck assistant, NOT autopilot.**

**Architectural boundary:**
- AI explains
- Runtime executes
- Operator approves

**Recovery copilot can:**
- Explain root causes
- Propose allowed remediations
- Format diagnostic data
- Guide operator through checklists

**Recovery copilot cannot:**
- Execute remediation
- Mutate runtime state
- Bypass governance
- Take autonomous corrective action

---

## Implemented Components

### 1. Provider Capability Registry ✓

**File:** `vienna-core/lib/providers/registry.js`

**Functionality:**
- Provider capability definitions (Anthropic, local, OpenClaw)
- Cost tiers (free, low, medium, premium)
- Fallback chains (Anthropic → local, OpenClaw → local)
- Degraded-mode eligibility flags
- Always-available provider marking (local)

**Example:**
```javascript
const anthropicSpec = getProviderSpec('anthropic');
// { capabilities: ['planning', 'synthesis', ...], costTier: 'premium', fallbackTo: 'local' }

const fallbackChain = getFallbackChain('anthropic');
// ['anthropic', 'local']

const degradedProviders = getDegradedModeProviders();
// [{ id: 'local', ... }, { id: 'openclaw', ... }]
```

**Validation:** ✓ Passed (test-phase-6.5.js Test 1)

---

### 2. Runtime Modes ✓

**File:** `vienna-core/lib/core/runtime-modes.js`

**Modes:**
- `normal` — All providers healthy, full routing
- `degraded` — Some providers unavailable, using fallbacks
- `local-only` — Gateway/remote broken, only local operations allowed
- `operator-only` — All AI unavailable, diagnostics/inspection only

**Transition logic:**
```
Provider health + gateway status → Runtime mode
Automatic transitions logged and emitted as events
Operator can force mode transitions (manual override)
```

**Features:**
- Automatic mode determination based on provider health
- Transition history (last 100 transitions)
- Available capabilities per mode
- Fallback provider tracking

**Validation:** ✓ Passed (test-phase-6.5.js Tests 2-3)

---

### 3. Recovery Copilot ✓

**File:** `vienna-core/lib/core/recovery-copilot.js`

**Supported intents (read-only):**
- `diagnose system` — Explain current degraded state
- `show failures` — Recent provider failures with cooldown info
- `explain blockers` — Why tasks are blocked
- `test provider <name>` — Health check specific provider
- `show mode` — Current runtime mode details
- `show dead letters` — DLQ inspection (stub, awaiting integration)

**Supported intents (proposal-only):**
- `enter local-only` — Propose mode transition (requires operator approval)
- `recovery checklist` — Step-by-step recovery guidance

**Intent parser:**
- Regex-based intent detection
- Parameter extraction (e.g., provider name from "test provider anthropic")
- Unknown command fallback

**Output format:**
- Markdown-formatted diagnostics
- Structured blocker explanations
- Actionable recommendations (proposals only)
- Clear indication when operator approval required

**Validation:** ✓ Passed (test-phase-6.5.js Tests 4-5)

---

### 4. Recovery Playbooks ✓

**Location:** `vienna-core/playbooks/`

**Playbooks created:**
1. `gateway-disconnected.md` — Tailscale/gateway recovery steps
2. `provider-unavailable.md` — Provider-specific diagnostics and recovery
3. `dlq-spike.md` — Dead letter queue analysis and replay guidance
4. `executor-degraded.md` — Executor component diagnostics

**Format:**
- Diagnostic steps (what to check)
- Recovery actions (operator-approved only)
- Escalation criteria (when to escalate)
- Prevention measures

**Use case:** Local LLM can reference playbooks to guide operator through recovery.

**Validation:** ✓ Created, pending runtime integration

---

### 5. ViennaCore Integration ✓

**Updated:** `vienna-core/index.js`

**Additions:**
- `runtimeModeManager` — Runtime mode state management
- `recoveryCopilot` — Recovery intent processing
- `getRuntimeModeState()` — Expose current mode state
- `forceRuntimeMode()` — Operator-controlled mode transition
- `processRecoveryIntent()` — Process recovery chat commands

**Automatic runtime mode updates:**
- Provider health checked every 30 seconds (when ProviderManager active)
- Mode transitions logged and emitted as events
- Structured logger integration

**Validation:** ✓ Core modules integrated (ProviderManager pending TS→JS conversion)

---

## Test Results

**Test file:** `vienna-core/test-phase-6.5.js`

```
Test 1: Provider Capability Registry          ✓
Test 2: Runtime Mode Determination             ✓
Test 3: Runtime Mode Manager                   ✓
Test 4: Recovery Copilot Intent Parsing        ✓
Test 5: Recovery Copilot Diagnostics           ✓
Test 6: Module Integration                     ✓
```

**All core tests passed.**

---

## Phase 6.5 Exit Criteria

| Criterion | Status |
|-----------|--------|
| Provider capability registry implemented | ✓ |
| Runtime mode determination working | ✓ |
| Runtime mode manager operational | ✓ |
| Recovery copilot intent parsing functional | ✓ |
| Recovery copilot diagnostics working | ✓ |
| Module integration verified | ✓ |

**Status:** Core components complete ✓

---

## Remaining Work

### Short-term (Phase 6.5 completion)

1. **Convert ProviderManager from TypeScript to JavaScript**
   - Current: `lib/providers/manager.ts` (10KB TypeScript)
   - Required: Convert to `.js` for CommonJS compatibility
   - Impact: Enables provider health → runtime mode integration

2. **Wire provider health into runtime mode updates**
   - Depends on: ProviderManager conversion
   - Implementation: Automatic mode transitions based on provider health changes
   - Already stubbed in `index.js` (commented out)

3. **Expose recovery copilot through Vienna Chat API**
   - Add chat endpoint: `/api/v1/recovery/intent`
   - Route recovery commands through `ViennaCore.processRecoveryIntent()`
   - Return formatted recovery guidance

4. **Add DLQ integration to recovery copilot**
   - Connect `show dead letters` intent to actual DLQ
   - Enable `recovery checklist` to analyze DLQ failure patterns
   - Support `replay retryable failures` proposals

### Medium-term (Vienna Chat enhancement)

5. **Add recovery playbook loading to local LLM**
   - Local provider can read playbook markdown files
   - Provide context-aware recovery guidance
   - Support operator-led recovery workflows

6. **Implement degraded-mode capability routing**
   - Route tasks based on available capabilities in current mode
   - Block tasks requiring unavailable capabilities
   - Provide clear user feedback when capability unavailable

7. **Add recovery action templates**
   - Structured recovery action proposals
   - Operator approval workflow
   - Execution through governed runtime path

---

## Architecture Validation

**Enforcement boundaries verified:**

✓ **Capability** — Recovery copilot has no direct execution tools  
✓ **Authorization** — All recovery actions require operator approval  
✓ **Mediation** — Recovery proposals must resolve through governed runtime actions  
✓ **Privilege** — No conversational execution authority granted

**Design rule enforced:**

> No conversational path may produce side effects unless it resolves into an existing governed runtime action.

**Result:** Recovery copilot operates as diagnostic intelligence + proposals, NOT autonomous remediation agent.

---

## Anti-Patterns Avoided

**Successfully avoided:**
- ❌ Recovery copilot mutating provider states directly
- ❌ Recovery copilot forcing mode transitions without operator approval
- ❌ Recovery copilot executing shell commands from conversational intent
- ❌ Recovery copilot clearing DLQ or replaying envelopes autonomously
- ❌ Bypassing execution envelopes "because it's recovery"

**Boundary preserved:** AI explains, runtime executes, operator approves.

---

## Cost Impact

**Expected distribution (when fully integrated):**

- Diagnostic queries: Local LLM (free)
- Recovery planning: Local LLM (free)
- High-quality synthesis: Anthropic (premium, but only when needed)
- Degraded-mode operations: Local LLM (free)

**Cost reduction during degraded states:** Automatic fallback to local LLM prevents repeated failed Anthropic calls.

---

## Security Properties

**Threat model assumption:** Recovery copilot is an LLM-based proposal generator (text output), not adversarial code.

**Enforcement:**
- No direct tool execution
- No file system access
- No process control
- All proposals must route through governed runtime

**If future enhancement requires arbitrary code execution:** VM2/process sandbox required (not currently needed).

---

## Next Steps

**Priority 1 (blocking Phase 6.5 completion):**
- Convert ProviderManager to JavaScript
- Enable provider health → runtime mode integration
- Wire recovery copilot into Vienna Chat API

**Priority 2 (Vienna Chat enhancement):**
- DLQ integration
- Playbook loading
- Capability-based task routing

**Priority 3 (future enhancements):**
- Recovery action templates
- Automated recovery approval workflows
- Recovery metrics and dashboards

---

## Conclusion

**Phase 6.5 core components implemented successfully.**

Vienna now has:
- Provider capability model with fallback chains
- Runtime mode management (normal → degraded → local-only → operator-only)
- Recovery copilot for operator diagnostics and guidance
- Recovery playbooks for structured troubleshooting

**Architectural boundary preserved:** Recovery copilot acts as flight deck assistant, not autopilot.

**Status:** Core implementation complete. Awaiting ProviderManager conversion and Vienna Chat integration for full deployment.
