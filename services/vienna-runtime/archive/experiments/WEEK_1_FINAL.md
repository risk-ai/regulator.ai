# Vienna Operator Shell — Week 1 Final Architecture

**Date:** March 11, 2026  
**Status:** ✅ Architecture refined and ready for implementation

---

## Governing Principle (Final)

> **Vienna Operator Shell replaces OpenClaw as the operator UI.**
> 
> **Model providers are interchangeable reasoning engines.**
> 
> **Deterministic command handling preserves core shell operation during provider outages.**
> 
> **Vienna Core remains the sole execution authority for all side effects.**

---

## Week 1 Core Insight

**The missing piece:** Deterministic operability when LLMs fail.

**Solution:** Separate deterministic command layer that works without LLM dependency.

**Result:** Vienna shell remains trustworthy even when all providers unavailable.

---

## Three-Layer Architecture

### Layer 1: Deterministic Command Core
- Core operator commands work without LLM
- Pattern matching + direct Vienna Core calls
- Fast, reliable, zero LLM cost

### Layer 2: Provider Manager (Policy-Based)
- Health tracking + cooldown
- Retry backoff
- Sticky session preference
- Automatic failover (not just static list)

### Layer 3: LLM Reasoning
- Anthropic (primary)
- OpenClaw (fallback)
- Local models (future)

**Flow:**
```
Message → Deterministic parser (Layer 1)
  ↓ No match?
Keyword classifier (Layer 2)
  ↓ Low confidence?
Provider-assisted LLM classification (Layer 3)
```

---

## Key Architectural Components

### 1. Deterministic Command Parser

**Commands that MUST work without LLM:**

```
System Control:
• pause execution
• resume execution
• run integrity check

Status Queries:
• show status
• show providers
• show services
• list objectives
• list blocked objectives
• list dead letters

Objective Management:
• show objective <id>
• cancel objective <id>

Execution Management:
• retry envelope <id>

Service Management:
• restart openclaw
```

**Implementation:** RegExp pattern matching → Vienna Core method calls

**Result:** Core operations always available.

---

### 2. Provider Manager with Policy

**Not just static failover list.** Policy-based selection:

```typescript
interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  lastCheckedAt: string;
  lastFailureAt: string | null;
  cooldownUntil: string | null;
  latencyMs: number | null;
  consecutiveFailures: number;
}

interface ProviderSelectionPolicy {
  primaryProvider: string;
  fallbackOrder: string[];
  cooldownMs: number; // Skip provider after failures
  maxConsecutiveFailures: number; // Failures before cooldown
  healthCheckInterval: number; // Background monitoring
  stickySession: boolean; // Prefer same provider for thread
}
```

