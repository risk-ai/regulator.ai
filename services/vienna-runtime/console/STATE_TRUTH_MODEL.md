# State Truth Model — Vienna Console Frontend

**Created:** 2026-03-14  
**Purpose:** Establish single source of truth for all system state in Vienna operator UI  
**Problem:** Contradictory provider/assistant status between dashboard and chat surfaces

---

## Core Problem

**Observed failure:**
```
Dashboard shows: providers healthy (green)
Chat banner shows: "Chat Unavailable — all providers unavailable"
```

**Root cause:** Multiple disconnected state sources with conflicting interpretations.

---

## State Domains

Vienna UI must distinguish these separate state domains:

### 1. Provider Health
**What it means:** Whether external LLM provider endpoints (Anthropic, Ollama) respond to requests

**Source of truth:** `ProviderHealthService` (backend)  
**Endpoint:** `GET /api/v1/system/providers/health`  
**States:**
- `healthy` — Recent successful executions, acceptable latency
- `degraded` — >20% failures OR high latency
- `unavailable` — >50% failures OR in cooldown OR unreachable
- `unknown` — No execution history yet (NOT failure)

**Current consumers:**
- `useProviderHealth.ts` (frontend hook)
- `ProviderStatusBanner.tsx` (chat surface)
- `ProviderHealthPanel.tsx` (dashboard panel)

**Refresh cadence:** 5s polling

**Conflict condition:** Dashboard and chat interpret `unknown` differently
- Chat: treats `unknown` as unavailable (WRONG)
- Dashboard: shows `unknown` as healthy (WRONG)

**Truth:** `unknown` means "untested but available" — should NOT block chat

---

### 2. Assistant Availability
**What it means:** Whether Vienna Chat can currently accept and process operator messages

**NOT the same as Provider Health.**

**Factors:**
- Provider health (can we route to Anthropic/Ollama?)
- Runtime availability (is Vienna Core responding?)
- Chat service availability (is chat route functional?)
- Cooldown state (are we in provider cooldown?)
- Session state (is operator authenticated?)

**Current state:** No explicit backend model for this

**Current behavior:**
- Chat route checks provider health inline
- Returns 503 if `allProvidersUnavailable`
- Frontend shows provider banner
- Chat input disabled

**Problem:** `allProvidersUnavailable` logic treats `unknown` as unavailable

**Required fix:**
```javascript
// WRONG (current)
const allProvidersUnavailable = providers.every(p => p.status !== 'healthy');

// RIGHT (required)
const allProvidersUnavailable = providers.every(p => p.status === 'unavailable');
```

**Proposed source of truth:** New backend aggregator at `GET /api/v1/status/assistant`

```json
{
  "available": true,
  "reason": null,
  "providers": {
    "anthropic": "healthy",
    "local": "unknown"
  },
  "degraded": false
}
```

OR

```json
{
  "available": false,
  "reason": "provider_cooldown",
  "cooldown_until": "2026-03-14T02:15:00Z",
  "providers": {
    "anthropic": "unavailable",
    "local": "unavailable"
  }
}
```

---

### 3. Runtime Health
**What it means:** Whether Vienna Core execution runtime is functioning

**Components:**
- Execution pipeline operational
- Queue healthy
- State Graph accessible
- Watchdog active
- Reconciliation gate functional

**Source of truth:** Vienna Core health checks  
**Endpoint:** `GET /api/v1/status` (current, incomplete)

**Current status fields:**
```typescript
{
  runtime_mode: 'normal' | 'degraded' | 'local-only' | 'operator-only',
  chat_available: boolean, // WRONG - conflates runtime and assistant
  providers: { ... },
  ...
}
```

**Problem:** `chat_available` is derived from provider health, not runtime health

**Required separation:**
- `runtime.status` — Is execution runtime healthy?
- `assistant.status` — Is chat interface available?

---

### 4. Reconciliation State
**What it means:** Current autonomous reconciliation activity

**Source of truth:** Reconciliation Control Plane (Phase 10)  
**Endpoint:** `GET /api/v1/reconciliation/activity`

**Current state:**
- Objectives with reconciliation status
- Execution leases
- Circuit breaker states
- Timeline events

**Consumers:**
- Runtime page panels
- Now page summary

**Refresh cadence:** 10s polling

**No conflicts observed** — this domain is well-isolated

---

### 5. Execution State
**What it means:** Current and recent execution activity

