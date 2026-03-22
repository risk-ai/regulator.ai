# Shell Layout Regression Fix

**Date:** 2026-03-12  
**Issue:** Navigation tabs and status bar missing on initial load  
**Root Cause:** TopStatusBar early return when systemStatus not loaded  
**Status:** ✅ FIXED

---

## Problem

After operator shell integration cleanup, the Vienna Console rendered without navigation tabs and status bar on initial load, showing only a blank page with "Loading..." text.

**Symptoms:**
- Top navigation tabs missing (Dashboard | Now ⚡ | Files)
- Shell header/status indicators missing
- Page showed only "Loading..." without shell chrome
- Content rendered but appeared frameless

---

## Root Cause

**TopStatusBar.tsx contained an early return when `systemStatus` was null:**

```typescript
if (!systemStatus) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-gray-400">Loading...</span>
        </div>
      </div>
    </div>
  );
}
```

This caused:
1. Navigation tabs hidden during initial data fetch
2. Status indicators hidden
3. Operator identity/logout hidden
4. Shell appeared broken until systemStatus loaded

---

## Solution

### 1. Removed Early Return in TopStatusBar

**Changed:** TopStatusBar now renders full shell chrome even when systemStatus is loading

**Implementation:**
- Removed early return for null systemStatus
- Added null-safe rendering for all status indicators:
  - `systemStatus?.system_state || 'loading'`
  - `systemStatus?.queue_depth ?? '—'`
  - Conditional rendering for optional fields
- Navigation tabs always visible
- Operator identity always visible

### 2. Fixed Dashboard Link

**Problem:** Dashboard link pointed to `#` instead of `#dashboard`

**Solution:** Updated href from `#` to `#dashboard` to match routing logic

**Before:**
```typescript
<a href="#" ...>Dashboard</a>
```

**After:**
```typescript
<a href="#dashboard" ...>Dashboard</a>
```

### 3. Set Default Hash on Load

**Problem:** Empty hash on first load caused navigation highlighting mismatch

**Solution:** Set hash to `#now` if empty on initial load

```typescript
if (!hash || hash === '') {
  window.history.replaceState(null, '', '#now');
}
```

---

## Files Modified

1. **console/client/src/components/layout/TopStatusBar.tsx**
   - Removed early return for null systemStatus
   - Added null-safe rendering for status indicators
   - Fixed Dashboard link href

2. **console/client/src/App.tsx**
   - Added default hash setting on initial load

---

## Validation

✅ **Shell Chrome Always Visible:**
- Navigation tabs visible during loading
- Status indicators show placeholders ("loading", "—")
- Operator identity visible
- Logout button accessible

✅ **Routing Correct:**
- `/` or `#now` → Operator Command Center (default)
- `#dashboard` → Legacy Dashboard
- `#files` → Files Workspace

✅ **Navigation Highlighting:**
- Active tab correctly highlighted
- Hash set to #now by default
- Hash changes update active tab

---

## Result

Vienna Console now renders with full shell chrome from initial load:

```
Vienna Operator Shell
[Dashboard] [Now ⚡] [Files]
loading | loading | Queue: — | unknown | openclaw
------------------------------------------------
[Operator Command Center content loads below]
```

Navigation tabs and status bar remain visible throughout the lifecycle, with status indicators showing loading states until data arrives.

---

## Testing Checklist

✅ Open console → Full shell chrome visible immediately  
✅ Navigation tabs visible before data loads  
✅ Status indicators show "loading" placeholders  
✅ Default lands on Now ⚡ view  
✅ Dashboard link navigates correctly  
✅ Files link navigates correctly  
✅ Active tab highlighting correct  
✅ Operator identity visible  
✅ Logout button functional  

---

## Conclusion

**Shell layout regression fixed.** Vienna Console now provides consistent operator shell experience from initial load through full data hydration.

The regression was caused by defensive early-return logic that hid navigation during data loading. The fix ensures shell chrome renders immediately with placeholder states, providing better UX and clearer loading feedback.
