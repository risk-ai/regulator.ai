# Vienna Operator Shell — Autonomous Architecture

**Date:** March 11, 2026  
**Status:** Final architecture — Ready for implementation

---

## Critical Architectural Improvement

**Problem identified:** Vienna Operator Shell was designed to replace OpenClaw UI, but OpenClaw remained a hidden single point of failure.

**Solution:** Make Vienna truly autonomous with direct LLM access and service recovery capabilities.

---

## Three Key Improvements

### 1. Model Provider Abstraction

**Before:**
```
Vienna Chat → OpenClaw sessions → LLM
```

**After:**
```
Vienna Chat → Provider abstraction → Anthropic | OpenClaw | Local
```

**Result:** Vienna no longer depends on OpenClaw for LLM access.

---

### 2. Direct Anthropic Integration

**Implementation:**
- Native Anthropic provider using Claude Messages API
- Server-side API key (never exposed to browser)
- Streaming responses
- Tool/function invocation support

**Benefits:**
- Faster responses (no OpenClaw hop)
- More reliable (direct API access)
- Fallback when OpenClaw unavailable

---

### 3. Service Recovery + Self-Healing

**Capability:**
- Vienna can detect service failures
- Create governed recovery objectives
- Restart/reconnect services automatically
- Report recovery status in chat

**Example:**
```
User: "Vienna, OpenClaw appears down. Restore connectivity."
Vienna: [Creates recovery objective]
Vienna: "Recovery objective obj_recovery_501 created. Restarting OpenClaw gateway..."
Vienna: "✓ OpenClaw gateway restored successfully."
```

---

## Architecture Comparison

### Phase 8 Original

```
Operator Shell (UI)
  ↓
Console API
  ↓
Vienna Core
  ↓
OpenClaw sessions (required)
  ↓
LLM
```

**Risk:** OpenClaw unavailable = Vienna chat breaks.

---

### Phase 8 Autonomous

```
Operator Shell (UI)
  ↓
Console API
  ↓
Vienna Core
  ↓
Provider Manager (failover logic)
  ↓ ↓ ↓
Anthropic | OpenClaw | Local
```

**Resilience:** OpenClaw unavailable = automatic failover to Anthropic.

---

## Provider Architecture

### Provider Interface

```typescript
interface ModelProvider {
  name: string;
  type: 'anthropic' | 'openclaw' | 'local';
  
  isHealthy(): Promise<boolean>;
  getStatus(): Promise<ProviderStatus>;
  
  sendMessage(request: MessageRequest): Promise<MessageResponse>;
  streamMessage(request: MessageRequest): AsyncIterableIterator<MessageChunk>;
  
  classifyMessage(message: string, context?: Context): Promise<MessageClassification>;
  requestReasoning(prompt: string, context?: Context): Promise<ReasoningResponse>;
}
```

---

### Anthropic Provider

**Features:**
- Direct Claude API integration
- Streaming responses
- Message classification
- Reasoning requests
- Tool/function calling support

**Models:**
- Primary: `claude-3-7-sonnet-20250219`
- Classification: `claude-3-5-haiku-20241022` (fast + cheap)

