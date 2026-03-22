# Vienna OS Action Boundary Definition

**Last Updated:** 2026-03-13  
**Phase:** 9.7.3  
**Status:** FROZEN (production boundary)

## What This Document Defines

This document tags the exact files and modules that define Vienna's execution boundary—the layer between **planning** and **system effects**.

**Critical invariant:**
> Actions crossing this boundary must be typed, governed, and auditable.

## The Boundary

```
Planning Layer (above boundary)
  ↓
═══════════════════════════════════════════════════════
  ACTION BOUNDARY (this document defines this line)
═══════════════════════════════════════════════════════
  ↓
Execution Layer (below boundary)
  ↓
System Effects (systemctl, file writes, network calls)
```

## Files Defining the Boundary

### 1. Action Type System
**File:** `lib/execution/action-types.js`  
**Purpose:** Typed action descriptor schema  
**Constraint:** Closed set (no dynamic types)

**Current action types (3):**
- `system_service_restart`
- `sleep`
- `health_check`

**Adding new action types requires:**
1. Update `action-types.js` with new type definition
2. Implement handler in `lib/execution/handlers/[name].js`
3. Register handler in `chat-action-bridge-executor.js`
4. Update `ACTION_BOUNDARY.md` (this file)
5. Add test coverage
6. Phase governance approval

### 2. Action Result Schema
**File:** `lib/execution/action-result.js`  
**Purpose:** Standard result format for all executions  
**Constraint:** All handlers must return ActionResult structure

**Required fields:**
- `ok` (boolean) — Success/failure
- `actionType` (string) — Action type executed
- `startedAt` (ISO timestamp)
- `finishedAt` (ISO timestamp)

**Optional fields:**
- `target` (string) — Target entity
- `stdout` / `stderr` (string) — Command output
- `exitCode` (number) — Exit code
- `error` (string) — Error message
- `details` (object) — Structured metadata

### 3. Handler Registry
**File:** `lib/execution/chat-action-bridge-executor.js`  
**Purpose:** Central dispatch to typed handlers  
**Constraint:** Closed registry (no dynamic registration)

**Handler map (frozen):**
```javascript
{
  'system_service_restart': restartService,
  'sleep': sleep,
  'health_check': healthCheck
}
```

### 4. Individual Handlers
**Directory:** `lib/execution/handlers/`  
**Purpose:** Implement specific action types  
**Constraint:** Each handler must validate inputs, enforce allowlists, return ActionResult

**Current handlers:**
- `restart-service.js` — systemctl restart (allowlist: openclaw-gateway)
- `sleep.js` — Delay execution
- `health-check.js` — systemctl is-active observation

### 5. Remediation Executor
**File:** `lib/execution/remediation-executor.js`  
**Purpose:** Execute multi-step plans via handler dispatch  
**Constraint:** Plans must contain typed ActionDescriptors only

## Allowlists (Critical Security Boundary)

### Service Restart Allowlist
**File:** `lib/execution/handlers/restart-service.js`  
**Line:** `const ALLOWED_SERVICES = new Set([...])`

**Current allowlist:**
```javascript
const ALLOWED_SERVICES = new Set([
  'openclaw-gateway'
]);
```

**To add a service:**
1. Update `ALLOWED_SERVICES` set
2. Test service restart in test mode
3. Verify service exists in production environment
4. Document in `ACTION_BOUNDARY.md` (this file)
5. Tag commit with service addition

## Test Mode Separation

**Critical flag:** `VIENNA_TEST_STUB_ACTIONS`

**When set to `true`:**
- `restart-service.js` simulates restart (no real systemctl call)
- Returns synthetic success result after 1s delay
- Prevents test disruption of running services

**When unset or `false`:**
- Real systemctl execution
- Real system effects
- Production mode

**Usage:**
```bash
VIENNA_ENV=test VIENNA_TEST_STUB_ACTIONS=true node test-*.js
```

## Execution Discipline

### What Handlers MAY Do
- Execute typed actions with validated inputs
- Return structured ActionResult
- Enforce allowlists
- Check preconditions
- Observe system state

### What Handlers MAY NOT Do
- Decide objective satisfaction (evaluation layer owns this)
- Bypass allowlists
- Execute dynamic/generated commands
- Interpret verification results
- Modify State Graph directly (executor does this)

## Adding a New Action Type (Procedure)

**Example:** Adding `file_backup` action

1. **Define type in `action-types.js`:**
```javascript
/**
 * @typedef {Object} FileBackupAction
 * @property {'file_backup'} type
 * @property {string} source - Source file path
 * @property {string} destination - Backup destination
 */
```

2. **Implement handler in `handlers/file-backup.js`:**
```javascript
async function fileBackup(action) {
  const startedAt = new Date().toISOString();
  
  // Validate paths
  if (!isAllowedPath(action.source)) {
    return createFailureResult(action.type, startedAt, 'Path not allowed');
  }
  
  // Execute backup
  try {
    await fs.copyFile(action.source, action.destination);
    return createSuccessResult(action.type, startedAt, { source, destination });
  } catch (err) {
    return createFailureResult(action.type, startedAt, err.message);
  }
}
```

3. **Register in `chat-action-bridge-executor.js`:**
```javascript
const { fileBackup } = require('./handlers/file-backup');

this.handlers = {
  'system_service_restart': restartService,
  'sleep': sleep,
  'health_check': healthCheck,
  'file_backup': fileBackup  // NEW
};
```

4. **Add test coverage:**
```javascript
// test-file-backup.js
const result = await bridge.execute({
  type: 'file_backup',
  source: '/tmp/test.txt',
  destination: '/tmp/test.backup.txt'
});

assert(result.ok === true);
```

5. **Update this document:**
- Add `file_backup` to "Current action types"
- Document allowlist (if applicable)
- Update handler count

6. **Phase governance approval:**
- Review security implications
- Verify no generic shell exposure
- Confirm test mode support
- Approve for production

## Governance Guardrails

### 1. No Generic Shell Execution
❌ **NEVER:**
```javascript
exec(`sh -c "${userInput}"`)  // FORBIDDEN
```

✅ **ALWAYS:**
```javascript
execFile('systemctl', ['restart', allowlistedService])  // ALLOWED
```

### 2. Typed Actions Only
❌ **NEVER:**
```javascript
action = { type: 'run_command', command: '...' }  // FORBIDDEN
```

✅ **ALWAYS:**
```javascript
action = { type: 'system_service_restart', target: 'openclaw-gateway' }  // ALLOWED
```

### 3. Allowlist Enforcement
❌ **NEVER:**
```javascript
systemctl restart ${action.target}  // FORBIDDEN (no validation)
```

✅ **ALWAYS:**
```javascript
if (!ALLOWED_SERVICES.has(action.target)) {
  return createFailureResult(..., 'Service not allowed');
}
```

### 4. Test Mode Support
All handlers with system effects must support `VIENNA_TEST_STUB_ACTIONS` flag.

### 5. Structured Results
All handlers must return `ActionResult` structure (never throw exceptions for business logic failures).

## Violation Response

If generic shell execution or allowlist bypass is detected:

1. **Immediate:** Revert commit
2. **Investigation:** Root cause analysis
3. **Audit:** Check execution ledger for impact
4. **Remediation:** Fix + test coverage
5. **Documentation:** Update boundary definition

## Version History

- **2026-03-13 (Phase 9.7.3):** Initial boundary definition
  - 3 action types
  - 1 allowlisted service
  - Test mode support
  - Handler registry frozen

---

**This boundary is production-critical. Changes require phase governance approval.**
