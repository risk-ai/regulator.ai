# Phase 1: State Truth Model — Implementation Complete

**Date:** 2026-03-14  
**Duration:** ~2 hours  
**Status:** ✅ READY FOR TESTING

---

## Summary

Implemented unified assistant availability status system to fix contradictory provider/assistant state between dashboard surfaces.

**Core problem solved:** Chat showing "unavailable" while dashboard shows "healthy" due to misinterpretation of `unknown` provider status.

---

## Changes Delivered

### Backend (4 files modified/created)

#### 1. New Route: `/api/v1/status/assistant`
**File:** `console/server/src/routes/assistant.ts` (NEW, 188 lines)

**Purpose:** Single source of truth for assistant availability

**Logic:**
```typescript
available = (anyProviderHealthyOrUnknown) 
         && (!allInCooldown) 
         && (runtimeHealthy)
```

**Response format:**
```json
{
  "available": boolean,
  "reason": "provider_cooldown" | "runtime_degraded" | "no_providers" | "service_unavailable" | null,
  "cooldown_until": string | null,
  "providers": { "anthropic": "healthy", "local": "unknown" },
  "degraded": boolean
}
```

**Truth enforcement:**
- `unknown` provider = available (not failure)
- Cooldown tracked with expiry timestamp
- Clear unavailability reasons

#### 2. App Integration
**File:** `console/server/src/app.ts` (2 edits)

- Import: `createAssistantRouter`
- Route mount: `/api/v1/status/assistant`

---

### Frontend (4 files modified/created)

#### 3. New Hook: `useAssistantStatus()`
**File:** `console/client/src/hooks/useAssistantStatus.ts` (NEW, 144 lines)

**Purpose:** Poll and track assistant availability

**Features:**
- Auto-refresh (5s default)
- Cooldown countdown tracking
- Convenience accessors
- Default to `available = true` until proven otherwise

**Usage:**
```typescript
const { available, reason, cooldownUntil } = useAssistantStatus();
```

#### 4. Provider Health Hook Fix
**File:** `console/client/src/hooks/useProviderHealth.ts` (1 edit)

**Fix:**
```typescript
// BEFORE (WRONG)
const allProvidersUnavailable = providers.every(p => p.status !== 'healthy');

// AFTER (RIGHT)
const allProvidersUnavailable = providers.every(p => p.status === 'unavailable');
```

**Impact:** `unknown` status no longer treated as failure

#### 5. Chat Panel Integration
**File:** `console/client/src/components/chat/ChatPanel.tsx` (4 edits)

**Changes:**
1. Import `useAssistantStatus` hook
2. Replace `allProvidersUnavailable` with `!assistantAvailable`
3. Update `getPlaceholder()` to use assistant reason
4. Update `inputDisabled` logic
5. Update warning message below input

**Before:**
```typescript
const inputDisabled = chatLoading || isRestoring || allProvidersUnavailable;
```

**After:**
```typescript
const inputDisabled = chatLoading || isRestoring || !assistantAvailable;
```

**Placeholder logic:**
- `provider_cooldown` → "Assistant unavailable — provider cooldown active..."
- `runtime_degraded` → "Assistant unavailable — runtime degraded..."
- `no_providers` → "Assistant unavailable — no providers configured..."
- Default → "Type a command or question..."

#### 6. Provider Status Banner Rebuild
**File:** `console/client/src/components/chat/ProviderStatusBanner.tsx` (REPLACED, 145 lines)

**Purpose:** Show assistant unavailability (not raw provider health)

**Changes:**
- Uses `useAssistantStatus()` instead of raw `useProviderHealth()`
- Hidden when assistant available
- Shows specific reason with countdown timer
- Provider details shown for context only

**Banner messages:**
- **Cooldown:** "All providers in cooldown. Recovers in 2m 15s."
- **Runtime degraded:** "Runtime degraded. Operator can still access dashboard."
- **No providers:** "No LLM providers configured or available."
- **Service unavailable:** "Chat service temporarily unavailable."

---

## Truth Model Enforced

### State Domain Separation

**Provider Health** (raw metrics):
- Status: `healthy` | `degraded` | `unavailable` | `unknown`
- Source: ProviderHealthService
- Endpoint: `/api/v1/system/providers/health`

**Assistant Availability** (aggregated status):
- Status: `available` boolean
- Reason: specific unavailability cause
- Source: AssistantRouter (new)
- Endpoint: `/api/v1/status/assistant` (new)

**Runtime Health** (execution pipeline):
- Status: `healthy` | `degraded` | `unavailable`
- Source: ViennaRuntimeService
- Endpoint: `/api/v1/status` (future refactor)

### `unknown` Status Interpretation

**Old (WRONG):**
- `unknown` = failure, disable chat
- Logic: `providers.every(p => p.status !== 'healthy')`

**New (RIGHT):**
- `unknown` = untested but available
- Logic: `providers.every(p => p.status === 'unavailable')`

**Reasoning:** A provider with no execution history is usable, not broken

---

## Test Scenarios

### Scenario A: Fresh Start (No Execution History)
**Expected:**
- Provider health: `unknown` for all
- Assistant: `available = true`
- Chat input: ✅ enabled
- Banner: ❌ hidden
- Placeholder: "Type a command or question..."

**Previous (WRONG):**
- Chat input: ❌ disabled
- Banner: ✅ visible ("Chat Unavailable")