**Source of truth:** Execution Ledger  
**Endpoint:** `GET /api/v1/executions/recent`

**Current state:**
- Recent executions
- Success/failure counts
- Execution timelines

**Consumers:**
- Runtime page
- Execution history views

**No conflicts observed**

---

### 6. Workspace State
**What it means:** Available files, artifacts, reports in operator workspace

**Source of truth:** Filesystem (via backend file service)  
**Endpoint:** `GET /api/v1/files/workspace` (if exists)

**Current state:** Unclear if backend support exists

**Consumers:**
- `FileTreePanel.tsx`
- Workspace rail

**Known issue:** Workspace UI may be placeholder with no real data source

---

### 7. Session State
**What it means:** Operator authentication and session validity

**Source of truth:** AuthService (backend)  
**Endpoint:** `GET /api/v1/auth/session`

**States:**
- `authenticated` — Valid session, operator logged in
- `unauthenticated` — No session or expired
- `expiring` — Session near expiration

**Consumers:**
- Auth middleware (backend)
- LoginScreen (frontend)
- Global 401 handler (logout on session expiry)

**Refresh cadence:** On-demand + 401 response triggers

**No conflicts observed** — well-isolated

---

### 8. Console Backend Health
**What it means:** Whether the console server itself is responsive

**Source of truth:** HTTP connectivity to console server

**Implicit monitoring:**
- If any API call succeeds → backend healthy
- If all API calls fail → backend unreachable

**No explicit health check**

**Proposed:** Lightweight heartbeat endpoint `GET /api/v1/health`

```json
{
  "status": "healthy",
  "uptime_seconds": 43210,
  "timestamp": "2026-03-14T01:45:00Z"
}
```

---

## State Source Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ TRUTH LAYER 1: Runtime Measurements                    │
│ - Provider execution metrics (ProviderHealthService)    │
│ - Reconciliation state (State Graph)                    │
│ - Execution ledger (State Graph)                        │
│ - Session validity (AuthService)                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ TRUTH LAYER 2: Aggregated Status                       │
│ - Assistant availability (provider + runtime + cool)    │
│ - Runtime health (execution + queue + watchdog)         │
│ - System posture (runtime + reconciliation + exec)      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ VIEW LAYER: Frontend UI Components                     │
│ - Provider panels                                       │
│ - Chat interface                                        │
│ - Runtime pages                                         │
│ - Now dashboard                                         │
└─────────────────────────────────────────────────────────┘
```

**Core principle:** Frontend must NOT derive aggregated status. Backend provides authoritative aggregations.

---

## Current State Flow Issues

### Issue 1: Provider Health Misinterpretation

**Location:** `useProviderHealth.ts`

```typescript
// WRONG: Treats "unknown" as unavailable
const allProvidersUnavailable = Object.values(health.providers).every(
  (p) => p.status === 'unavailable'
);
```

**Fix required:** Exclude `unknown` from unavailable check

**Impact:** Chat shows "unavailable" on first load when providers are actually usable

---

### Issue 2: Chat Route Provider Check

**Location:** `console/server/src/routes/chat.ts`

```typescript
// Provider availability check
const anyProviderAvailable = 
  anthropic.status === 'healthy' || local.status === 'healthy' ||
  anthropic.status === 'unknown' || local.status === 'unknown';
```

**Current:** Correctly treats `unknown` as available  
**Status:** No fix needed for this check

**BUT:** Frontend still shows contradictory banner

---

### Issue 3: Dashboard Provider Panel

**Location:** `ProviderHealthPanel.tsx`

**Current behavior:** Shows provider metrics from health endpoint

**Suspected issue:** May show "healthy" when status is "unknown"

**Needs audit:** Visual representation of `unknown` vs `healthy` states

---

### Issue 4: `chat_available` Field

**Location:** `console/server/src/app.ts` (health endpoint)

```typescript
chat_available: false, // Default
```

**Problem:** This field conflates runtime health and assistant availability

**Current derivation:**
```typescript
providerHealth.chat_available = 
  Object.values(providers).some(p => p.status === 'healthy' || p.status === 'unknown');
