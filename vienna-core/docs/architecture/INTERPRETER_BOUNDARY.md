# Vienna OS Interpreter Boundary

**Status:** FROZEN (Phase 7.6)  
**Last Updated:** 2026-03-12  
**Enforcement:** Vienna Core rejects violations

---

## Core Rule

> **The interpreter may only emit canonical actions or canonical queries.**  
> **It may never emit direct execution instructions.**

This boundary is **immutable** and enforced architecturally.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         FLEXIBLE INTERPRETATION LAYER               │
│  (Intent Classifier, Entity Extraction,             │
│   Natural Language Understanding)                   │
│                                                     │
│  • Pattern matching                                │
│  • Entity normalization                            │
│  • Ambiguity detection                             │
│  • Confidence scoring                              │
└─────────────────────────────────────────────────────┘
                         ↓
          Outputs Intent Object (canonical schema)
                         ↓
┌─────────────────────────────────────────────────────┐
│           HARD GOVERNANCE BOUNDARY                  │
│  (Vienna Core - Deterministic Execution)            │
│                                                     │
│  • Validates canonical action IDs                  │
│  • Enforces risk tiers                             │
│  • Requires warrants for T1/T2                     │
│  • Rejects non-canonical actions                   │
└─────────────────────────────────────────────────────┘
                         ↓
                     Executor
                         ↓
                      System
```

---

## What the Interpreter CAN Emit

### 1. Canonical Action IDs

**T0 (Read-Only):**
- `show_status`
- `show_services`
- `show_providers`
- `show_incidents`
- `show_objectives`
- `show_endpoints`
- `query_openclaw_agent`

**T1 (Side-Effecting):**
- `restart_service`
- `run_recovery_workflow`

**T2 (Critical):**
(None currently defined)

### 2. Canonical Queries

Queries sent to `query_openclaw_agent`:
- Must be bounded (no freeform execution)
- Must be read-only
- Must go through action detection
- Must be audited

### 3. Normalized Entities

From central EntityNormalizationTable:
- Service names (e.g., "gateway" → "openclaw-gateway")
- Endpoint names (e.g., "oc" → "openclaw")
- Operations (e.g., "reboot" → "restart")
- Time expressions (e.g., "last hour" → "1h")
- Status values (e.g., "healthy" → "operational")

---

## What the Interpreter CANNOT Emit

### ❌ Direct Execution Instructions

```javascript
// FORBIDDEN
{
  action_id: "exec_shell_command",
  arguments: { command: "systemctl restart openclaw-gateway" }
}
```

### ❌ Freeform Commands

```javascript
// FORBIDDEN
{
  action_id: "freeform_action",
  arguments: { text: "restart the gateway" }
}
```

### ❌ Non-Canonical Action IDs

```javascript
// FORBIDDEN
{
  action_id: "custom_restart_gateway", // Not in canonical list
  arguments: {}
}
```

### ❌ Shell/Exec Bypasses

```javascript
// FORBIDDEN
{
  action_id: "query_openclaw_agent",
  arguments: { query: "$(systemctl restart openclaw-gateway)" } // Command injection attempt
}
```

### ❌ Governance Bypasses

```javascript
// FORBIDDEN
{
  action_id: "restart_service",
  governance_tier: "T0", // Lying about risk tier
  arguments: { service_name: "openclaw-gateway" }
}
```

---

## Enforcement Mechanisms

### 1. Schema Validation

Vienna Core validates every intent object:

```javascript
function validateIntentObject(intent) {
  // Check canonical action ID
  const canonicalActions = [
    'show_status', 'show_services', 'show_providers',
    'show_incidents', 'show_objectives', 'show_endpoints',
    'query_openclaw_agent', 'restart_service', 'run_recovery_workflow'
  ];
  
  if (intent.normalized_action) {
    if (!canonicalActions.includes(intent.normalized_action.action_id)) {
      throw new Error(`Non-canonical action ID: ${intent.normalized_action.action_id}`);
    }
  }
  
  return true;
}
```

### 2. Risk Tier Verification

Vienna Core independently determines risk tier:

```javascript
// Interpreter claims T0, Vienna Core verifies
const claimedTier = intent.governance_tier;
const actualTier = determineRiskTier(intent.normalized_action.action_id);

