# Vienna Provider Health Status

## Overview

This document specifies the provider health monitoring system in Vienna Core, including health check mechanics, fallback behavior, and false positive/negative scenarios.

**Status**: Verified as truthful by Hardenberg (2026-03-11)

---

## Health Check Infrastructure

### Components

**ProviderManager** (`lib/providers/manager.ts`)
- Maintains `healthTracking: Map<string, ProviderHealth>` for all registered providers
- Periodically runs health checks via background interval
- Records success/failure and manages cooldowns

**ProviderManagerBridge** (`console/server/src/integrations/providerManager.ts`)
- Type-safe wrapper exposing ProviderManager to server/API layer
- Routes requests through policy-based provider selection
- No direct provider implementation

**Providers** (implements ModelProvider interface)
- `AnthropicProvider` (`lib/providers/anthropic/`)
- `LocalProvider` (`lib/providers/local/`)
- Each implements `isHealthy(): Promise<boolean>`

### Health Check Cycle

```
ProviderManager.start()
    ↓ (every 30s by default)
    ├→ For each provider:
    │   ├→ Skip if in cooldown
    │   ├→ Call provider.isHealthy()
    │   ├→ Record success/failure + latency
    │   └→ Update cooldown if failures exceed threshold
    ↓
Tracked in healthTracking Map
    ↓
Exposed via API/getHealthyProvider()
```

---

## ProviderHealth Data Structure

### Fields

```typescript
interface ProviderHealth {
  provider: string;                    // e.g., 'anthropic', 'openclaw'
  status: 'healthy' | 'degraded' | 'unavailable';
  lastCheckedAt: string;               // ISO timestamp of last health check
  lastSuccessAt: string | null;        // ISO timestamp of last successful call
  lastFailureAt: string | null;        // ISO timestamp of last failure
  cooldownUntil: string | null;        // ISO timestamp when provider re-enabled
  latencyMs: number | null;            // Latest health check latency
  errorRate: number | null;            // Failure rate (implementation: reserved, not computed)
  consecutiveFailures: number;         // Count of consecutive failures
}
```

### Status Semantics

| Status | Condition | Selection | Cooldown |
|--------|-----------|-----------|----------|
| `healthy` | 0 consecutive failures, not in cooldown | ✅ Available for selection | None |
| `degraded` | 1-2 consecutive failures, not in cooldown | ✅ Available for selection (if primary unavailable) | None |
| `unavailable` | ≥3 consecutive failures | ❌ Skipped | Yes, until cooldownUntil expires |

---

## Health Check Implementation

### Provider Interface

Each provider implements:

```typescript
interface ModelProvider {
  name: string;
  isHealthy(): Promise<boolean>;
  sendMessage(request: MessageRequest): Promise<MessageResponse>;
  // ... other methods
}
```

### Anthropic Provider Health Check

```typescript
// AnthropicProvider.isHealthy()
// Sends lightweight request to Anthropic API
// Returns true if response received, false if error/timeout
```

**True positive**: API responds → returns `true` → status = `healthy` ✅  
**True negative**: API unavailable → returns `false` → status = `degraded`/`unavailable` ✅

### Local Provider (OpenClaw Gateway) Health Check

```typescript
// LocalProvider.isHealthy()
// Checks connectivity to openclaw gateway (localhost:18789)
// Lightweight ping/status endpoint (if available)
```

**True positive**: Gateway responsive → returns `true` → status = `healthy` ✅  
**True negative**: Gateway down → returns `false` → status = `degraded`/`unavailable` ✅

---

## Fallback and Selection Policy

### Policy Configuration

```typescript
interface ProviderSelectionPolicy {
  primaryProvider: string;              // Default: 'anthropic'
  fallbackOrder: string[];              // Default: ['anthropic', 'openclaw']
  cooldownMs: number;                   // Default: 60000 (1 minute)
  maxConsecutiveFailures: number;       // Default: 3
  healthCheckInterval: number;          // Default: 30000 (30 seconds)
  stickySession: boolean;               // Default: true
}
```

### Selection Algorithm

