# Vienna OS Regression Test Suite

**Purpose:** Preserve core behavior across changes  
**Status:** Initial suite (Phase 7.6)  
**Last Updated:** 2026-03-12

---

## Overview

This document defines canonical test cases that must pass before any Vienna OS release. These tests protect against behavior drift as the system evolves.

---

## Test Categories

1. **T0 Local Actions** — Read-only local actions via Chat Action Bridge
2. **T1 Actions with Approval** — Side-effect actions requiring approval
3. **Informational Architecture** — System status and health queries
4. **Remote query_agent** — Conversational remote inspection
5. **Action Refusal** — Action-oriented queries correctly refused
6. **Unknown Input** — Graceful handling of unrecognized requests

---

## Test Suite

### Category 1: T0 Local Actions

**Purpose:** Verify read-only local actions execute without approval

#### Test 1.1: Show Status

**Input:** `show status`

**Expected Result:**
```json
{
  "success": true,
  "action_id": "show_status",
  "action_name": "Show System Status",
  "risk_tier": "T0",
  "target_endpoint": "local",
  "result": {
    "success": true,
    "data": {
      "services": number,
      "services_degraded": number,
      "providers": number,
      "providers_active": number,
      "open_incidents": number,
      "active_objectives": number,
      "runtime_mode": string
    }
  }
}
```

**Validation:**
- ✓ Executes immediately (no approval required)
- ✓ Returns State Graph data
- ✓ Result schema matches expected
- ✓ All fields present

---

#### Test 1.2: Show Services

**Input:** `show services`

**Expected Result:**
```json
{
  "success": true,
  "action_id": "show_services",
  "action_name": "Show Services",
  "risk_tier": "T0",
  "target_endpoint": "local",
  "result": {
    "success": true,
    "data": [
      {
        "service_id": string,
        "service_name": string,
        "status": "operational" | "degraded" | "offline",
        "health": number,
        "last_check": string
      }
    ]
  }
}
```

**Validation:**
- ✓ Executes immediately
- ✓ Returns array of services
- ✓ Each service has required fields

---

#### Test 1.3: Show Providers

**Input:** `show providers`

**Expected Result:**
```json
{
  "success": true,
  "action_id": "show_providers",
  "action_name": "Show Providers",
  "risk_tier": "T0",
  "target_endpoint": "local",
  "result": {
    "success": true,
    "data": [
      {
        "provider_id": string,
        "provider_name": string,
        "status": "active" | "inactive" | "error",
        "response_time": number,
        "last_check": string
      }
    ]
  }
}
```

**Validation:**
- ✓ Executes immediately
- ✓ Returns array of providers
- ✓ At least "anthropic" and "local" providers present

---

### Category 2: T1 Actions with Approval

**Purpose:** Verify side-effect actions require approval + warrant

#### Test 2.1: Restart Service (Approval Flow)

**Input:** `restart openclaw-gateway`

**Expected Flow:**
1. Request recognized as T1
2. Approval envelope returned
3. Frontend displays approval card
4. Operator approves
5. Warrant issued
6. Action executed
7. Result returned

**Expected Approval Envelope:**
```json
{
  "proposal_id": string,
  "command": "restart_service",
  "category": "side_effect",
  "description": string,
  "command_string": "restart openclaw-gateway",
  "args": ["openclaw-gateway"],
  "requires_warrant": true,
  "risk_tier": "T1",
  "proposed_at": string,
  "proposed_by": string
}
```

**Expected Execution Result (after approval):**
```json
{
  "success": true,
  "warrant": {
    "warrant_id": string,
    "risk_tier": "T1",
    "issued_at": string
  },
  "result": { ... },
  "approved_by": string,
  "timestamp": string
}
```

**Validation:**
- ✓ Approval envelope shown before execution
- ✓ Operator can approve or deny
- ✓ Warrant issued on approval
- ✓ Action executes only after approval
- ✓ Denial blocks execution
- ✓ Audit trail includes approval/denial

---

### Category 3: Informational Architecture

**Purpose:** Verify system can answer questions about its own architecture

#### Test 3.1: Current Phase

**Input:** `what phase are we in?` or similar

**Expected:** Should recognize and answer based on `VIENNA_RUNTIME_STATE.md` or current phase markers

**Validation:**
- ✓ Recognizes question about system state
- ✓ Provides truthful answer (e.g., "Phase 7 complete")
- ✓ No action triggered

---

#### Test 3.2: System Health

**Input:** `is the system healthy?` or similar

**Expected:** Should check services, providers, incidents and provide summary

**Validation:**
- ✓ Checks multiple health indicators
- ✓ Provides clear healthy/degraded/offline status
- ✓ No action triggered

---

### Category 4: Remote query_agent

**Purpose:** Verify conversational remote inspection works end-to-end

#### Test 4.1: Time Query

**Input:** `ask openclaw what year it is`

**Expected Result:**
```json
{
  "success": true,
  "action_id": "query_openclaw_agent",
  "action_name": "Query OpenClaw Agent",
  "risk_tier": "T0",
  "target_endpoint": "openclaw",
  "result": {
    "instruction_id": string,
    "status": "success",
    "result": {
      "query": "what year it is",
      "answer": "2026",
      "confidence": 1.0,
      "sources": ["system_time"],
      "execution_time_ms": number
    }
  }
}
```

**Validation:**
- ✓ Instruction ID present
- ✓ Result schema stable
- ✓ Confidence = 1.0
- ✓ Sources = ["system_time"]
- ✓ Answer factually correct
- ✓ No fallback narration

---

