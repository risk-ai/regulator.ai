# Stage 1 Implementation Checklist

**Goal:** Operator Shell foundation with native chat + provider abstraction

**Timeline:** Week 1 (5 days)

**Status:** Ready to start

---

## Day 1: Provider Abstraction + Health Tracking

### Backend

- [ ] **Create provider directory structure**
  ```
  vienna-core/lib/providers/
    index.ts
    types.ts
    manager.ts
    anthropic/
      index.ts
      client.ts
    openclaw/
      index.ts (stub)
  ```

- [ ] **Define `ModelProvider` interface**
  - `isHealthy()`
  - `getStatus()`
  - `sendMessage()`
  - `streamMessage()`
  - `classifyMessage()`
  - `requestReasoning()`

- [ ] **Define `ProviderHealth` tracking**
  - Status (healthy/degraded/unavailable)
  - Last checked, success, failure timestamps
  - Cooldown until
  - Latency ms
  - Error rate
  - Consecutive failures

- [ ] **Implement `ProviderManager` with policy**
  - Provider registration
  - Health tracking + monitoring
  - Cooldown management
  - Retry backoff
  - Sticky session preference
  - Policy-based selection (not just static list)
  - `getHealthyProvider(threadId?)`
  - `getAllStatuses()`
  - `recordSuccess()` / `recordFailure()`

- [ ] **Add configuration**
  - Environment variables (`ANTHROPIC_API_KEY`, etc.)
  - Provider priority + fallback order
  - Cooldown duration, max failures, health check interval

### Testing

- [ ] Unit test `ProviderManager.getHealthyProvider()`
- [ ] Test failover logic (primary down → fallback)
- [ ] Test cooldown (after N failures, skip provider)
- [ ] Test sticky session (same thread prefers same provider)

---

## Day 2: Anthropic Provider + Deterministic Core

### Backend — Anthropic

- [ ] **Install Anthropic SDK**
  ```bash
  npm install @anthropic-ai/sdk
  ```

- [ ] **Implement `AnthropicProvider`**
  - Constructor with API key
  - `isHealthy()` — ping test
  - `getStatus()` — health + latency
  - `sendMessage()` — Messages API
  - `streamMessage()` — Streaming Messages API
  - `classifyMessage()` — Fast Haiku classification
  - `requestReasoning()` — Reasoning requests

- [ ] **Register with `ProviderManager`**
  ```typescript
  const anthropic = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY });
  providerManager.registerProvider(anthropic);
  ```

### Backend — Deterministic Core

- [ ] **Create command directory**
  ```
  vienna-core/lib/commands/
    parser.ts
    keyword.ts
    layered.ts
  ```

- [ ] **Implement `DeterministicCommandParser`**
  - Register core commands (pause, resume, show status, etc.)
  - Pattern matching (RegExp)
  - Handler functions (call Vienna Core)
  - Return structured `CommandResult`

- [ ] **Implement `KeywordClassifier`**
  - Keyword-based classification
  - Confidence scoring
  - Fallback for no-provider mode

- [ ] **Implement `LayeredMessageClassifier`**
  - Layer 1: Deterministic parser
  - Layer 2: Keyword classifier
  - Layer 3: Provider-assisted (LLM)
  - Return classification with mode (deterministic/keyword/llm/fallback)

- [ ] **Define structured `ChatResponse` envelope**
  ```typescript
  {
    messageId, classification,
    provider: { name, model, mode },
    status, content, linkedEntities,
    actionTaken, auditRef, timestamp
  }
  ```

### Testing

- [ ] Test Anthropic health check
- [ ] Test Anthropic message sending
- [ ] Test deterministic parser (all core commands)
- [ ] Test layered classification (3 layers)
- [ ] Test no-provider mode (deterministic commands work)
- [ ] Validate structured response envelope

---

## Day 3: Chat Integration + Service Management

### Backend — Chat Service

- [ ] **Update `ChatService` to use layered classification**
  ```typescript
  async handleMessage(message: string, context: Context): Promise<ChatResponse> {
    // Try deterministic parser first
    const deterministicResult = await this.parser.tryParse(message, context);
    if (deterministicResult) return this.buildResponse(deterministicResult);
    
    // Classify via layers
    const classification = await this.classifier.classify(message, context);
    // ... handle based on classification
  }
  ```

- [ ] **Add recovery directive handler**
  - Parse recovery intent
  - Create Vienna directive (not direct mutation)
  - Return structured response with objective_id

- [ ] **Add `/api/v1/chat/message` endpoint**
  - Accept message + context
  - Return structured `ChatResponse` envelope
  - Include provider metadata

- [ ] **Add `/api/v1/providers` endpoint**
  ```typescript
  GET /api/v1/providers
  → Returns ProviderHealth for all providers
  ```

### Backend — Service Management

- [ ] **Create service adapter stub**
  ```
  vienna-core/lib/adapters/services/
    openclaw.ts
  ```

