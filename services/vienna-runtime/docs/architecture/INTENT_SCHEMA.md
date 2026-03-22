# Vienna OS Intent Schema

**Purpose:** Canonical intent object structure that Vienna Core accepts from the interpreter  
**Status:** Frozen (Phase 7.6)  
**Last Updated:** 2026-03-12

---

## Intent Object Structure

The Intent Classifier **must** output this structure. Vienna Core **only** accepts this structure.

```typescript
interface IntentObject {
  // Raw input from operator
  raw_input: string;
  
  // Classified intent type
  intent_type: 
    | 'informational_architecture'
    | 'read_only_query_local'
    | 'read_only_query_remote'
    | 'side_effecting_action'
    | 'multi_step_objective'
    | 'unknown';
  
  // Normalized canonical action
  normalized_action: {
    action_id: string;           // Canonical action identifier
    action_type: string;         // local_query | remote_query | side_effect
    target_endpoint: string;     // local | openclaw | vienna
    arguments: Record<string, any>;
  } | null;
  
  // Governance classification
  governance_tier: 'T0' | 'T1' | 'T2' | 'unknown';
  
  // Extracted entities
  entities: Record<string, string>;
  
  // Ambiguity metadata
  ambiguity: {
    is_ambiguous: boolean;
    issues: Array<{
      type: 
        | 'unknown_intent'
        | 'missing_entity'
        | 'ambiguous_entity'
        | 'normalization_failed';
      entity?: string;
      value?: string;
      message: string;
    }>;
    resolution: string | null;  // Suggested resolution
  };
  
  // Confidence score
  confidence: number;  // 0.0 - 1.0
}
```

---

## Example: Successful Interpretation

```json
{
  "raw_input": "restart the gateway",
  "intent_type": "side_effecting_action",
  "normalized_action": {
    "action_id": "restart_service",
    "action_type": "side_effect",
    "target_endpoint": "local",
    "arguments": {
      "service_name": "openclaw-gateway"
    }
  },
  "governance_tier": "T1",
  "entities": {
    "service": "gateway",
    "operation": "restart"
  },
  "ambiguity": {
    "is_ambiguous": true,
    "issues": [
      {
        "type": "ambiguous_entity",
        "entity": "service",
        "value": "gateway",
        "message": "Service name \"gateway\" is ambiguous"
      }
    ],
    "resolution": "Did you mean \"openclaw-gateway\" or \"openclaw-node\"?"
  },
  "confidence": 0.80
}
```

---

## Example: Ambiguous Request (No Execution)

```json
{
  "raw_input": "could you maybe restart the gateway?",
  "intent_type": "unknown",
  "normalized_action": null,
  "governance_tier": "unknown",
  "entities": {
    "service": "gateway"
  },
  "ambiguity": {
    "is_ambiguous": true,
    "issues": [
      {
        "type": "unknown_intent",
        "message": "Could not classify request intent"
      },
      {
        "type": "ambiguous_entity",
        "entity": "service",
        "value": "gateway",
        "message": "Service name \"gateway\" is ambiguous"
      }
    ],
    "resolution": "Try a more specific request, like \"show status\" or \"ask openclaw what time it is\""
  },
  "confidence": 0.0
}
```

---

## Example: Read-Only Query

```json
{
  "raw_input": "ask openclaw what year it is",
  "intent_type": "read_only_query_remote",
  "normalized_action": {
    "action_id": "query_openclaw_agent",
    "action_type": "remote_query",
    "target_endpoint": "openclaw",
    "arguments": {
      "query": "what year it is"
    }
  },
  "governance_tier": "T0",
  "entities": {
    "endpoint": "openclaw"
  },
  "ambiguity": {
    "is_ambiguous": false,
    "issues": [],
    "resolution": null
  },
  "confidence": 1.0
}
```

---

## Execution Decision Rules

Vienna Core uses this schema to decide:

### 1. Should Execute?

```
IF normalized_action exists
  AND confidence >= 0.5
  AND (governance_tier = T0 OR approval_granted)
  AND NOT (ambiguity.is_ambiguous AND confidence < 0.5)
THEN execute
ELSE suggest or refuse
```

### 2. T1 Approval Required?

```
IF governance_tier = T1
  AND normalized_action exists
THEN require approval
```

### 3. Show Clarification?

```
IF ambiguity.is_ambiguous
  AND confidence < 0.5
THEN show ambiguity.resolution
```

---

## Canonical Action IDs

Vienna Core only accepts these action IDs from the interpreter:

### T0 Actions (Read-Only)
- `show_status`
- `show_services`
- `show_providers`
- `show_incidents`
- `show_objectives`
- `show_endpoints`
- `query_openclaw_agent`

### T1 Actions (Side-Effecting)
- `restart_service`
- `run_recovery_workflow`

### T2 Actions (Critical)
(None currently defined)

**Any other action_id is rejected.**

---

## Entity Normalization

Entities extracted from natural language **must** be normalized before execution:

```json
{
  "service": {
    "gateway": "openclaw-gateway",
    "openclaw gateway": "openclaw-gateway",
    "the gateway": "openclaw-gateway",
    "claw gateway": "openclaw-gateway",
    "node": "openclaw-node",
    "openclaw node": "openclaw-node",
    "api": "openclaw-api"
  },
  "endpoint": {
    "openclaw": "openclaw",
    "oc": "openclaw",
    "local": "local",
    "vienna": "local"
  }
}
```

---

## Interpreter Boundary

**The interpreter may only emit:**
1. Canonical action IDs (from approved list)
2. Canonical queries (to query_openclaw_agent)
3. Normalized entities (from normalization table)

**The interpreter may never emit:**
- Direct execution instructions
- Freeform commands
- Bypasses to shell/exec
- Non-canonical action IDs

**Enforcement:** Vienna Core rejects any intent object with non-canonical action_id.

---

## Versioning

**Current Version:** 1.0 (Phase 7.6 Stage 1)

**Breaking Changes:**
- Schema changes require major version bump
- All tests must pass with new schema
- Backward compatibility required for 1.x

**Non-Breaking Changes:**
- Adding new canonical action IDs (with approval)
- Adding new entity normalizations
- Improving confidence calculations

---

## Validation

Vienna Core validates every intent object:

```typescript
function validateIntent(intent: IntentObject): boolean {
  // Required fields
  if (!intent.raw_input) return false;
  if (!intent.intent_type) return false;
  if (!intent.governance_tier) return false;
  if (typeof intent.confidence !== 'number') return false;
  
  // Confidence range
  if (intent.confidence < 0 || intent.confidence > 1) return false;
  
  // Canonical action validation
  if (intent.normalized_action) {
    const validActionIds = [
      'show_status', 'show_services', 'show_providers',
      'show_incidents', 'show_objectives', 'show_endpoints',
      'query_openclaw_agent', 'restart_service', 'run_recovery_workflow'
    ];
    
    if (!validActionIds.includes(intent.normalized_action.action_id)) {
      return false;
    }
  }
  
  return true;
}
```

---

## Future Extensions (Stage 2+)

Possible additions (requires RFC):
- `multi_step_workflow` intent type
- Conditional execution metadata
- Time-based constraints
- Context carry-over between intents

**All extensions must preserve:**
- Canonical action enforcement
- Governance boundary
- Safe ambiguity defaults
- No execution bypass

---

**This schema is the contract between Interpreter and Vienna Core. It cannot be bypassed.**
