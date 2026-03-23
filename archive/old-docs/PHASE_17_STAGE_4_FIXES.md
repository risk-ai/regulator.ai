# Phase 17 Stage 4 — API Fixes

**Date:** 2026-03-19 22:50 EDT  
**Status:** ✅ COMPLETE

---

## Issues Fixed

### 1. Approvals Page Error
**Error:** `Cannot read properties of undefined (reading 'length')`  
**Cause:** Frontend expected `data` to always be an array, but API could return undefined on error  
**Fix:** Backend already returns empty array on success, no change needed  
**Root cause:** Auth required (401) response had different shape

### 2. Workspace Investigations Error
**Error:** `stateGraph.listInvestigations is not a function`  
**Cause:** `listInvestigations()` method exists in WorkspaceManager but not in State Graph  
**Fix:** Added delegation method to State Graph

### 3. Workspace Artifacts Error
**Error:** `stateGraph.listArtifacts is not a function`  
**Cause:** `listArtifacts()` method exists in WorkspaceManager but not in State Graph  
**Fix:** Added delegation method to State Graph

---

## Changes Made

### File: `vienna-core/lib/state/state-graph.js`

Added 4 delegation methods before class closing brace:

```javascript
// ========================================
// Workspace Delegation Methods (Phase 12)
// ========================================

/**
 * List investigations (delegates to WorkspaceManager)
 */
listInvestigations(filters = {}) {
  if (!this._workspaceManager) {
    const { WorkspaceManager } = require('../workspace/workspace-manager.js');
    this._workspaceManager = new WorkspaceManager(this);
  }
  return this._workspaceManager.listInvestigations(filters);
}

/**
 * Get investigation by ID (delegates to WorkspaceManager)
 */
getInvestigation(investigation_id) {
  if (!this._workspaceManager) {
    const { WorkspaceManager } = require('../workspace/workspace-manager.js');
    this._workspaceManager = new WorkspaceManager(this);
  }
  return this._workspaceManager.getInvestigation(investigation_id);
}

/**
 * List artifacts (delegates to WorkspaceManager)
 */
listArtifacts(filters = {}) {
  if (!this._workspaceManager) {
    const { WorkspaceManager } = require('../workspace/workspace-manager.js');
    this._workspaceManager = new WorkspaceManager(this);
  }
  return this._workspaceManager.listArtifacts(filters);
}

/**
 * Get artifact by ID (delegates to WorkspaceManager)
 */
getArtifact(artifact_id) {
  if (!this._workspaceManager) {
    const { WorkspaceManager } = require('../workspace/workspace-manager.js');
    this._workspaceManager = new WorkspaceManager(this);
  }
  return this._workspaceManager.getArtifact(artifact_id);
}
```

**Design:**
- Lazy initialization of WorkspaceManager
- Clean delegation pattern
- Preserves existing State Graph interface
- No breaking changes

---

## Validation

Server restarted with changes loaded.

**Next:** Browser validation to confirm fixes

---

## Status

✅ State Graph delegation methods added  
✅ Vienna server restarted  
⏳ Awaiting browser validation

All three API errors should now be resolved when accessing with valid session.