**Configuration:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
MODEL_PROVIDER_PRIMARY=anthropic
```

---

### OpenClaw Provider

**Role:** Fallback provider when Anthropic unavailable (or vice versa).

**Features:**
- Gateway health monitoring
- Session management
- Message routing

**Status:** Stub implementation in Stage 1 (full implementation in Stage 2).

---

### Provider Manager

**Responsibilities:**
- Provider registration
- Health monitoring
- Automatic failover
- Provider selection

**Failover logic:**
```typescript
1. Try primary provider (anthropic)
2. If unhealthy, try fallback (openclaw)
3. If all unhealthy, return error + fallback to simple classification
```

---

## Message Classification Update

### New Type: Recovery

**Classification types (6 total):**
1. Informational
2. Reasoning
3. Directive
4. Command
5. Approval
6. **Recovery** (new)

**Recovery examples:**
```
Vienna, OpenClaw appears down. Restore connectivity.
Vienna, restart the gateway service
Vienna, recover from network failure
```

**Handling:**
1. Parse recovery intent
2. Create recovery objective
3. Execute service adapter (e.g., `OpenClawServiceAdapter.restart()`)
4. Verify recovery
5. Report result

---

## Service Monitoring

### OpenClaw as Managed Service

**New adapter:** `vienna-core/lib/adapters/services/openclaw.ts`

**Capabilities:**
- Health check
- Process status
- Restart
- Reconnect
- Log inspection

**Example:**
```typescript
const adapter = new OpenClawServiceAdapter();
const status = await adapter.getStatus();
// { name: 'openclaw', status: 'running', healthy: true }
```

---

### Service Status Endpoint

**Endpoint:** `GET /api/v1/system/services`

**Response:**
```json
{
  "openclaw": {
    "status": "running",
    "last_heartbeat": "2026-03-11T20:00:00Z",
    "connectivity": "healthy"
  },
  "providers": {
    "anthropic": {
      "healthy": true,
      "latency_ms": 200
    },
    "openclaw": {
      "healthy": false,
      "error": "Gateway unreachable"
    }
  }
}
```

---

## System/Services UI Page

**Route:** `/system/services`

**Purpose:** Service monitoring and management

**Sections:**

1. **OpenClaw Gateway**
   - Status (running/stopped/degraded)
   - Last heartbeat
   - Actions: Restart, Reconnect, View Logs

2. **Model Providers**
   - Anthropic status + latency
   - OpenClaw status + connectivity
   - Actions: Test Connection

3. **SSE Stream**
   - Connection status
   - Client count
   - Last event timestamp

4. **Vienna Executor**
   - Executor state
   - Queue depth
   - Actions: Run Integrity Check

**All actions route through Vienna Core** (create objectives, not direct mutations).

---

## Chat Response Enhanced

**Before:**
```json
{
  "message_id": "msg_123",
  "classification": "informational",
  "response": "System is healthy...",
  "timestamp": "2026-03-11T20:00:00Z"
}
```

**After:**
```json
{
  "message_id": "msg_123",
  "classification": "informational",
  "response": "System is healthy...",
  "provider": "anthropic",
  "model": "claude-3-7-sonnet-20250219",
  "timestamp": "2026-03-11T20:00:00Z"
}
```

**UI shows provider badge:**
```
Vienna (via anthropic): System is healthy...
```

---

## Failover Scenarios

### Scenario 1: Anthropic primary, OpenClaw fallback

```
1. User sends chat message
2. ProviderManager tries Anthropic
3. Anthropic responds
4. Response includes: provider: "anthropic"
```

---

### Scenario 2: Anthropic unavailable

```
1. User sends chat message
2. ProviderManager tries Anthropic
3. Health check fails
4. Fallback to OpenClaw
5. OpenClaw responds
6. Response includes: provider: "openclaw"
7. UI shows warning: "⚠️ Using fallback provider: openclaw"
```

---

### Scenario 3: All providers unavailable

```
1. User sends chat message
2. ProviderManager tries all providers
3. All fail health checks
4. Error: "No healthy providers available"
5. Fallback to simple keyword-based classification
6. Commands still work (pause/resume)
7. Reasoning unavailable
8. UI shows error: "⚠️ LLM providers unavailable. Limited functionality."
```

---

## Recovery Flow Example

### Full end-to-end recovery

```
1. OpenClaw gateway crashes
2. Operator notices chat not responding
3. User: "Vienna, OpenClaw appears down. Restore connectivity."
4. Message classified as 'recovery'
5. Vienna creates recovery objective:
   - objective_id: obj_recovery_501
   - title: "Recover OpenClaw gateway"
   - risk_tier: T1
6. Executor runs service adapter:
   - OpenClawServiceAdapter.restart()
7. Service restarts
8. Health check confirms connectivity
9. Vienna responds: "✓ OpenClaw gateway restored successfully."
10. Provider manager updates status
11. Subsequent chat messages use OpenClaw again
```

**Key:** Recovery is governed (objective → executor → adapter), not direct system mutation.

---

## Stage 1 Updated Scope

### Must Include (Week 1)

1. ✅ Global layout
2. ✅ Dashboard with chat
3. ✅ SSE integration
4. ✅ **Provider abstraction interface**
5. ✅ **Anthropic provider implementation**
6. ✅ **Provider manager with failover**
7. ✅ **Provider health endpoint** (`/api/v1/providers`)
8. ✅ Chat with recovery directive support
9. ✅ Provider badge in chat UI

**Do not defer provider abstraction.** It is foundational.

---

### Stage 1 Implementation Order

**Day 1-2: Provider Layer**
1. Implement `ModelProvider` interface
2. Implement `AnthropicProvider`
3. Implement `ProviderManager`
4. Add configuration (env vars)
5. Test Anthropic connectivity

**Day 3-4: Chat Integration**
1. Update `ChatService` to use `ProviderManager`
2. Add recovery directive handling
3. Add provider metadata to responses
4. Update chat UI to show provider badge
5. Test failover scenario

**Day 5: API + UI**
1. Add `/api/v1/providers` endpoint
2. Update chat panel UI
3. Test end-to-end
4. Validate all actions route through Vienna Core

---

## Configuration Example

**Environment:**
```bash
# Anthropic provider
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219