- [ ] **Implement `OpenClawServiceAdapter`**
  - `getStatus()` — health check
  - `restart()` — stub (creates objective)
  - `reconnect()` — stub
  - `getLogs()` — stub

- [ ] **Add `/api/v1/system/services` endpoint**
  ```typescript
  GET /api/v1/system/services
  → Returns status for OpenClaw + providers
  ```

### Testing

- [ ] Test chat with Anthropic provider
- [ ] Test deterministic commands (no provider needed)
- [ ] Test failover (Anthropic down → OpenClaw/keyword fallback)
- [ ] Test all-providers-down (commands still work)
- [ ] Test recovery directive (creates objective)
- [ ] Test service status endpoint
- [ ] Test provider metadata in response

---

## Day 4: End-to-End Command Testing + Authority Tests

### Backend — Command End-to-End

- [ ] **Test core commands end-to-end**
  - pause execution → Vienna Core → executor
  - resume execution → Vienna Core → executor
  - show status → Vienna Core → query
  - list objectives → Vienna Core → query
  - retry envelope → Vienna Core → requeue

- [ ] **Test fallback scenarios**
  - All providers down → deterministic commands work
  - All providers down → queries work
  - All providers down → reasoning fails gracefully

- [ ] **Test provider failover**
  - Primary healthy → uses primary
  - Primary down → uses fallback
  - Primary in cooldown → skips to fallback
  - Sticky session works (same thread, same provider)

### Testing — Authority Boundary

- [ ] **Implement authority boundary tests** (see AUTHORITY_BOUNDARY_TESTS.md)
  - Test 1: Chat route isolation (no adapter imports)
  - Test 2: Provider layer isolation (no state mutation)
  - Test 3: Commands route through Vienna Core
  - Test 6: Recovery creates objectives
  - Test 7: Adapter non-importability

- [ ] **Run authority tests**
  ```bash
  npm run test:authority-boundary
  ```

- [ ] **Verify no violations**
  - No console code imports adapters
  - All commands call Vienna Core
  - Recovery creates objectives (not direct mutations)

### Testing

- [ ] All core commands work end-to-end
- [ ] Failover works (primary → fallback)
- [ ] No-provider mode works (deterministic commands)
- [ ] All authority tests pass
- [ ] No adapter imports in console code

---

## Day 5: UI Integration + Final Validation

### Backend

- [ ] **Wire Vienna Core to `ViennaRuntimeService`**
  - Implement `bootstrapDashboard()`
  - Implement `getSystemStatus()`
  - Implement `getObjectives()`
  - Connect to provider manager

### Frontend

- [ ] **Build global layout components**
  - `AppShell.tsx` — master layout
  - `TopStatusBar.tsx` — system health + **provider state** + **service state**
  - `LeftNav.tsx` — navigation sidebar
  - `InspectionDrawer.tsx` — detail panel (empty for now)

- [ ] **Build dashboard page**
  - 2-column layout
  - Left: Objectives + decisions + stats
  - Right: Chat panel
  - SSE integration

- [ ] **Build chat panel UI**
  - `ChatPanel.tsx` — message history + input
  - `ChatMessage.tsx` — message component with classification badge + provider badge
  - Provider mode indicator (deterministic/llm/fallback)
  - No-provider warning banner

- [ ] **Update status bar with provider/service indicators**
  - Executor state
  - Queue depth
  - **Provider state** (healthy/degraded/unavailable)
  - **OpenClaw service state** (running/stopped)
  - Integrity status

- [ ] **Add routing**
  - React Router setup
  - `/` → Dashboard
  - Stubs for other routes

### Testing — Final Validation

- [ ] **Dashboard loads on `http://localhost:3000`**
- [ ] **Status bar shows provider state**
- [ ] **Status bar shows service state**
- [ ] Chat panel visible on dashboard
- [ ] Chat accepts input
- [ ] **Core commands work (pause/resume/status)**
- [ ] **Provider badge shows on messages**
- [ ] **Classification badges show (6 types)**
- [ ] **No-provider mode works**
- [ ] SSE updates UI in real time

### Testing — Authority Validation

- [ ] **All authority boundary tests pass**
- [ ] **No console errors in browser**
- [ ] **All actions route through Vienna Core**
- [ ] **Audit trail complete**
- [ ] **Warrants still enforced** (if applicable)

---

## End of Week 1: Validation

### Critical Tests

- [ ] **Chat functional**
  - Type "What's blocked?" → Get response
  - Type "pause execution" → Execution pauses
  - Type "resume execution" → Execution resumes

- [ ] **Provider abstraction working**
  - Anthropic primary, responds correctly
  - Stop Anthropic → fallback tested
  - Provider metadata in responses

- [ ] **Authority boundary preserved**
  - All commands route through Vienna Core
  - No direct mutations from chat
  - Audit trail for all actions

- [ ] **Layout correct**
  - Status bar always visible
  - Navigation always visible
  - Chat panel always accessible
  - SSE keeps UI in sync

- [ ] **Failover tested**
  - Primary unavailable → fallback works
  - All unavailable → graceful degradation
  - Commands still work without LLM

