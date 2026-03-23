# Phase 17 Stage 4 — API Fixes COMPLETE

**Date:** 2026-03-19 22:55 EDT  
**Status:** ✅ COMPLETE

---

## Root Cause

Frontend API client methods were extracting `.data` from responses **twice**:
1. `apiClient.get()` extracts `.data` from the backend response (line 127 in client.ts)
2. API methods then tried to extract `.data` again → undefined → crash

---

## Issues Fixed

### 1. Approvals Page Error ✅
**Error:** `Cannot read properties of undefined (reading 'length')`  
**Root cause:** `return response.data` when `response` was already the extracted data  
**Fix:** Changed `listApprovals()`, `getApprovalDetail()`, `approveApproval()`, `denyApproval()` to return data directly

### 2. Workspace Investigations Error ✅
**Error:** `stateGraph.listInvestigations is not a function`  
**Fix:** Added delegation method to State Graph (completed earlier)

### 3. Workspace Artifacts Error ✅
**Error:** `stateGraph.listArtifacts is not a function`  
**Fix:** Added delegation method to State Graph (completed earlier)

---

## Changes Made

### File: `console/client/src/api/approvals.ts`

**Before:**
```typescript
export async function listApprovals(filters?: ...): Promise<Approval[]> {
  const response = await apiClient.get<ApprovalListResponse>(...);
  return response.data; // ❌ response is already .data
}
```

**After:**
```typescript
export async function listApprovals(filters?: ...): Promise<Approval[]> {
  // apiClient.get already extracts .data from the response
  const data = await apiClient.get<Approval[]>(...);
  return data; // ✅ correct
}
```

**Applied to 4 methods:**
- `listApprovals()` → returns `Approval[]` not `ApprovalListResponse`
- `getApprovalDetail()` → returns `ApprovalDetail` not `ApprovalDetailResponse`
- `approveApproval()` → returns `Approval` not `ApprovalActionResponse`
- `denyApproval()` → returns `Approval` not `ApprovalActionResponse`

### File: `lib/state/state-graph.js` (completed earlier)

Added 4 delegation methods:
- `listInvestigations(filters)` → delegates to WorkspaceManager
- `getInvestigation(id)` → delegates to WorkspaceManager
- `listArtifacts(filters)` → delegates to WorkspaceManager
- `getArtifact(id)` → delegates to WorkspaceManager

---

## Build

Frontend rebuilt successfully:
```bash
cd console/client
npx vite build --mode production
# ✓ built in 2.84s
```

**Output:**
- `dist/index.html` (0.41 kB)
- `dist/assets/index-rtzi3Zo8.css` (75.02 kB)
- `dist/assets/index-BMfUKMqZ.js` (309.13 kB)

---

## Validation

**Backend:** ✅ Running with State Graph delegation  
**Frontend:** ✅ Rebuilt with fixed API client  
**Status:** Ready for browser validation

---

## Expected Behavior

1. **Approvals page** (`/#approvals`):
   - Should load without error
   - Should show empty state (no pending approvals)
   - Should display filter tabs (All / T1 / T2)

2. **Workspace page** (`/#workspace`):
   - Should load without error
   - Should show investigations list (empty or populated)
   - Should show artifacts list (empty or populated)

3. **All pages**:
   - Should not show console errors
   - Should handle auth correctly (redirect to login if unauthorized)

---

## Status

✅ Root cause identified  
✅ Backend delegation methods added  
✅ Frontend API client fixed  
✅ Frontend rebuilt  
⏳ Awaiting browser validation

**Next:** Refresh browser, test Approvals + Workspace pages