```

**Issues:**
- Mixes provider state with chat availability
- Does not account for cooldowns
- Does not reflect runtime degradation

**Fix required:** Remove this field OR redefine as explicit assistant availability aggregation

---

## Required Backend Changes

### 1. New Endpoint: `/api/v1/status/assistant`

```typescript
interface AssistantStatusResponse {
  available: boolean;
  reason: null | 'provider_cooldown' | 'runtime_degraded' | 'no_providers' | 'service_unavailable';
  cooldown_until: string | null;
  providers: Record<string, ProviderHealthState>;
  degraded: boolean;
}
```

**Logic:**
```typescript
available = anyProviderHealthyOrUnknown && !allInCooldown && runtimeHealthy
```

**Benefits:**
- Single authoritative source
- Clear unavailability reasons
- Cooldown countdown support
- Decouples from provider health

---

### 2. Refactor: `/api/v1/status` (System Status)

**Remove:** `chat_available` field  
**Add:** Separate `runtime` and `assistant` objects

```typescript
interface SystemStatusResponse {
  runtime: {
    status: 'healthy' | 'degraded' | 'unavailable';
    mode: 'normal' | 'degraded' | 'local-only' | 'operator-only';
    uptime_seconds: number;
  };
  assistant: {
    available: boolean;
    reason: string | null;
    cooldown_until: string | null;
  };
  reconciliation: {
    active_count: number;
    degraded_count: number;
  };
  session: {
    authenticated: boolean;
    expires_at: string | null;
  };
  timestamp: string;
}
```

---

### 3. Enhance: `/api/v1/system/providers/health`

**Current:** Returns provider-level health  
**Keep as-is:** This endpoint is provider-focused and correct

**No changes needed** except frontend interpretation

---

## Required Frontend Changes

### 1. Fix `useProviderHealth.ts`

```typescript
// BEFORE
const allProvidersUnavailable = Object.values(health.providers).every(
  (p) => p.status === 'unavailable'
);

// AFTER
const allProvidersUnavailable = Object.values(health.providers).every(
  (p) => p.status === 'unavailable' // Excludes unknown, degraded, healthy
);
```

**Also fix:**
```typescript
// BEFORE
const anyProviderDegraded = Object.values(health.providers).some(
  (p) => p.status === 'degraded' || p.status === 'unavailable'
);

