# Phase 6.6 Complete — LLM Provider Activation

**Date:** 2026-03-12  
**Status:** ✓ COMPLETE  

## Objective

Make Vienna Chat conversational with healthy LLM providers.

**Before:** Vienna Chat could only respond to recovery intents. No natural language conversation. Providers registered but not functional.

**After:** Vienna Chat routes general requests to active LLM providers, with Anthropic preferred and local fallback. Recovery intents still route to recovery API.

---

## Implementation Summary

### Core Components

**1. Provider Factory (`lib/providers/factory.js`)**
- Creates and registers Anthropic and Local providers
- Wires providers to ProviderHealthManager
- Implements fallback selection logic (anthropic → local)
- Starts health monitoring automatically

**2. Provider Implementations**
- `lib/providers/anthropic/client.js` — Anthropic Claude API integration
- `lib/providers/local/client.js` — OpenClaw gateway integration
- Both implement: `isHealthy()`, `getStatus()`, `sendMessage()`

**3. Vienna Core Integration (`index.js`)**
- Added `processChatMessage()` — Routes chat through active provider
- Added `classifyChatIntent()` — Classifies recovery vs general chat
- Provider initialization in `initPhase7_3()` after dependencies ready
- Integrated with `ProviderHealthManager` for health tracking

**4. Chat Routing (`console/server/src/routes/chat.ts`)**
- Updated to call `vienna.processChatMessage()` directly
- Removed intermediate `ChatService` layer for Phase 6.6
- Intent classification happens in Vienna Core

**5. Runtime Service Bridge (`console/server/src/services/viennaRuntime.ts`)**
- Added `processChatMessage()` method
- Added `classifyChatIntent()` method
- Routes recovery intents to recovery API, general chat to LLM

---

## Provider Configuration

### Anthropic Provider

**Configuration:**
```javascript
{
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultModel: 'claude-3-7-sonnet-20250219',
  classificationModel: 'claude-3-5-haiku-20241022',
}
```

**Environment variable:** `ANTHROPIC_API_KEY`

**Health check:** Ping with Haiku model (10 tokens)

**Status:** Active when API key valid

### Local Provider

**Configuration:**
```javascript
{
  gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789',
  name: 'local',
  defaultModel: 'claude-sonnet-4-5',
}
```

**Environment variable:** `OPENCLAW_GATEWAY_URL` (optional)

**Health check:** HTTP GET to gateway URL

**Status:** Active when OpenClaw gateway running

---

## Intent Classification

### Recovery Intents (Route to Recovery API)

Patterns:
- `diagnose (system|runtime|state)`
- `show (failures|failed|errors|dead letters|dlq)`
- `explain (blockers|blocks|issues)`
- `test provider <name>`
- `enter local-only`
- `recovery checklist`
- `show (mode|runtime mode)`

**Example:** "diagnose system" → Recovery API → Structured diagnosis

### General Chat (Route to LLM Provider)

Everything else routes to active LLM provider.

**Example:** "hello" → Anthropic or Local → Natural language response

---

## Provider Fallback Chain

```
User Message
    ↓
Intent Classification
    ↓
    ├─→ Recovery Intent → Recovery API
    │
    └─→ General Chat
            ↓
        Provider Selection
            ↓
            ├─→ Anthropic (if healthy)
            │       ↓
            │   [Send to Anthropic API]
            │
            ├─→ Local (if Anthropic unhealthy)
            │       ↓
            │   [Send to OpenClaw Gateway]
            │
            └─→ No Provider Available
                    ↓
                "System is in operator-only mode"
```

---

## Acceptance Criteria

✅ **"hello" returns natural Vienna response**  
✅ **"diagnose system" routes to recovery copilot**  
✅ **"test provider anthropic" returns real health status**  
✅ **Local fallback works when Anthropic unavailable**  
✅ **Dashboard provider health reflects actual connectivity**  

---

## Test Results

Created `test-phase-6.6-providers.js` with 5 test scenarios:

1. ✓ Provider registration
2. ✓ Intent classification
3. ✓ Provider health checks
4. ✓ Provider fallback selection
5. ✓ Vienna Core integration

**All tests passed.**

---

## API Changes

### New Endpoints

**None.** Chat routing uses existing `/api/v1/chat/message` endpoint.

### Modified Endpoints

**`POST /api/v1/chat/message`**

**Before:**
```typescript
{
  message: string;
  context?: { ... };
}
→ ChatService.handleMessage() → Complex routing
```

**After:**
```typescript
{
  message: string;
  context?: {
    systemPrompt?: string;
    conversationHistory?: Array<{ role, content }>;
    model?: string;
  };
}
→ ViennaRuntimeService.processChatMessage() → Intent classification → Provider routing
```

---

## Files Modified

### Vienna Core

- `index.js` — Added provider initialization, chat methods
- `lib/providers/factory.js` — NEW: Provider creation and registration
- `lib/providers/anthropic/client.js` — NEW: Anthropic provider implementation
- `lib/providers/local/client.js` — NEW: Local provider implementation

### Console Server

- `console/server/src/routes/chat.ts` — Updated to call Vienna directly
- `console/server/src/services/viennaRuntime.ts` — Added chat routing methods
- `console/server/src/app.ts` — Updated chat router wiring

### Tests

- `test-phase-6.6-providers.js` — NEW: Phase 6.6 validation suite

---

## Configuration Requirements

### Required Environment Variables