#### Test 4.2: Service Query

**Input:** `ask openclaw what services are running`

**Expected Result:**
```json
{
  "success": true,
  "action_id": "query_openclaw_agent",
  "action_name": "Query OpenClaw Agent",
  "risk_tier": "T0",
  "target_endpoint": "openclaw",
  "result": {
    "instruction_id": string,
    "status": "success",
    "result": {
      "query": "what services are running",
      "answer": string,
      "confidence": 0.9,
      "sources": ["systemctl"],
      "execution_time_ms": number
    }
  }
}
```

**Validation:**
- ✓ Answer contains service list
- ✓ Confidence = 0.9
- ✓ Sources = ["systemctl"]
- ✓ Not flagged as action-oriented (status query allowed)

---

#### Test 4.3: Gateway Health

**Input:** `ask openclaw is the gateway healthy`

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "query": "is the gateway healthy",
    "answer": string,  // Should include "Gateway status: active" or similar
    "confidence": 0.95,
    "sources": ["systemctl", "netstat"]
  }
}
```

**Validation:**
- ✓ Answer includes both systemctl status and port check
- ✓ Confidence = 0.95
- ✓ Sources = ["systemctl", "netstat"]

---

### Category 5: Action Refusal

**Purpose:** Verify action-oriented queries are correctly refused

#### Test 5.1: Imperative Action

**Input:** `ask openclaw to restart the gateway`

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "query": "restart the gateway",
    "answer": null,
    "refusal": true,
    "refusal_reason": "Query is action-oriented and must go through governed action path",
    "confidence": 1.0,
    "sources": ["action_detection"],
    "execution_time_ms": number
  }
}
```

**Validation:**
- ✓ Refusal = true
- ✓ Answer = null
- ✓ Refusal reason clear and actionable
- ✓ Confidence = 1.0
- ✓ Execution time near 0ms (early return)

---

#### Test 5.2: "Fix" Request

**Input:** `ask openclaw to fix the services`

**Expected:** Should refuse (contains "fix" action keyword)

**Validation:**
- ✓ Refusal path activated
- ✓ Clear message directing to governed action path

---

### Category 6: Unknown Input

**Purpose:** Verify graceful handling of unrecognized requests

#### Test 6.1: Unknown Command

**Input:** `blargblarg xyz123`

**Expected:** Should return "Request not recognized" or similar

**Validation:**
- ✓ Does not crash
- ✓ Returns clear "not recognized" message
- ✓ No fallback to dangerous default behavior

---

#### Test 6.2: Unknown Query

**Input:** `ask openclaw what is the meaning of life`

**Expected Result:**
```json
{
  "result": {
    "query": "what is the meaning of life",
    "answer": "Query not recognized. Supported queries: time/date/year, services, gateway status, recent instructions, system info.",
    "confidence": 0.0,
    "sources": ["query_patterns"]
  }
}
```

**Validation:**
- ✓ Returns help message listing supported queries
- ✓ Confidence = 0.0
- ✓ Does not attempt execution
- ✓ No hallucination or speculation

---

## Test Execution

### Manual Execution

1. Open Vienna dashboard at `http://100.120.116.10:5174`
2. Log in (if auth enabled)
3. Execute each test input in chat
4. Verify result matches expected schema
5. Check for deviations from expected behavior

### Automated Execution

```bash
# Run unit tests for query_agent handler
node test-query-agent.js

# Run integration tests (when available)
cd vienna-core
npm test -- tests/regression.test.js
```

---

## Pass Criteria

### Per Test
- ✓ Result schema matches expected
- ✓ All required fields present
- ✓ Values within expected ranges
- ✓ No errors or exceptions
- ✓ Behavior matches specification

### Overall Suite
- ✓ All tests pass
- ✓ No regressions from previous run
- ✓ Performance within acceptable bounds
- ✓ Audit trail complete for all actions

---

## Regression Tracking

### How to Use This Suite

1. **Before release:** Run full suite, verify 100% pass rate
2. **After changes:** Run affected category, verify no regressions
3. **When adding features:** Add new canonical tests to suite
4. **When fixing bugs:** Add regression test for bug scenario

### Recording Results

Document test results in `REGRESSION_TEST_RESULTS.md`:

```markdown
## Test Run: 2026-03-12

**Version:** Phase 7.6  
**Tester:** Conductor  
**Pass Rate:** 14/14 (100%)

### Results

- Category 1 (T0 Local Actions): 3/3 ✓
- Category 2 (T1 Approval): 1/1 ✓
- Category 3 (Informational): 2/2 ✓
- Category 4 (query_agent): 3/3 ✓
- Category 5 (Refusal): 2/2 ✓
- Category 6 (Unknown): 2/2 ✓

### Issues

None
```

---

## Maintenance

### Adding Tests

When adding tests to this suite:
1. Identify canonical behavior to preserve
2. Write minimal test case
3. Document expected result schema
4. Add validation criteria
5. Update pass criteria if needed

### Removing Tests

Tests should only be removed if:
- Feature intentionally deprecated
- Behavior intentionally changed
- Replaced by better test

**Never remove a test because it fails.** Fix the code or update the expected result if behavior intentionally changed.

---

## Version History

- **2026-03-12:** Initial suite created (Phase 7.6)
  - 14 canonical tests across 6 categories
  - Coverage: T0 actions, T1 approval, query_agent, refusal, unknown input

---

**Next Steps:**
1. Execute full suite manually via dashboard
2. Record results in `REGRESSION_TEST_RESULTS.md`
3. Automate suite execution
4. Add to CI/CD pipeline (when available)
