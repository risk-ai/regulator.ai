# Phase 6.6 + 6.7 Validation Steps

**Status:** Backend complete, frontend integration needed

## Issue Identified

Vienna Core requires full initialization (via console server startup) to activate Phase 6.7 shell executor.

**Root cause:** Shell executor created in `init()`, not available in standalone test mode.

---

## Validation Plan

### 1. Backend Validation (Unit Tests)

**Status:** ✓ COMPLETE

- ✓ Phase 6.6 provider tests (5/5 passed)
- ✓ Phase 6.7 executor tests (7/7 passed)
- ✓ Intent classification working
- ✓ Command templates validated
- ✓ Warrant enforcement tested

### 2. Server Integration Validation

**Required:** Start Vienna console server to initialize full runtime

**Steps:**

```bash
cd ~/.openclaw/workspace/vienna-core/console
npm run dev
```

**Verify:**
1. Server starts without errors
2. Phase 6.6 provider initialization logs
3. Phase 6.7 shell executor initialization

**Expected logs:**
```
[ProviderFactory] Initializing providers...
[AnthropicProvider] Initialized with model: claude-3-7-sonnet-20250219
[LocalProvider] Initialized with URL: http://localhost:18789
[Vienna] Phase 6.6: Initialized 2/2 LLM providers
[ShellExecutor] Initialized
```

### 3. API Endpoint Validation

**Test endpoints (via curl or Postman):**

**A. Chat (Phase 6.6)**
```bash
# General chat
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'

# Expected: Natural language response from Anthropic or Local provider

# Recovery intent
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "diagnose system"}'

# Expected: Structured recovery diagnosis
```

**B. Commands (Phase 6.7)**
```bash
# List available commands
curl http://localhost:3000/api/v1/commands/available

# Expected: Array of command templates

# Propose command
curl -X POST http://localhost:3000/api/v1/commands/propose \
  -H "Content-Type: application/json" \
  -d '{"commandName": "check_port", "args": [18789]}'

# Expected: Command proposal object

# Execute read-only command
curl -X POST http://localhost:3000/api/v1/commands/execute \
  -H "Content-Type: application/json" \
  -d '{
    "commandName": "check_port",
    "args": [18789],
    "context": {"operator": "test"}
  }'

# Expected: { success: true, result: { listening: true/false } }

# Diagnose system
curl http://localhost:3000/api/v1/commands/diagnose

# Expected: { systemState, issues, proposals }
```

### 4. Frontend Validation

**Status:** IN PROGRESS (frontend needs update)

**Current state:**
- Chat API client updated for Phase 6.6 response format ✓
- Commands API routes created ✓
- Chat UI needs command proposal display ✗
- Approval workflow UI needed ✗

**Required UI components:**

**A. Enhanced Chat Message Display**
- Show provider name (anthropic/local/vienna)
- Distinguish recovery vs general responses
- Display system command proposals with:
  - Command string
  - Risk tier badge
  - Warrant requirement indicator
  - Approve/Reject buttons (for side-effects)

**B. Command Approval Workflow**
- Proposal card with command details
- "Approve" button (issues warrant)
- "Reject" button
- Execution status indicator
- Result display

**C. Audit Trail View**
- List executed commands
- Show operator, timestamp, result
- Link to proposal

### 5. End-to-End User Flow Validation

**Scenario 1: Check System Status (Read-Only)**
```
User: "Is the gateway running?"
    ↓
Vienna: Proposes check_port(18789)
    ↓
Execute immediately (no warrant needed)
    ↓
Vienna: "Yes, the gateway is listening on port 18789"
```

**Scenario 2: Restart Service (Side-Effect)**
```
User: "Restart OpenClaw gateway"
    ↓
Vienna: Proposes restart_service('openclaw-gateway')
    ↓
UI displays proposal card:
  Command: systemctl --user restart openclaw-gateway
  Risk Tier: T1
  Requires Warrant: Yes
  [Approve] [Reject]
    ↓
User clicks [Approve]
    ↓
Warrant issued, command executes
    ↓
Vienna: "Gateway restarted successfully"
```

**Scenario 3: Diagnose and Fix**
```
User: "Diagnose the system"
    ↓
Vienna runs diagnosiseAndProposeFixes()
    ↓
Returns:
  System State: degraded
  Issues: ["Gateway port 18789 not listening"]
  Proposals: [restart_service('openclaw-gateway')]
    ↓
UI displays issues + proposals
    ↓
User approves fix
    ↓
Command executes
    ↓
Vienna: "System recovered"
```

---

## Blockers for Real Use

### Frontend Gaps (CRITICAL)

1. **No command proposal UI** — Side-effect commands can't be approved through chat
2. **No approval workflow** — Warrant issuance not integrated
3. **No execution result display** — User doesn't see command outcomes clearly

### Backend Complete

✓ Command templates defined
✓ Warrant enforcement working
✓ Audit trail logging
✓ Provider routing functional
✓ Intent classification correct

---

## Next Steps (Priority Order)

### Step 1: Verify Server Initialization
- Start Vienna console server
- Check logs for Phase 6.6 + 6.7 initialization
- Test API endpoints via curl

### Step 2: Fix Frontend Chat UI
- Add command proposal card component
- Add approve/reject buttons for side-effect commands
- Show execution results inline

### Step 3: Test End-to-End Flows
- Read-only command through chat
- Side-effect command with approval
- Diagnose and fix workflow

### Step 4: Audit Trail Visibility
- Add audit view to dashboard
- Show executed commands with operator/timestamp
- Link proposals to results

---

## Acceptance Criteria Checklist

- [ ] Vienna can diagnose system state through chat
- [ ] Vienna can run read-only terminal actions through chat
- [ ] Vienna can propose side-effecting actions through chat
- [ ] Operator can approve and execute through governed path
- [ ] Results are surfaced clearly in chat
- [ ] Audit trail is visible and trustworthy

**Current status:** 2/6 criteria met (backend only)

**Blocker:** Frontend UI for command proposals and approval workflow

---

## Recommended Next Action

**Option A: Quick API Validation (5 min)**
1. Start console server
2. Test API endpoints with curl
3. Verify backend working

**Option B: Build Approval UI (30-60 min)**
1. Create `CommandProposalCard.tsx` component
2. Add approve/reject handlers
3. Integrate with chat flow
4. Test end-to-end

**Choose Option A first to confirm backend, then Option B for full validation.**