**Features:**
- Health tracking (not just ping on demand)
- Cooldown after failures (don't retry immediately)
- Retry backoff (exponential)
- Sticky sessions (same thread, same provider)
- Background health monitoring

**Result:** Intelligent provider selection, not just primary → fallback.

---

### 3. Structured Chat Response Envelope

**Every chat response uses consistent format:**

```typescript
interface ChatResponse {
  messageId: string;
  classification: MessageClassification;
  provider: {
    name: 'anthropic' | 'openclaw' | 'local' | 'none';
    model?: string;
    mode: 'llm' | 'deterministic' | 'keyword' | 'fallback';
  };
  status: 'answered' | 'preview' | 'executing' | 'approval_required' | 'failed';
  content: {
    text: string;
    summary?: string;
  };
  linkedEntities?: {
    objectiveId?: string;
    envelopeId?: string;
    service?: string;
  };
  actionTaken?: {
    action: string;
    result: 'success' | 'failed' | 'pending';
  };
  auditRef?: string;
  timestamp: string;
}
```

**Benefits:**
- Consistent UI integration
- Provider transparency
- Action traceability
- Thread resilience

---

### 4. Service Management (Week 1)

**OpenClaw as managed service:**

```
GET /api/v1/system/services
→ Returns status for OpenClaw + providers
```

**Service adapter:**
```typescript
class OpenClawServiceAdapter {
  async getStatus(): Promise<ServiceStatus>;
  async restart(): Promise<void>; // Creates objective
  async reconnect(): Promise<void>;
  async getLogs(lines: number): Promise<string[]>;
}
```

**Visibility:** Status bar shows OpenClaw service state.

**Recovery:** "restart openclaw" creates governed objective.

---

### 5. Authority Boundary Tests (Explicit)

**Not assumptions. Named tests that must pass:**

1. **Chat Route Isolation** — No adapter imports
2. **Provider Layer Isolation** — No state mutation
3. **Commands Route Through Vienna Core** — All mutations governed
4. **Recovery Creates Objectives** — Not direct service restarts
5. **Adapter Non-Importability** — No console code imports adapters

**CI/CD integration:** Tests run in pipeline, fail build on violations.

**Result:** Authority boundary is proven, not assumed.

---

## Week 1 Daily Breakdown

### Day 1: Provider Abstraction + Health Tracking
- Provider interface
- Anthropic provider
- Provider manager with policy
- Health tracking + cooldown
- Sticky session logic

---

### Day 2: Deterministic Core + Structured Envelopes
- Deterministic command parser
- Keyword classifier
- Layered message classifier
- Structured ChatResponse envelope
- Core commands (pause/resume/status/list)

---

### Day 3: Chat Integration + Service Management
- Chat service uses layered classification
- `/api/v1/chat/message` endpoint
- `/api/v1/providers` endpoint
- OpenClaw service adapter
- `/api/v1/system/services` endpoint

---

### Day 4: End-to-End Testing + Authority Tests
- Core commands end-to-end
- Failover scenarios
- No-provider mode tests
- Authority boundary tests (5 tests)
- Verify no violations

---

### Day 5: UI Integration + Final Validation
- Global layout (status bar with provider/service indicators)
- Dashboard with chat panel
- Chat UI (classification badges, provider badges, no-provider warning)
- SSE integration
- Final validation (all success criteria)

---

## Critical Tests

### Test 1: Core Commands Work Without LLM

```typescript
// Disable all providers
await providerManager.disableAll();

// Should still work
const response = await chat.handleMessage('pause execution', context);
expect(response.provider.mode).toBe('deterministic');
expect(response.status).toBe('executing');
```

---

### Test 2: Provider Failover

```typescript
// Primary healthy
const provider1 = await providerManager.getHealthyProvider();
expect(provider1.name).toBe('anthropic');

// Primary fails
await providerManager.recordFailure('anthropic', new Error('Down'));
await providerManager.recordFailure('anthropic', new Error('Down'));
await providerManager.recordFailure('anthropic', new Error('Down'));

// Should skip to fallback
const provider2 = await providerManager.getHealthyProvider();
expect(provider2.name).toBe('openclaw'); // or keyword fallback
```

---

### Test 3: Authority Boundary

```typescript
// Chat route should not import adapters
const chatRouteContent = fs.readFileSync('routes/chat.ts', 'utf8');
expect(chatRouteContent).not.toContain('from \'../../adapters');

// Commands should call Vienna Core
const mockVienna = jest.fn();
await chat.handleMessage('pause execution', { operator: 'test' });
expect(mockVienna.pauseExecution).toHaveBeenCalled();
```

---

### Test 4: Recovery Governance

```typescript
// Recovery directive should create objective
const response = await chat.handleMessage('restart openclaw', { operator: 'test' });
expect(response.classification).toBe('recovery');
expect(response.linkedEntities?.objectiveId).toBeDefined();

// Should NOT call service adapter directly
expect(mockServiceAdapter.restart).not.toHaveBeenCalled();
```

---

## Success Criteria (All Required)

**Week 1 successful ONLY if:**

### Core Resilience
✅ Dashboard loads and operational  
✅ Chat works with Anthropic  
✅ Provider visible in UI  
✅ Failover works  
✅ **No-provider mode supports core commands**  
✅ OpenClaw service state visible  

### Authority Boundary
✅ Pause/resume route through Vienna Core  
✅ **No direct mutation paths exist**  
✅ **All authority tests pass**  
✅ Recovery creates objectives  

### Architecture
✅ Provider abstraction complete  
✅ Deterministic core implemented  
✅ Layered classification works  
✅ Service management in place  

---

## UI Indicators

### Top Status Bar

```
[System: Healthy] [Executor: Running] [Queue: 12] [Provider: Anthropic ✓] [OpenClaw: Running ✓]
```

---

### Chat Message

```
User: pause execution

Vienna (via deterministic): ✓ Execution paused successfully.
```

---

### No-Provider Mode

```
⚠️ LLM providers unavailable

Deterministic commands still work:
• pause execution
• resume execution
• show status
• list objectives
• restart openclaw

[View Full Command List]
```

---

## File Deliverables

### Backend (New)

```
vienna-core/
├── lib/
│   ├── providers/
│   │   ├── types.ts (ModelProvider interface, ProviderHealth)
│   │   ├── manager.ts (ProviderManager with policy)
│   │   ├── anthropic/
│   │   │   └── client.ts (AnthropicProvider)
│   │   └── openclaw/
│   │       └── client.ts (stub)
│   ├── commands/
│   │   ├── parser.ts (DeterministicCommandParser)
│   │   ├── keyword.ts (KeywordClassifier)
│   │   └── layered.ts (LayeredMessageClassifier)
│   └── adapters/
│       └── services/
│           └── openclaw.ts (OpenClawServiceAdapter)

console/server/src/
├── routes/
│   ├── chat.ts (updated with layered classification)
│   ├── providers.ts (new)
│   └── services.ts (new)
└── services/
    └── chatService.ts (uses layered classification)
```

---

### Frontend (New)

```
console/client/src/
├── components/
│   ├── layout/
│   │   ├── TopStatusBar.tsx (updated with provider/service indicators)
│   │   └── ...
│   └── chat/
│       ├── ChatPanel.tsx (classification badges, provider badges)
│       ├── ChatMessage.tsx (mode indicator)
│       └── NoProviderBanner.tsx (new)
└── api/
    ├── chat.ts (ChatResponse envelope)
    └── providers.ts (new)
```

---

### Tests (New)

```
tests/
├── authority-boundary/
│   ├── chat-isolation.test.ts
│   ├── provider-isolation.test.ts
│   ├── command-governance.test.ts
│   ├── recovery-governance.test.ts
│   └── adapter-imports.test.ts
├── providers/
│   ├── manager.test.ts (policy tests)
│   ├── failover.test.ts
│   └── cooldown.test.ts
└── commands/
    ├── deterministic.test.ts
    ├── layered-classification.test.ts
    └── no-provider-mode.test.ts
```

---

## Documentation Index

### Core Architecture
1. **DETERMINISTIC_CORE.md** (21KB) — Deterministic command layer
2. **PROVIDER_ARCHITECTURE.md** (updated, 18KB) — Provider policy + health tracking
3. **AUTHORITY_BOUNDARY_TESTS.md** (18KB) — Explicit test specifications
4. **STAGE_1_CHECKLIST.md** (updated, 10KB) — Day-by-day refined plan

### Existing (Still Valid)
5. **PRODUCT_DEFINITION.md** — Product vision
6. **CHAT_ARCHITECTURE.md** — Chat system (updated with recovery)
7. **OPERATOR_SHELL_ARCHITECTURE.md** — Full system architecture
8. **UX_PRINCIPLES.md** — Design guidelines
9. **PHASE_8_AUTONOMOUS.md** — Autonomous architecture summary

### Summary
10. **WEEK_1_FINAL.md** (this document) — Week 1 complete architecture
11. **IMPLEMENTATION_READY.md** — Quick reference

---

## Configuration

```bash
# Anthropic provider
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219

# OpenClaw provider (fallback)
OPENCLAW_GATEWAY_URL=http://localhost:18789

# Provider policy
MODEL_PROVIDER_PRIMARY=anthropic
MODEL_PROVIDER_FALLBACK=anthropic,openclaw
MODEL_PROVIDER_COOLDOWN_MS=60000
MODEL_PROVIDER_MAX_FAILURES=3
MODEL_PROVIDER_HEALTH_CHECK_INTERVAL=30000
MODEL_PROVIDER_STICKY_SESSION=true

# Vienna Core
VIENNA_WORKSPACE=/home/maxlawai/.openclaw/workspace
```

---

## Quick Start

### Day 1 Morning

```bash
# Set up environment
export ANTHROPIC_API_KEY=sk-ant-...

# Create directories
mkdir -p vienna-core/lib/providers/anthropic
mkdir -p vienna-core/lib/commands

# Install SDK
npm install @anthropic-ai/sdk

# Start with ModelProvider interface (PROVIDER_ARCHITECTURE.md)
# Then ProviderManager with policy
# Then AnthropicProvider implementation
```

---

## Final Validation

**Before declaring Week 1 complete:**

1. Run all authority boundary tests → ✅ All pass
2. Test core commands with no providers → ✅ Work deterministically
3. Test failover (Anthropic down) → ✅ Falls back correctly
4. Test recovery directive → ✅ Creates objective
5. Check status bar → ✅ Shows provider + service state
6. Verify no console errors → ✅ Clean
7. Verify audit trail → ✅ All actions logged

**If ANY fails → Week 1 not complete.**

---

## What Makes This Architecture Strong

✅ **Deterministic core** — Shell always operational  
✅ **Policy-based providers** — Intelligent failover, not just static list  
✅ **Explicit authority tests** — Boundary proven, not assumed  
✅ **Service observability** — OpenClaw state visible early  
✅ **Structured envelopes** — Consistent, traceable responses  
✅ **Resilient by design** — Degrades gracefully, never breaks  

---

**Vienna Operator Shell: Autonomous, resilient, trustworthy.**

**Week 1 architecture complete. Ready for implementation.**