```javascript
async getHealthyProvider(threadId) {
  // 1. Sticky session: prefer provider from active thread
  if (threadId && stickySession) {
    const stickyProvider = activeThreads.get(threadId);
    if (stickyProvider && isHealthy(stickyProvider) && !isInCooldown(stickyProvider)) {
      return stickyProvider;
    }
  }
  
  // 2. Try primary provider first
  if (isAvailable(primaryProvider)) {
    recordThreadProvider(threadId, primaryProvider);
    return primaryProvider;
  }
  
  // 3. Try fallbacks in order
  for (const name of fallbackOrder) {
    if (isAvailable(name)) {
      warn(`Primary unavailable, using fallback: ${name}`);
      recordThreadProvider(threadId, name);
      return name;
    }
  }
  
  // 4. No healthy providers
  throw new Error('No healthy providers available');
}

// isAvailable = !isInCooldown && status === 'healthy'
```

### Sticky Session

- **Enabled by default** (stickySession = true)
- Maps threadId → provider name
- Keeps single conversation thread on same provider (consistency)
- Overridden if selected provider becomes unavailable during thread

---

## Failure Classification

### Failure Recording

```javascript
// On provider call failure
async recordFailure(providerName, error) {
  const health = healthTracking.get(providerName);
  
  health.lastFailureAt = now();
  health.consecutiveFailures++;
  
  if (consecutiveFailures >= maxConsecutiveFailures) {
    health.status = 'unavailable';
    health.cooldownUntil = now() + cooldownMs;  // 1 minute from now
    log(`Provider ${name} entering cooldown`);
  } else {
    health.status = 'degraded';
  }
}
```

### Failure Persistence

**Not persistent across restarts**:
- Failure counters reset on ProviderManager restart
- cooldownUntil is in-memory only
- Next startup assumes `status = 'healthy'` (no prior state loaded)

**Implication**: If provider was in cooldown on crash, cooldown is cleared on restart (feature, not bug—assumes transient failure)

---

## False Positive / Negative Scenarios

### False Positives (Report healthy when degraded/unavailable)

#### Scenario 1: Network Timeout, Provider Actually Down

**Sequence**:
1. Health check times out waiting for Anthropic API response
2. isHealthy() returns `false` due to timeout
3. consecutiveFailures incremented
4. Provider marked `degraded` after 1 failure

**Verdict**: **Not a false positive** — timeout correctly indicates unavailability

**Mitigation**: Aggressive timeout (5-10s) prevents hanging on dead providers

#### Scenario 2: Health Check Succeeds, Message Call Fails

**Sequence**:
1. Health check 30s ago: Anthropic responded → status = `healthy`
2. User sends message → Anthropic API is now rate-limiting
3. sendMessage() fails → recordFailure() called
4. consecutiveFailures incremented (not yet unavailable)

**Verdict**: **Unavoidable transient condition**

**Mitigation**:
- Health checks run every 30s (tight monitoring)
- Failure recorded immediately on sendMessage
- Status updates quickly on next health check
- Degradation state allows fallback selection

#### Scenario 3: Health Check Passes, Provider Misconfigured

**Sequence**:
1. Anthropic provider health check: "Is API reachable?" → Yes
2. sendMessage() call: "Process request with API key X" → Invalid key error
3. recordFailure() called → degraded

**Verdict**: **False positive** — health check should validate API key

**Current Implementation**: ❌ Not checked in health verification  
**Recommendation (Phase 7.5+)**: Add credential validation to isHealthy()

---

### False Negatives (Report unavailable when actually healthy)

#### Scenario 1: Cooldown Overstay

**Sequence**:
1. Anthropic has 3 consecutive failures (transient issue)
2. cooldownUntil = now + 60s → status = `unavailable`
3. After 30s, Anthropic recovers
4. Health check still skipped because in cooldown
5. User request fails because provider marked unavailable

**Verdict**: **False negative** — provider healthy but unavailable to users for up to 60s

**Mitigation**: Configurable cooldownMs (default 60s is reasonable)

**Note**: Sticky sessions minimize impact (thread stays on fallback provider if switched)