**For Anthropic Provider:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**For Local Provider (optional):**
```bash
export OPENCLAW_GATEWAY_URL="http://localhost:18789"  # Default if not set
```

### Initialization Order

1. ProviderHealthManager initialized (Phase 6B)
2. RuntimeModeManager initialized (Phase 6.5)
3. ProviderHealthBridge started (Phase 6.5)
4. **LLM Providers initialized (Phase 6.6)** ← NEW
5. Health monitoring started automatically

---

## Health Monitoring

### Provider Health States

- **healthy** — Recent successful request, available for use
- **degraded** — Recent failure, cooldown active, will retry
- **quarantined** — Consecutive failures, longer cooldown
- **unknown** — Not yet tested

### Health Check Intervals

- **Provider health checks:** Every 30 seconds
- **Gateway connectivity:** Every 60 seconds
- **Runtime mode updates:** Every 30 seconds

### Dashboard Integration

Provider health displayed in:
- `/api/v1/system/providers` — Provider status list
- `/api/v1/recovery/health` — Recovery-focused health view
- `/api/v1/system/now` — Unified operator "now" view

---

## Chat Flow Example

### General Chat

```
User: "hello"
    ↓
Vienna.classifyChatIntent("hello") → "general"
    ↓
Vienna.processChatMessage("hello")
    ↓
getActiveProvider(healthManager, providers)
    ↓
Anthropic provider (if healthy)
    ↓
Anthropic.sendMessage({ message: "hello", context: {...} })
    ↓
Response: "Hello! I'm Vienna, your AI operator assistant. How can I help you today?"
```

### Recovery Intent

```
User: "diagnose system"
    ↓
Vienna.classifyChatIntent("diagnose system") → "recovery"
    ↓
Vienna.processChatMessage("diagnose system")
    ↓
Routes to processRecoveryIntent("diagnose system")
    ↓
RecoveryCopilot.diagnoseSystem(runtimeState, providerHealth)
    ↓
Response: "**System Diagnosis**\n\nSystem State: degraded\n..."
```

---

## Failure Scenarios

### Scenario 1: Anthropic API key invalid

**Behavior:**
1. Anthropic health check fails (401 authentication error)
2. ProviderHealthManager marks Anthropic as degraded
3. getActiveProvider() falls back to local
4. Chat routes through local provider

**User experience:** Chat works, using local provider

### Scenario 2: OpenClaw gateway down

**Behavior:**
1. Local health check fails (connection refused)
2. ProviderHealthManager marks local as degraded
3. getActiveProvider() returns anthropic (if healthy)
4. Chat routes through Anthropic

**User experience:** Chat works, using Anthropic

### Scenario 3: Both providers unhealthy

**Behavior:**
1. Both health checks fail
2. getActiveProvider() returns null
3. processChatMessage() returns operator-only message

**User experience:** "No healthy LLM providers available. System is in operator-only mode."

**Operator can still:** Use recovery intents (diagnose, show failures, etc.)

---

## Performance Impact

### Memory

- **Provider instances:** ~2-5 MB (Anthropic SDK + HTTP clients)
- **Health tracking:** ~1 KB per provider
- **Total overhead:** <10 MB

### Network

- **Health checks:** 2 requests / 30 seconds = ~0.07 req/s
- **Chat messages:** Variable, operator-driven

### Cost

- **Anthropic health checks:** Haiku, 10 tokens = ~$0.000001 per check
- **Daily health check cost:** ~$0.003 (2,880 checks/day)
- **Chat usage:** Depends on operator activity

---

## Deployment

### Steps

1. **Set environment variables** (if not already set):
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

2. **Restart Vienna Core server:**
   ```bash
   # Restart the console server to pick up Phase 6.6 changes
   cd ~/.openclaw/workspace/vienna-core/console
   npm run dev  # or production restart command
   ```

3. **Verify provider registration:**
   ```bash
   curl http://localhost:3000/api/v1/system/providers
   ```

4. **Test chat:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/chat/message \
     -H "Content-Type: application/json" \
     -d '{"message": "hello"}'
   ```

### Validation

Check logs for:
```
[ProviderFactory] Initializing providers...
[AnthropicProvider] Initialized with model: claude-3-7-sonnet-20250219
[ProviderFactory] Created Anthropic provider
[LocalProvider] Initialized with URL: http://localhost:18789
[ProviderFactory] Created Local provider
[ProviderFactory] Initialized 2/2 providers
[Vienna] Phase 6.6: Initialized 2/2 LLM providers
```

### Rollback

If issues arise:

1. Set `ANTHROPIC_API_KEY=""` to disable Anthropic
2. Restart server
3. System will use local-only mode

**No data loss:** Provider health state is ephemeral, no persistence.

---

## Next Phase: 6.7 — Governed System Executor

**Goal:** Allow Vienna to perform system/terminal actions through governance.

**Scope:**
- Shell executor module
- Read-only commands (logs, ports, processes, config)
- Governed side-effect actions (restart service, kill process)
- Structured action template + approval + execution + verification
- Preserve rule: AI explains, runtime executes, operator approves

**Estimated effort:** 2-3 days

---

## Conclusion

Phase 6.6 successfully activates LLM providers for Vienna Chat.

**Key achievements:**
- Anthropic and Local providers registered and functional
- Health monitoring active with automatic fallback
- Chat intent classification working (recovery vs general)
- Provider routing integrated with Vienna Core
- All acceptance criteria met

**Vienna Chat is now conversational.**

Next: Phase 6.7 will give Vienna the ability to perform system actions through governance.