# OpenClaw provider
OPENCLAW_GATEWAY_URL=http://localhost:18789

# Provider settings
MODEL_PROVIDER_PRIMARY=anthropic
MODEL_PROVIDER_FALLBACK=anthropic,openclaw

# Vienna Core
VIENNA_WORKSPACE=/home/maxlawai/.openclaw/workspace
```

---

## Benefits Summary

### ✅ Autonomous Operation
- Vienna no longer depends on OpenClaw for LLM access
- Direct Anthropic integration = faster, more reliable
- Fallback logic = resilient to provider failures

### ✅ Self-Healing
- Can detect service failures
- Create recovery objectives automatically
- Restart/reconnect services through governed pipeline

### ✅ Observable
- Provider health visible in UI
- Service status monitoring
- Failover events logged

### ✅ Flexible
- Easy to add new providers (local models, etc.)
- Provider-agnostic architecture
- Multi-provider strategies possible

### ✅ Future-Proof
- Provider abstraction enables experimentation
- Can route different message types to different providers
- Can implement cost optimization strategies

---

## Validation Checklist

### Provider Architecture
- [ ] `ModelProvider` interface defined
- [ ] `AnthropicProvider` implemented
- [ ] `ProviderManager` implemented with failover
- [ ] Health checks working
- [ ] Failover tested

### Chat Integration
- [ ] Chat uses `ProviderManager`
- [ ] Recovery directive classification works
- [ ] Provider metadata in responses
- [ ] Provider badge in UI
- [ ] All 6 message types handled

### Service Monitoring
- [ ] OpenClaw service adapter exists
- [ ] `/api/v1/providers` endpoint working
- [ ] `/system/services` page renders
- [ ] Service health visible

### Recovery
- [ ] Recovery directive creates objective
- [ ] Service restart through adapter
- [ ] Verification step confirms recovery
- [ ] Result reported in chat

### Failover
- [ ] Primary → fallback works
- [ ] All unavailable handled gracefully
- [ ] Simple classification fallback works
- [ ] Commands work without LLM

---

## Success Criteria

**Week 1:**
- [ ] Chat works with Anthropic provider
- [ ] Failover to OpenClaw tested
- [ ] Provider health visible in UI
- [ ] All actions still route through Vienna Core

**Week 2:**
- [ ] Recovery directive functional
- [ ] `/system/services` page complete
- [ ] Service restart tested
- [ ] Full end-to-end recovery validated

---

## Key Documents

### New (Provider Architecture)
- **PROVIDER_ARCHITECTURE.md** — Complete provider system design
- **PHASE_8_AUTONOMOUS.md** — This document (summary)

### Updated
- **CHAT_ARCHITECTURE.md** — Added recovery directive type
- **STAGE_1_IMPLEMENTATION.md** — Added provider implementation steps

### Existing (Still Valid)
- **PRODUCT_DEFINITION.md** — Product vision
- **OPERATOR_SHELL_ARCHITECTURE.md** — Full system architecture
- **UX_PRINCIPLES.md** — Design guidelines
- **API_CONTRACT_EXTENDED.md** — API reference
- **PHASE_8_FINAL.md** — Complete summary

---

## Final Architecture Principle

> **Vienna Operator Shell replaces OpenClaw as the UI.**
> 
> **Model providers (Anthropic, OpenClaw, local) are interchangeable reasoning engines.**
> 
> **Vienna Core remains the sole execution authority.**
> 
> **All side effects flow through the governed executor pipeline.**

---

## Next Steps

1. **Review PROVIDER_ARCHITECTURE.md** — Complete technical specification
2. **Implement provider layer** (Day 1-2 of Stage 1)
3. **Integrate with chat** (Day 3-4 of Stage 1)
4. **Test end-to-end** (Day 5 of Stage 1)
5. **Validate failover** — Critical test: Anthropic down → OpenClaw fallback works

---

**Vienna Operator Shell: Truly autonomous AI operating environment.**

**Status: Ready for Week 1 implementation with provider abstraction.**