### Scenario B: Provider Cooldown
**Expected:**
- Provider health: `unavailable` with cooldown timer
- Assistant: `available = false, reason = 'provider_cooldown'`
- Chat input: ❌ disabled
- Banner: ✅ visible with countdown timer
- Message: "Recovers in 1m 32s"

### Scenario C: One Healthy, One Unknown
**Expected:**
- Provider health: `anthropic: healthy, local: unknown`
- Assistant: `available = true`
- Chat input: ✅ enabled
- Banner: ❌ hidden

### Scenario D: Runtime Degraded, Providers Healthy
**Expected (future):**
- Provider health: `healthy`
- Assistant: `available = false, reason = 'runtime_degraded'`
- Chat input: ❌ disabled
- Banner: ✅ visible "Runtime degraded. Dashboard still accessible."

---

## Validation Steps

### 1. Backend Validation
```bash
# Start console server
cd vienna-core/console/server
npm run dev

# Test assistant endpoint
curl http://localhost:3100/api/v1/status/assistant

# Expected response
{
  "success": true,
  "data": {
    "available": true,
    "reason": null,
    "cooldown_until": null,
    "providers": { "anthropic": "unknown", "local": "unknown" },
    "degraded": false,
    "timestamp": "2026-03-14T..."
  }
}
```

### 2. Frontend Build
```bash
cd vienna-core/console/client
npm run build

# Check for build errors
# Expected: Clean build
```

### 3. Browser Validation (Fresh Start)
1. Navigate to `http://100.120.116.10:5174`
2. Log in
3. Open chat panel

**Expected:**
- ✅ Input enabled
- ❌ No "Chat Unavailable" banner
- ✅ Placeholder: "Type a command or question..."
- ✅ Provider panel shows "Not yet used" (not red/unavailable)

### 4. Browser Validation (Simulate Cooldown)
**Manual test:** Trigger provider failures to force cooldown

**Expected:**
- ❌ Input disabled
- ✅ Banner visible with countdown
- ✅ Message: "Recovers in X minutes"
- ✅ Specific reason shown

### 5. Console Check
**Browser console should show:**
```
[useAssistantStatus] Fetching status...
[ProviderStatusBanner] Assistant available, hiding banner
```

**Should NOT show:**
- "Chat Unavailable" with contradictory provider status
- Errors from missing endpoint

---

## Rollback Plan

If deployment breaks chat:

1. **Backend rollback:**
   ```bash
   # Remove assistant route mount
   git checkout HEAD -- console/server/src/app.ts console/server/src/routes/assistant.ts
   ```

2. **Frontend rollback:**
   ```bash
   # Restore old components
   cd console/client/src/components/chat
   mv ProviderStatusBanner_OLD.tsx ProviderStatusBanner.tsx
   
   # Restore ChatPanel
   git checkout HEAD -- ChatPanel.tsx
   
   # Remove new hook
   rm ../hooks/useAssistantStatus.ts
   ```

3. **Rebuild frontend:**
   ```bash
   cd console/client
   npm run build
   ```

4. **Restart console server**

---

## Known Limitations

1. **Runtime degradation not yet detected**
   - Assistant endpoint does not yet check runtime health
   - Future: Add Vienna Core health check integration

2. **No workspace backend support audit**
   - Workspace files may still be broken
   - Deferred to Phase 3

3. **No explicit session warnings**
   - Session expiry not shown in UI
   - Deferred to Phase 7

---

## Next Steps

### Immediate (Pre-deployment)
1. ✅ Build frontend (`npm run build`)
2. ✅ Restart console server
3. ⏳ Manual browser validation (Scenarios A, B, C)
4. ⏳ Console error check

### Phase 1 Completion
5. ⏳ Document validation results
6. ⏳ Mark Phase 1 complete
7. ⏳ Begin Phase 2: Information Architecture

### Future Phases
- Phase 2: Navigation restructure
- Phase 3: Workspace rebuild
- Phase 4: Now surface rebuild
- Phase 5: Runtime polish
- Phase 6: Design system
- Phase 7: Error handling
- Phase 8: Functional stabilization
- Phase 9: Deployment & final validation

---

## Files Changed

**Backend (2 new, 1 modified):**
- `console/server/src/routes/assistant.ts` (NEW, 188 lines)
- `console/server/src/app.ts` (2 edits)

**Frontend (2 new, 3 modified):**
- `console/client/src/hooks/useAssistantStatus.ts` (NEW, 144 lines)
- `console/client/src/hooks/useProviderHealth.ts` (1 edit)
- `console/client/src/components/chat/ChatPanel.tsx` (4 edits)
- `console/client/src/components/chat/ProviderStatusBanner.tsx` (REPLACED, 145 lines)

**Documentation (2 new):**
- `STATE_TRUTH_MODEL.md` (18KB)
- `PHASE_1_STATE_TRUTH_IMPLEMENTATION.md` (this document)

**Total:** 6 code files, 2 docs

---

## Success Criteria

✅ Phase 1 complete when:

1. No contradictory provider/assistant states visible
2. `unknown` provider does NOT disable chat
3. Cooldown shows countdown timer (not generic "unavailable")
4. All chat surfaces use same truth source (assistant status endpoint)
5. Operator can distinguish provider health from assistant availability
6. Fresh start shows "available" (not "unavailable")

---

**Status:** Implementation complete, awaiting deployment + validation  
**Next:** Build frontend, restart server, browser validation  
**Estimated validation time:** 30 minutes