---

## Success Criteria (Week 1)

**Week 1 is successful ONLY if ALL of the following are true:**

### Core Resilience (Critical)
- [ ] **Dashboard loads and is operational**
- [ ] **Chat works with Anthropic (primary provider)**
- [ ] **Provider used is visible in UI (badge)**
- [ ] **Anthropic failure falls back correctly**
- [ ] **No-provider mode still supports core commands** (pause/resume/status/list)
- [ ] **OpenClaw service state is visible in status bar**

### Authority Boundary (Critical)
- [ ] **Pause/resume still route through Vienna Core** (not direct mutation)
- [ ] **No direct mutation paths exist** (authority tests pass)
- [ ] **Chat route never imports adapters** (test passes)
- [ ] **Provider layer never mutates state** (test passes)
- [ ] **Recovery actions create objectives** (not direct service restarts)

### Provider Architecture
- [ ] Provider interface defined
- [ ] Anthropic provider implemented
- [ ] Provider manager with policy-based selection (not just static list)
- [ ] Health tracking + cooldown works
- [ ] `/api/v1/providers` endpoint working
- [ ] Provider metadata in responses

### Deterministic Core
- [ ] Deterministic command parser implemented
- [ ] Layered classification works (deterministic → keyword → LLM)
- [ ] Core commands work without LLM (all providers down)
- [ ] Structured chat response envelope used
- [ ] No-provider mode UI shows available commands

### Service Management
- [ ] OpenClaw service adapter exists
- [ ] `/api/v1/system/services` endpoint working
- [ ] Service health visible in status bar

### Testing
- [ ] Authority boundary tests pass
- [ ] Failover tests pass
- [ ] No-provider tests pass
- [ ] End-to-end command tests pass
- [ ] No console errors in browser

### Governance
- [ ] All actions route through Vienna Core
- [ ] Audit trail complete
- [ ] Recovery creates objectives (not direct mutations)
- [ ] Warrants still enforced (if applicable)

---

## Known Limitations (Week 1)

**Expected limitations:**
- [ ] Recovery directive creates objective but OpenClaw restart not implemented yet
- [ ] OpenClaw provider is stub (full implementation Week 2)
- [ ] `/system/services` page not built yet (Week 2)
- [ ] Only basic chat commands (pause/resume/status/blocked)
- [ ] No directive preview UI yet
- [ ] No approval workflows yet
- [ ] No multi-turn conversation context yet

**These are fine.** Week 1 focus:
1. ✅ Provider abstraction
2. ✅ Anthropic integration
3. ✅ Chat with 6 message types
4. ✅ Failover logic
5. ✅ Global layout + dashboard

---

## File Deliverables (Week 1)

### Backend

```
vienna-core/lib/providers/
  index.ts
  types.ts
  manager.ts
  anthropic/
    index.ts
    client.ts
  openclaw/
    index.ts (stub)

console/server/src/
  services/
    chatService.ts (updated with provider manager)
  routes/
    chat.ts
    providers.ts (new)
```

### Frontend

```
console/client/src/
  components/
    layout/
      AppShell.tsx
      TopStatusBar.tsx
      LeftNav.tsx
      InspectionDrawer.tsx (empty)
    chat/
      ChatPanel.tsx
      ChatMessage.tsx
  pages/
    DashboardPage.tsx
  api/
    chat.ts (updated with provider metadata)
    providers.ts (new)
```

---

## Daily Standup Format

**Use this to track progress:**

### Day N Progress
- [ ] Tasks completed
- [ ] Blockers encountered
- [ ] Next day priorities

### Current Status
- Provider abstraction: [X/5 components]
- Chat integration: [X/4 features]
- UI components: [X/6 components]
- Tests passing: [X/10 critical tests]

---

## Quick Start (Day 1 Morning)

1. **Create provider directory**
   ```bash
   mkdir -p vienna-core/lib/providers/anthropic
   mkdir -p vienna-core/lib/providers/openclaw
   ```

2. **Copy interface from PROVIDER_ARCHITECTURE.md**
   - Start with `ModelProvider` interface
   - Add to `vienna-core/lib/providers/types.ts`

3. **Implement `ProviderManager` skeleton**
   - `registerProvider()`
   - `getHealthyProvider()`
   - Basic health checks

4. **Install Anthropic SDK**
   ```bash
   cd vienna-core
   npm install @anthropic-ai/sdk
   ```

5. **Set environment variable**
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

**By end of Day 1:** Provider abstraction layer exists, basic health checking works.

---

## Resource Links

- **PROVIDER_ARCHITECTURE.md** — Complete provider system design
- **CHAT_ARCHITECTURE.md** — Chat system with recovery directive
- **PHASE_8_AUTONOMOUS.md** — Architecture summary
- **STAGE_1_IMPLEMENTATION.md** — Detailed guide

---

**Week 1 goal: Autonomous Vienna with native chat + provider abstraction.**

**Status: Ready to start Day 1.**