// AFTER (if "unknown" should not trigger warning)
const anyProviderDegraded = Object.values(health.providers).some(
  (p) => p.status === 'degraded' || p.status === 'unavailable'
);
// (Current is correct IF we want unknown to NOT show warning)
```

---

### 2. New Hook: `useAssistantStatus.ts`

```typescript
export function useAssistantStatus() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  
  // Poll /api/v1/status/assistant
  useEffect(() => {
    const poll = async () => {
      const data = await fetch('/api/v1/status/assistant').then(r => r.json());
      setStatus(data);
    };
    
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return {
    available: status?.available ?? true, // Default to available until proven otherwise
    reason: status?.reason ?? null,
    cooldownUntil: status?.cooldown_until ?? null,
  };
}
```

---

### 3. Update `ProviderStatusBanner.tsx`

**Use new `useAssistantStatus()` hook instead of raw provider health**

```tsx
export const ProviderStatusBanner: React.FC = () => {
  const { available, reason, cooldownUntil } = useAssistantStatus();
  const { health } = useProviderHealth();
  
  // Hide banner if assistant available
  if (available) return null;
  
  // Show banner with specific reason
  return (
    <div className="provider-status-banner severity-critical">
      <div className="banner-header">
        <span className="banner-icon">🚨</span>
        <span className="banner-title">Assistant Unavailable</span>
      </div>
      
      <div className="banner-body">
        {reason === 'provider_cooldown' && cooldownUntil && (
          <div>All providers in cooldown. Recovers at {formatTime(cooldownUntil)}.</div>
        )}
        
        {reason === 'runtime_degraded' && (
          <div>Runtime degraded. Assistant temporarily disabled.</div>
        )}
        
        {/* Provider details still shown for context */}
        <ProviderHealthList providers={health?.providers} />
      </div>
    </div>
  );
};
```

---

### 4. Update `ChatInput.tsx`

**Disable input based on assistant availability, not raw provider health**

```tsx
const { available, reason } = useAssistantStatus();

<input
  disabled={!available}
  placeholder={
    !available 
      ? `Assistant unavailable: ${reason}` 
      : "Message Vienna..."
  }
/>
```

---

### 5. Update Dashboard Provider Panel

**Show explicit state for `unknown`**

```tsx
{provider.status === 'unknown' && (
  <div className="provider-state-unknown">
    <span className="icon">?</span>
    <span className="label">Not yet used</span>
    <span className="description">Provider available but no execution history</span>
  </div>
)}
```

---

## Validation Criteria

### Test Scenario A: Fresh Start (No Execution History)

**Expected:**
- Provider health: `unknown` for all
- Assistant: `available = true`
- Chat input: enabled
- Banner: hidden
- Dashboard provider panel: shows "Not yet used" (not green, not red)

**Current behavior:**
- Banner shows "Chat Unavailable" (WRONG)
- Chat input disabled (WRONG)

---

### Test Scenario B: Provider Cooldown

**Expected:**
- Provider health: `unavailable` with cooldown timer
- Assistant: `available = false, reason = 'provider_cooldown'`
- Chat input: disabled
- Banner: visible with countdown timer
- Dashboard provider panel: shows "Unavailable" (red)

---

### Test Scenario C: One Provider Healthy, One Unknown

**Expected:**
- Provider health: `anthropic: healthy, local: unknown`
- Assistant: `available = true`
- Chat input: enabled
- Banner: hidden
- Dashboard: shows anthropic green, local gray/neutral

---

### Test Scenario D: Runtime Degraded, Providers Healthy

**Expected:**
- Provider health: `healthy`
- Assistant: `available = false, reason = 'runtime_degraded'`
- Chat input: disabled
- Banner: visible with "Runtime degraded" message
- Dashboard: providers green, runtime orange

---

## Implementation Priority

### P0 (Critical — Contradictory State)
1. ✅ Fix `useProviderHealth.ts` interpretation of `unknown`
2. ✅ Create `/api/v1/status/assistant` endpoint
3. ✅ Create `useAssistantStatus()` hook
4. ✅ Update `ProviderStatusBanner` to use assistant status
5. ✅ Update `ChatInput` to use assistant status

### P1 (High — Operator Trust)
6. ✅ Update dashboard provider panel to show `unknown` explicitly
7. ✅ Refactor `/api/v1/status` to separate runtime/assistant
8. ✅ Add runtime health aggregation
9. ✅ Update Now page to use new status model

### P2 (Medium — Polish)
10. Add `/api/v1/health` heartbeat endpoint
11. Add session expiry warnings
12. Add workspace state backend support
13. Add explicit error states for all surfaces

---

## Success Metrics

**State truth is correct when:**

1. ✅ Provider dashboard and chat banner never contradict on provider availability
2. ✅ `unknown` provider status does NOT disable chat
3. ✅ Cooldown state shows countdown timer, not generic "unavailable"
4. ✅ Runtime degradation distinct from provider failure
5. ✅ Operator can always see WHY assistant is unavailable (not just "unavailable")
6. ✅ Fresh start shows "assistant available, providers not yet tested" (not "chat unavailable")

---

## Rollout Plan

### Phase 1: Backend Truth Layer (2-3 hours)
- Implement `/api/v1/status/assistant` endpoint
- Refactor system status endpoint
- Add runtime health aggregation
- Test all scenarios A-D

### Phase 2: Frontend Integration (2-3 hours)
- Create `useAssistantStatus()` hook
- Update `ProviderStatusBanner`
- Update `ChatInput`
- Update provider panel

### Phase 3: Validation (1 hour)
- Manual testing of all scenarios
- Verify no regressions
- Document final state model

### Phase 4: Monitoring (Ongoing)
- Log state transitions
- Track contradictory state occurrences
- Alert on frontend-backend mismatches

---

## Open Questions

1. **Workspace state:** Does backend file service exist? If not, should workspace rail be disabled?
2. **Console health:** Should we add explicit heartbeat endpoint?
3. **Session warnings:** Should we show "session expires in 5m" warnings?
4. **Runtime mode:** Should `local-only` / `operator-only` modes affect assistant availability?

---

## References

**Backend files:**
- `console/server/src/services/providerHealthService.ts`
- `console/server/src/routes/chat.ts`
- `console/server/src/routes/status.ts`
- `console/server/src/app.ts`

**Frontend files:**
- `console/client/src/hooks/useProviderHealth.ts`
- `console/client/src/components/chat/ProviderStatusBanner.tsx`
- `console/client/src/components/chat/ChatInput.tsx`
- `console/client/src/components/ProviderHealthPanel.tsx`

**State Graph:**
- Provider health tracked in execution metrics
- Reconciliation state in `managed_objectives`
- Execution state in `execution_ledger_*`

---

**Status:** Draft 1.0 — Ready for implementation  
**Next:** Create UI_OVERHAUL_MASTER_PLAN.md with full phase breakdown