#### Scenario 2: Health Check Scheduled Just Before Failure

**Sequence**:
1. Health check 29s ago: Anthropic healthy
2. At 29.5s: Anthropic API starts degrading
3. At 30s: Health check runs, but with 30-40ms timeout (fast failure detection)
4. Report: degraded
5. At 35s: Anthropic recovers
6. At 60s: Health check runs, status = healthy again

**Verdict**: **Acceptable latency** — 30s check interval limits false negative window

**Trade-off**: More frequent checks (10s) increase API load; less frequent (60s) increase false negative window

---

## Truthfulness Verification (Hardenberg)

### Claims Verified

1. **Status field accurately reflects provider state**
   - ✅ `healthy` = last 30s check passed, <3 consecutive failures
   - ✅ `degraded` = 1-2 recent failures
   - ✅ `unavailable` = ≥3 consecutive failures + cooldown active

2. **Fallback selection respects policy**
   - ✅ Primary tried first
   - ✅ Fallbacks in defined order
   - ✅ Cooldown prevents re-selection until expired

3. **Sticky sessions improve consistency**
   - ✅ Single thread stays on chosen provider
   - ✅ Overridden only if provider unavailable

4. **No provider reporting false health**
   - ✅ Anthropic reports actual API connectivity
   - ✅ OpenClaw reports actual gateway connectivity
   - ⚠️ No credential validation (see false positive scenario 3)

### Unverified Edge Cases

- Behavior under sustained (>3min) provider outage
- Cooldown expiry race conditions (health check + message call same instant)
- Thread provider cleanup if thread ends during fallback

---

## Operational Guidance

### Monitoring Health Endpoint

**Endpoint**: GET `/api/v1/providers/health` (via ProviderManagerBridge)

**Response**:
```json
{
  "anthropic": {
    "provider": "anthropic",
    "status": "healthy",
    "lastCheckedAt": "2026-03-11T21:33:30Z",
    "lastSuccessAt": "2026-03-11T21:33:30Z",
    "lastFailureAt": null,
    "cooldownUntil": null,
    "latencyMs": 45,
    "errorRate": 0.0,
    "consecutiveFailures": 0
  },
  "openclaw": {
    "provider": "openclaw",
    "status": "degraded",
    "lastCheckedAt": "2026-03-11T21:33:30Z",
    "lastSuccessAt": "2026-03-11T21:33:00Z",
    "lastFailureAt": "2026-03-11T21:33:25Z",
    "cooldownUntil": null,
    "latencyMs": 2500,
    "errorRate": 0.33,
    "consecutiveFailures": 1
  }
}
```

### Alerting Thresholds

**Yellow Alert** (monitor):
- Any provider status = `degraded` for >5 minutes

**Red Alert** (page on-call):
- All providers status = `unavailable`
- Primary provider status = `unavailable` for >10 minutes

---

## Compliance with Test Suite

### Test: `provider-integration.test.js`

- ✅ Provider selection respects health status
- ✅ Fallback triggered on primary failure
- ✅ Sticky sessions preserve provider choice per thread
- ✅ Cooldown blocks provider re-selection

### Test Coverage Gap

- ❌ No test for credential validation in health checks
- ❌ No test for concurrent message + health check failure race
- ❌ No test for cooldown expiry edge case

---

## Future Improvements (Phase 7.5+)

1. **Persistent health history**: Save health snapshots to DB for trend analysis
2. **Predictive degradation**: ML-based cooldown adjustment
3. **Credential validation**: Validate API keys during health checks
4. **Custom health metrics**: Provider-specific health indicators (quota, rate-limit window)
5. **Per-message provider override**: Allow explicit provider selection on sendMessage

---

## See Also

- `lib/providers/manager.ts` — ProviderManager implementation
- `console/server/src/integrations/providerManager.ts` — Bridge to server
- `console/server/src/routes/providers.ts` — HTTP endpoints
- `lib/providers/anthropic/` — Anthropic provider implementation
- `lib/providers/local/` — OpenClaw gateway provider implementation
- `tests/integration/provider-integration.test.js` — Test suite
