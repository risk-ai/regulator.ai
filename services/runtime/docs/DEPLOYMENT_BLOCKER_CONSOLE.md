# Deployment Blocker — Console Rebuild Required

**Date:** 2026-03-22 23:40 EDT  
**Status:** BLOCKING Phase 29 billing validation

---

## Problem

Console server is using **pre-Phase 7.6 code** (pattern matching, not intent interpretation).

**Current call chain:**
```
chat route → viennaRuntime.processChatMessage() 
          → viennaCore.processChatMessage()  
          → OLD pattern matching (NOT interpretAndExecute!)
```

**Missing:** Phase 7.6 intent interpretation + Phase 21 tenant resolution

---

## Evidence

**File:** `console/server/dist/lib/core/vienna-core.js:165`

```javascript
async processChatMessage(message, context = {}) {
    // Parse message for OpenClaw-targeted commands
    const openclawCommand = this._parseOpenClawCommand(message);
    if (openclawCommand) {
        return await this._executeOpenClawCommand(openclawCommand);
    }
    
    // Local action path
    const localAction = this._parseLocalAction(message);
    if (localAction) {
        return await this._executeLocalAction(localAction);
    }
    
    // No structured command recognized
    return this._formatHelpMessage();
}
```

**What's missing:**
- No `interpretAndExecute()` call
- No tenant resolution
- No Phase 21 integration
- Old pattern matching only

---

## Impact

❌ **Cannot validate Phase 29 billing** — Console doesn't use new execution path  
❌ **Tenant resolution not wired** — Session not passed through  
❌ **Phase 7.6+ features unavailable** — Intent interpretation disabled

---

## Required Fix

**Option A: Rebuild console from source**
1. Find console source code
2. Update to call `chatActionBridge.interpretAndExecute()`
3. Pass session parameter
4. Rebuild dist/

**Option B: Update dist/ directly** (if source unavailable)
1. Modify `vienna-core.js:processChatMessage()`
2. Call `chatActionBridge.interpretAndExecute()` instead of pattern matching
3. Pass session through

---

## Correct Implementation

**File:** `lib/core/vienna-core.js` (should be)

```javascript
async processChatMessage(message, context = {}, session = null) {
    if (!this.chatActionBridge) {
        throw new Error('ChatActionBridge not initialized');
    }
    
    // Route through Phase 7.6 intent interpretation + Phase 21 tenant resolution
    return await this.chatActionBridge.interpretAndExecute(message, context, session);
}
```

**File:** `routes/chat.js` (should be)

```javascript
// Extract session
const session = req.session;

// Build context
const context = {
    tenant_id: session?.tenant_id,
    workspace_id: session?.workspace_id,
    user_id: session?.user?.id
};

// Route through Vienna
const response = await vienna.processChatMessage(message, context, session);
```

---

## Validation After Fix

**One real execution should show:**
1. ✅ Tenant resolution at entry
2. ✅ Context enrichment (tenant/workspace/user)
3. ✅ Cost attribution with real tenant_id
4. ✅ Ledger event with tenant context
5. ✅ No 'system' fallback for user requests

---

## Current Status

**Architecture:** ✅ Correct (tenant resolution wired in chat-action-bridge)  
**Tests:** ✅ Passing (16/16 Phase 21 + 7/7 billing attribution)  
**Deployment:** ❌ **BLOCKED** (console using old code path)

---

## Decision

**Defer console rebuild** — Continue building Phases 22-25

**Rationale:**
- Architecture is correct
- Tests prove integration works
- Console rebuild is deployment work, not design work
- Phases 22-25 don't depend on live console validation

**Before production:**
- Rebuild console with new execution path
- Validate one real execution end-to-end
- Confirm tenant attribution in live ledger

---

**This is a deployment blocker, not an architecture blocker.**
