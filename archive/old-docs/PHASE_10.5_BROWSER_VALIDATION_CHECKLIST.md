# Phase 10.5 Browser Validation Checklist

**Date:** 2026-03-14 00:26 EDT  
**URL:** http://100.120.116.10:5174  
**Status:** Ready for manual validation

---

## Pre-flight Checks ✅

**Backend services:**
- ✅ Vienna console server running (localhost:3100)
- ✅ Frontend dev server running (localhost:5174)
- ✅ Health endpoint responding (HTTP 200)
- ✅ Providers unavailable (expected test condition)
- ✅ Reconciliation endpoints present (returning 401 before auth)

**API endpoints verified:**
- ✅ `/health` → 200 OK (runtime healthy, providers unavailable)
- ✅ `/api/v1/reconciliation/activity` → 401 (auth required, route exists)
- ✅ `/api/v1/reconciliation/leases` → 401 (auth required, route exists)
- ✅ `/api/v1/reconciliation/breakers` → 401 (auth required, route exists)
- ✅ `/api/v1/reconciliation/timeline` → 401 (auth required, route exists)

---

## Control-Plane Dashboard Validation

**Navigate to:** Control-Plane tab

### 1. Reconciliation Activity Panel
- [ ] Panel renders without errors
- [ ] "No active reconciliations" message displays (expected: no objectives yet)
- [ ] Panel shows proper empty state

### 2. Execution Leases Panel
- [ ] Panel renders without errors
- [ ] "No active execution leases" message displays (expected: no active leases)
- [ ] Panel shows proper empty state

### 3. Circuit Breakers Panel
- [ ] Panel renders without errors
- [ ] "No circuit breakers active" message displays (expected: no breakers)
- [ ] Panel shows proper empty state

### 4. Reconciliation Timeline
- [ ] Timeline renders without errors
- [ ] "No reconciliation events in the last 24 hours" displays (expected: no events)
- [ ] Timeline shows proper empty state

### 5. Runtime Control Panel
- [ ] Panel renders without errors
- [ ] Safe mode toggle displays
- [ ] Safe mode status shows current state
- [ ] Control buttons render properly

### 6. Execution Pipeline Panel
- [ ] Panel renders without errors
- [ ] Pipeline visualization displays
- [ ] Shows proper empty state or initialization state

**DevTools check:**
- [ ] No critical console errors
- [ ] `/api/v1/reconciliation/*` endpoints return 200 after login
- [ ] No infinite polling loops
- [ ] No 404 errors on reconciliation endpoints

---

## Now/Chat Window Validation

**Navigate to:** Now tab (chat interface)

### 7. Provider Status Banner
- [ ] Banner displays when providers unavailable
- [ ] Banner message: "Chat currently unavailable" (or similar)
- [ ] Banner color/styling indicates degraded state
- [ ] Banner includes provider status details

### 8. Input Disabling During Cooldown
- [ ] Input field disabled when chat unavailable
- [ ] Disabled state visually indicated (grayed out, etc.)
- [ ] Placeholder text indicates why disabled
- [ ] Submit button disabled

### 9. Message Badges
- [ ] Classification badges render (informational, executable, unknown)
- [ ] Badge colors appropriate for classification
- [ ] Badges positioned correctly in messages

### 10. Relative Timestamps
- [ ] Timestamps display in relative format ("2 minutes ago", etc.)
- [ ] Timestamps update on hover or periodically
- [ ] Format is human-readable

### 11. Empty State
- [ ] Empty state displays when no messages
- [ ] Vienna-specific examples shown:
  - [ ] "show status"
  - [ ] "restart openclaw-gateway"
  - [ ] "ask openclaw what services are running"
- [ ] Examples are actionable (not generic assistant examples)

### 12. Loading State
- [ ] Loading indicator appears during request
- [ ] Loading state shows provider name being used
- [ ] Loading state clears after response/error

### 13. Provider Error Handling
- [ ] Provider errors display as system messages (not chat content)
- [ ] Error messages are clear and actionable
- [ ] No noisy error spam appears as repeated chat messages
- [ ] Single error message per failure, not duplicates

**DevTools check:**
- [ ] No critical console errors in chat UI
- [ ] No TypeScript compilation errors
- [ ] WebSocket/SSE connections stable
- [ ] Message rendering performant

---

## Critical Validation Points

**Highest value fixes to verify:**

1. **Provider/runtime problems no longer masquerade as chat content**
   - [ ] Provider unavailable → system banner, NOT chat message
   - [ ] Runtime degraded → system indicator, NOT chat response
   - [ ] Errors are distinct from conversational content

2. **Input disabling when requests cannot succeed**
   - [ ] Chat input disabled when providers down
   - [ ] Clear indication of WHY disabled
   - [ ] No false affordances (no "type here" when system can't respond)

3. **Vienna-specific empty state**
   - [ ] Examples are Vienna actions, not generic assistant queries
   - [ ] Examples match actual available commands
   - [ ] No ChatGPT-style conversation starters

---

## Regression Checks

**Verify no breakage in existing functionality:**

- [ ] Login still works
- [ ] Dashboard navigation functional
- [ ] Objectives tab still renders
- [ ] Settings/configuration still accessible
- [ ] SSE event stream still connected
- [ ] No white screens or React errors

---

## Known Acceptable States

**During observation window, these are EXPECTED:**

- Empty reconciliation panels (no objectives created yet)
- Providers unavailable (intentional test condition)
- Chat input disabled (correct response to provider unavailability)
- No execution events in timeline (no autonomous activity yet)

**These are NOT failures** — they are correct governed behavior.

---

## Browser Test Environment

**Recommended:**
- Chrome/Edge DevTools open
- Network tab monitoring API calls
- Console tab watching for errors
- Preserve log enabled
- Disable cache during testing

**Test flows:**
1. Fresh page load (hard refresh)
2. Navigate between tabs
3. Attempt chat input (should be disabled)
4. Check all control-plane panels
5. Verify no console errors accumulate

---

## Success Criteria

**Control-Plane Dashboard:**
- ✅ All 6 panels render without errors
- ✅ Empty states display correctly
- ✅ No 404s on reconciliation endpoints
- ✅ No infinite polling loops

**Now/Chat Window:**
- ✅ Provider status banner functional
- ✅ Input correctly disabled when providers down
- ✅ Vienna-specific examples shown
- ✅ No provider errors as chat messages
- ✅ Message badges and timestamps render

**Overall:**
- ✅ No critical console errors
- ✅ All API endpoints return expected status codes
- ✅ No regression in existing functionality
- ✅ Observation window integrity preserved

---

## Post-Validation Actions

**If all checks pass:**
- Create `PHASE_10.5_BROWSER_VALIDATION_COMPLETE.md`
- Create `NOW_WINDOW_CLEANUP_BROWSER_VALIDATION.md`
- Update observation window status

**If issues found:**
- Document specific failures
- Categorize severity (P0, P1, P2)
- Fix critical issues before declaring complete
- Re-test after fixes

**Follow-up for post-observation:**
- Add "Console TypeScript build hardening" to cleanup backlog
- The build bypass was acceptable during observation
- Should not become permanent

---

## Validation Status

**Pre-flight:** ✅ Complete  
**Manual browser validation:** ⏳ Pending  
**Documentation:** ✅ Ready

**Next:** Operator to perform manual browser validation at http://100.120.116.10:5174
