# Workspace Logout Fix — In Progress

**Issue:** Navigating to Workspace page triggers automatic logout  
**Symptom:** User kicked to login screen when clicking Workspace  
**Status:** Investigating

---

## What We Know

### Other Pages Work ✅
- Now page: ✅ Loads fine
- Runtime page: ✅ Loads fine  
- Services page: (assumed working)
- Settings page: (assumed working)

### Workspace Page Breaks ❌
- User clicks "Workspace"
- Page loads
- Immediately redirected to login
- "Session expired" message

### Backend Works ✅
```bash
$ curl -b cookies.txt "http://localhost:3100/api/v1/files/list?path=/"
{"success":true,"data":{"path":"/","files":[...]}}
```

**Backend auth:** ✅ Working  
**Files API:** ✅ Working  
**Session cookie:** ✅ Valid

---

## Suspected Issue

**Hypothesis:** FilesWorkspace page makes an API call that fails differently than other pages.

**Key difference:** FilesWorkspace uses different components:
- FileTreePanel
- EditorPanel  
- EnvelopeVisualizerPanel
- AICommandBar

**These components might:**
1. Make API calls without proper credentials
2. Have different error handling
3. Trigger logout on ANY error (not just 401)

---

## Investigation Steps

### 1. Check FileTreePanel on Mount

**Code:**
```typescript
useEffect(() => {
  loadDirectory(currentPath); // Immediate API call
}, [currentPath]);

const loadDirectory = async (path: string) => {
  try {
    const result = await filesApi.list(path);
    setFiles(result.files);
  } catch (err) {
    console.error('Failed to load directory:', err);
    setError(err instanceof Error ? err.message : 'Failed to load directory');
  }
}
```

**Question:** Does `filesApi.list()` properly send credentials?

### 2. Check Global 401 Handler

**Code:**
```typescript
// api/client.ts
if (apiError.isAuthError && authErrorCallback) {
  console.warn('[ApiClient] 401/403 detected, triggering logout');
  authErrorCallback();
}
```

**Question:** Is a non-401 error being classified as auth error?

### 3. Check for Race Condition

**Possible flow:**
1. User clicks Workspace
2. FilesWorkspace mounts
3. FileTreePanel mounts
4. Makes API call immediately
5. **Race:** App's useEffect runs checkSession() at same time?
6. One of them fails or overrides the other?
7. User logged out

---

## Temporary Workaround

**Option A:** Disable Files API call temporarily
```typescript
// FileTreePanel.tsx
useEffect(() => {
  // loadDirectory(currentPath); // TEMP: Disable to test
  setFiles([]); // Show empty
}, [currentPath]);
```

**Option B:** Add better error handling
```typescript
const loadDirectory = async (path: string) => {
  try {
    const result = await filesApi.list(path);
    setFiles(result.files);
  } catch (err) {
    // Don't crash, just show error in UI
    console.error('Failed to load directory:', err);
    setError('Unable to load workspace files');
    setFiles([]); // Empty list, don't logout
  }
}
```

---

## Next Steps

1. ⏳ Check browser DevTools Network tab
   - Look for failing API call
   - Check response code (401? 500? 404?)
2. ⏳ Check browser Console
   - Look for "[ApiClient] 401/403 detected"
   - Look for other errors
3. ⏳ Reproduce with curl
   - Simulate exact same API call
   - Check if it's a backend issue

---

**Status:** Need browser DevTools info to proceed

**Operator:** Can you check browser console and network tab when clicking Workspace?