if (claimedTier !== actualTier) {
  throw new Error(`Risk tier mismatch: claimed ${claimedTier}, actual ${actualTier}`);
}
```

### 3. Entity Validation

All entities must come from normalization table:

```javascript
const normalizedService = entityTable.normalize('service', rawService);

// Vienna Core checks normalization was applied
if (rawService !== normalizedService && !entityTable.isAmbiguous('service', rawService)) {
  // Warning: interpreter did not normalize
}
```

### 4. Query Action Detection

Queries sent to `query_openclaw_agent` are checked for action intent:

```javascript
// query_openclaw_agent validates query is not action-oriented
if (isActionOriented(query)) {
  return {
    refusal: true,
    refusal_reason: 'Query is action-oriented and must go through governed action path'
  };
}
```

---

## Boundary Violations

If the interpreter emits a violation, Vienna Core:

1. **Rejects the intent object**
2. **Logs the violation** to audit trail
3. **Returns error to operator**
4. **Does NOT execute**

Example:

```
[Vienna Core] Boundary violation detected
Intent: { action_id: "custom_restart", ... }
Violation: Non-canonical action ID
Action: Rejected
Operator notified: "Request not recognized (invalid action)"
```

---

## Expansion Rules

### Adding New Canonical Actions

Requires:
1. RFC with justification
2. Risk tier classification
3. Implementation in Chat Action Bridge
4. Update to canonical list in this document
5. All regression tests pass
6. Security review (if T1/T2)

### Adding New Entity Normalizations

Requires:
1. Update to EntityNormalizationTable
2. Test coverage
3. Documentation update

### Expanding Interpretation Logic

Allowed:
- New intent patterns
- Better entity extraction
- Improved ambiguity detection
- Confidence scoring improvements
- Model-assisted parsing (Stage 2)

**BUT:** Must always output canonical Intent Schema

---

## Why This Boundary Exists

### Without Boundary (Dangerous):
```
User: "restart the gateway"
  ↓
LLM: "I'll execute: systemctl restart openclaw-gateway"
  ↓
System: Executes arbitrary command
```

### With Boundary (Safe):
```
User: "restart the gateway"
  ↓
Intent Classifier: { action_id: "restart_service", governance_tier: "T1", ... }
  ↓
Vienna Core: Validates canonical action, requires warrant
  ↓
Approval Flow: Operator approves
  ↓
Executor: Executes via governed path
```

---

## Stage 2 Constraints

When adding model-assisted parsing (Stage 2):

**Model CAN:**
- Suggest intent classifications
- Propose entity extractions
- Recommend normalization

**Model CANNOT:**
- Generate action IDs
- Bypass canonical list
- Invent new commands
- Suggest direct execution

**Model output must be:**
- Filtered through canonical list
- Validated by Vienna Core
- Subject to same boundary rules

---

## Testing the Boundary

Every test suite must include:

### Positive Tests (Should Pass)
- Canonical actions execute
- Normalized entities accepted
- Valid queries processed

### Negative Tests (Should Reject)
- Non-canonical action IDs rejected
- Direct execution attempts rejected
- Governance bypass attempts rejected
- Malformed intent objects rejected

### Adversarial Tests (Should Refuse)
- Ambiguous requests → suggestions
- Tentative phrasing → no execution
- Command injection attempts → refusal

---

## Monitoring

Vienna Core logs:
- All intent objects received
- Validation results
- Boundary violations
- Rejection reasons

Dashboard shows:
- Boundary violation rate (should be ~0%)
- Unknown intent rate
- Ambiguity rate
- Confidence distribution

---

## Bottom Line

**This boundary is non-negotiable.**

The interpreter can be as flexible as needed (rule-based, model-assisted, semantic parsing), but **it can only output canonical actions**.

Vienna Core is the **immutable execution gate**. It accepts canonical actions or nothing.

**Flexibility sits in front of the boundary. Determinism sits behind it.**

---

**Frozen:** 2026-03-12  
**Enforced by:** Vienna Core schema validation  
**Violations:** Rejected with audit trail
