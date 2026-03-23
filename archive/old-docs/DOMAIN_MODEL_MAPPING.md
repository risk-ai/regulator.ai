# Domain Model Mapping — Regulator ↔ Vienna

**Date:** 2026-03-14  
**Stage:** Stage 2 Architecture Reconciliation  
**Purpose:** Map existing Regulator schema to Vienna entities

---

## Schema Reconciliation Strategy

### Core Principle

Vienna State Graph is **source of truth** for governance state.

Regulator Neon database stores:
- Lightweight references (investigation ownership, user preferences)
- Product-specific metadata (UI state, user settings)
- NOT full governance state duplication

---

## Existing Regulator Tables → Vienna Entities

| Regulator Table | Vienna Entity | Mapping Strategy |
| --------------- | ------------- | ---------------- |
| `proposals` | `intent` + `plan` + `execution` | **Unify in Vienna State Graph** (proposals = combined lifecycle, Vienna separates concerns) |
| `policies` | `policies` | **Unify in Vienna State Graph** (Vienna has constraint-based policy engine) |
| `warrants` | Governance decisions (embedded in execution lifecycle) | **Unify in Vienna State Graph** (Vienna tracks warrant issuance in execution ledger) |
| `auditLog` | `execution_ledger_events` | **Unify in Vienna State Graph** (Vienna has append-only ledger with richer event types) |
| `adapters` | Configuration (not core governance) | **Defer** (keep in Neon for deployment adapter config, not migration priority) |

---

## Vienna Entities → New Regulator Tables

Vienna has additional entities not in current Regulator schema:

| Vienna Entity | New Regulator Table | Purpose | Priority |
| ------------- | ------------------- | ------- | -------- |
| `investigations` | `investigation_refs` | Lightweight ownership tracking (user → investigation) | P0 |
| `artifacts` | `artifact_refs` | Metadata pointers (investigation → artifact ID) | P0 |
| `traces` | N/A | Full trace stored in Vienna State Graph only | — |
| `executions` | N/A | Full execution state in Vienna State Graph only | — |
| `incidents` | `incident_refs` | Lightweight incident metadata | P1 |
| `objectives` | N/A | Full objective state in Vienna State Graph only | — |
| `verifications` | N/A | Full verification results in Vienna State Graph only | — |
| `workflow_outcomes` | N/A | Full outcome state in Vienna State Graph only | — |
| `plans` | N/A | Full plan state in Vienna State Graph only | — |

---

## Detailed Mapping

### 1. Proposals → Intent + Plan + Execution

**Current Regulator Schema:**

```typescript
proposals {
  id: uuid
  agentId: text
  action: text
  payload: jsonb
  riskTier: integer
  state: text // submitted → validated → policy_checked → authorized → executing → executed → verified → archived
  warrantId: uuid
  result: jsonb
  error: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Vienna Separation:**

Vienna splits `proposals` into **three distinct entities**:

#### Intent (IntentObject)

```typescript
{
  intent_id: string
  intent_type: string // informational, read_only_local, side_effecting, etc.
  user_input: string
  normalized_action: {
    action_id: string
    args: object
  }
  entities: {
    service?: string
    endpoint?: string
    operation?: string
  }
  confidence: number
  ambiguous: boolean
  created_by: string
  created_at: timestamp
}
```

#### Plan (PlanObject)

```typescript
{
  plan_id: string
  intent_id: string
  objective: string
  steps: [
    {
      action_id: string
      args: object
      verification: { template: string, config: object }
    }
  ]
  preconditions: string[]
  postconditions: string[]
  risk_tier: 0 | 1 | 2 | 3
  lifecycle_status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed'
  created_at: timestamp
}
```

#### Execution (ExecutionLedgerSummary)

```typescript
{
  execution_id: string
  intent_id: string
  plan_id: string
  objective_id?: string
  risk_tier: number
  target_id: string
  status: 'completed' | 'failed' | 'denied'
  created_at: timestamp
  completed_at?: timestamp
  duration_ms?: number
  approval_status: 'auto_approved' | 'operator_approved' | 'denied'
  execution_result: { status: string, exit_code?: number, ... }
  verification_id?: string
  outcome_id?: string
}
```

**Migration Strategy:**

- **Keep `proposals` table in Neon** for backward compatibility (if existing integrations depend on it)
- **Add `intent_id`, `plan_id`, `execution_id` columns** to proposals table (references to Vienna State Graph)
- **Vienna State Graph = source of truth** for full lifecycle
- **Neon proposals table = lightweight reference** for product UI queries

**Recommended Neon schema update:**

```typescript
proposals {
  id: uuid (existing)
  intent_id: text (NEW - reference to Vienna State Graph)
  plan_id: text (NEW - reference to Vienna State Graph)
  execution_id: text (NEW - reference to Vienna State Graph)
  agentId: text (existing)
  action: text (existing)
  riskTier: integer (existing)
  state: text (existing - keep for backward compat)
  createdAt: timestamp (existing)
  // ... other existing fields
}
```

---

### 2. Policies → Vienna Policies

**Current Regulator Schema:**

```typescript
policies {
  id: uuid
  name: text
  description: text
  rules: jsonb
  riskTier: integer
  enabled: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Vienna Schema:**

```typescript
policies {
  policy_id: string
  name: string
  description?: string
  priority: number
  constraints: [
    {
      type: 'time_window' | 'service_status' | 'rate_limit' | 'cooldown' | ...
      config: object
    }
  ]
  action_on_match: 'allow' | 'deny' | 'require_approval'
  enabled: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

**Mapping:**

| Regulator Field | Vienna Field | Strategy |
| --------------- | ------------ | -------- |
| `id` | `policy_id` | Map UUID to Vienna ID format |
| `name` | `name` | Direct copy |
| `description` | `description` | Direct copy |
| `rules` (jsonb) | `constraints` (array) | **Transform:** Convert generic `rules` to Vienna's constraint schema |
| `riskTier` | Constraint config | **Embed:** Risk tier becomes a constraint condition, not top-level field |
| `enabled` | `enabled` | Direct copy |

**Migration Strategy:**

- **Keep `policies` table in Neon** for product UI
- **Sync to Vienna State Graph** on create/update
- **Vienna validates policy constraints** before execution
- **Neon stores simplified metadata** for product UI queries

**Recommended approach:**

```typescript
// When policy created in product UI:
const neonPolicy = await db.insert(policies).values({ name, rules, ... })
const viennaPolicy = transformToViennaPolicy(neonPolicy)
await viennaAPI.post('/api/v1/policies', viennaPolicy)

// When policy updated in product UI:
await db.update(policies).set({ rules, updatedAt: now() }).where(eq(id, policyId))
const viennaPolicy = transformToViennaPolicy(updatedPolicy)
await viennaAPI.put('/api/v1/policies/:id', viennaPolicy)
```

---

### 3. Warrants → Vienna Execution Authorization

**Current Regulator Schema:**

```typescript
warrants {
  id: uuid
  proposalId: uuid
  signature: text
  expiresAt: timestamp
  revoked: boolean
  revokedAt: timestamp
  revokedReason: text
  issuedBy: text
  createdAt: timestamp
}
```

**Vienna Approach:**

Vienna does NOT have a separate `warrants` table.

Instead, **warrant issuance is an event in the execution ledger**:

```typescript
execution_ledger_events {
  event_id: string
  execution_id: string
  event_type: 'warrant_issued' | 'warrant_expired' | 'warrant_revoked'
  timestamp: timestamp
  actor: string
  payload: {
    warrant_id: string
    signature: string
    expires_at: timestamp
    revoked?: boolean
    revoked_reason?: string
  }
}
```

**Mapping:**

- Regulator `warrants` table → Vienna `execution_ledger_events` with `event_type: warrant_issued`
- Warrant metadata embedded in event payload
- No separate warrant table needed in Vienna

**Migration Strategy:**

- **Keep `warrants` table in Neon** if product UI needs fast warrant queries
- **Vienna execution ledger = source of truth** for warrant lifecycle
- **Sync warrant events from Vienna → Neon** if UI requires it

**Recommended approach:**

```typescript
// Vienna issues warrant during execution:
await stateGraph.appendLedgerEvent({
  execution_id,
  event_type: 'warrant_issued',
  actor: 'vienna_warrant_authority',
  payload: {
    warrant_id: generateWarrantId(),
    signature: signWarrant(plan),
    expires_at: addMinutes(now(), 15)
  }
})

// Optional: Sync to Neon for product UI:
await db.insert(warrants).values({
  id: payload.warrant_id,
  proposalId: plan.intent_id,
  signature: payload.signature,
  expiresAt: payload.expires_at,
  issuedBy: 'vienna'
})
```

---

### 4. AuditLog → Vienna Execution Ledger

**Current Regulator Schema:**

```typescript
auditLog {
  id: uuid
  proposalId: uuid
  warrantId: uuid
  event: text
  actor: text
  riskTier: integer
  details: jsonb
  createdAt: timestamp
}
```

**Vienna Schema:**

```typescript
execution_ledger_events {
  event_id: string
  execution_id: string
  event_type: 'intent_received' | 'plan_created' | 'policy_evaluated' | 'warrant_issued' | 'execution_started' | 'execution_completed' | 'verification_completed' | 'workflow_outcome_finalized'
  timestamp: timestamp
  actor: string
  payload: jsonb
}
```

**Mapping:**

| Regulator Field | Vienna Field | Strategy |
| --------------- | ------------ | -------- |
| `id` | `event_id` | Map UUID to Vienna event ID |
| `proposalId` | `execution_id` | Map proposal → execution |
| `warrantId` | Embedded in payload | Warrant ID in event payload |
| `event` | `event_type` | **Transform:** Generic event → specific Vienna event type |
| `actor` | `actor` | Direct copy |
| `details` | `payload` | Direct copy (Vienna has richer structured payload) |

**Vienna Event Types (15 total):**

1. `intent_received`
2. `intent_classified`
3. `plan_created`
4. `policy_evaluated_requires_approval`
5. `approval_requested`
6. `approval_granted`
7. `approval_denied`
8. `execution_started`
9. `execution_completed`
10. `execution_failed`
11. `verification_started`
12. `verification_completed`
13. `verification_failed`
14. `verification_skipped`
15. `workflow_outcome_finalized`

**Migration Strategy:**

- **Deprecate `auditLog` writes** (no new events written to Neon)
- **Vienna execution ledger = source of truth**
- **Product UI queries Vienna API** for audit trail (`GET /api/v1/ledger/events`)
- **Optional:** Keep `auditLog` read-only for historical data

---

### 5. Adapters → Configuration (Deferred)

**Current Regulator Schema:**

```typescript
adapters {
  id: uuid
  name: text
  type: text // deployment, api, database, email, etc
  config: jsonb
  enabled: boolean
  createdAt: timestamp
}
```

**Vienna Approach:**

Vienna does NOT manage deployment adapters (email, API integrations, etc.).

This is **product-specific configuration**, not core governance.

**Migration Strategy:**

- **Keep `adapters` table in Neon** (no Vienna integration needed)
- **Defer migration** (not in scope for Stage 3/4)

---

## New Tables Required in Neon

### 1. investigation_refs (P0 — Required for Stage 3)

Lightweight investigation ownership tracking.

```typescript
investigation_refs {
  id: uuid
  user_id: text // operator email
  investigation_id: text // Vienna State Graph reference (inv_20260314_001)
  name: text
  status: text // open, investigating, resolved, archived
  created_at: timestamp
  resolved_at?: timestamp
}
```

**Purpose:** Product UI can query "my investigations" without hitting Vienna API for full State Graph data.

**Sync Strategy:**

- User creates investigation in product UI → Neon + Vienna (atomic)
- Vienna State Graph stores full investigation (artifacts, traces, related entities)
- Neon stores lightweight reference (user ownership, basic metadata)

---

### 2. artifact_refs (P0 — Required for Stage 3)

Metadata pointers for artifact browser.

```typescript
artifact_refs {
  id: uuid
  investigation_id: text // Vienna investigation reference
  artifact_id: text // Vienna artifact ID (art_20260314_001)
  artifact_type: text // trace, execution_graph, investigation, etc.
  name: text
  size_bytes: integer
  created_at: timestamp
}
```

**Purpose:** Product UI can list artifacts without fetching full content from Vienna.

**Sync Strategy:**

- Vienna stores artifact in workspace → returns artifact_id
- Product UI stores reference in Neon for fast queries
- Fetching artifact content → hits Vienna API

---

### 3. incident_refs (P1 — Can defer to Stage 4)

Lightweight incident metadata.

```typescript
incident_refs {
  id: uuid
  incident_id: text // Vienna incident ID (inc_20260314_001)
  title: text
  severity: text // low, medium, high, critical
  status: text // open, investigating, resolved
  service_id: text
  detected_at: timestamp
  resolved_at?: timestamp
}
```

**Purpose:** Product UI can display incident timeline without full State Graph queries.

---

## Domain Model Migration Summary

| Entity | Neon Storage | Vienna Storage | Sync Strategy |
| ------ | ------------ | -------------- | ------------- |
| **Intent** | Reference only (`proposals.intent_id`) | Full intent object | Vienna → Neon reference on create |
| **Plan** | Reference only (`proposals.plan_id`) | Full plan object | Vienna → Neon reference on create |
| **Execution** | Reference only (`proposals.execution_id`) | Full execution ledger | Vienna → Neon reference on create |
| **Policy** | Simplified metadata (`policies`) | Full constraint-based policy | Bi-directional sync (product UI ↔ Vienna) |
| **Warrant** | Optional (`warrants`) | Ledger events | Vienna → Neon sync (optional) |
| **Audit Event** | Deprecated (`auditLog`) | Execution ledger events | No sync (query Vienna API) |
| **Investigation** | Ownership refs (`investigation_refs`) | Full investigation + artifacts | Vienna → Neon reference on create |
| **Artifact** | Metadata refs (`artifact_refs`) | Full artifact content + storage | Vienna → Neon reference on create |
| **Incident** | Metadata refs (`incident_refs`) | Full incident timeline | Vienna → Neon reference on create |
| **Objective** | NONE | Full objective state | No Neon storage (query Vienna API) |
| **Trace** | NONE | Full trace + timeline | No Neon storage (query Vienna API) |

---

## Schema Migration Plan

### Phase 1: Extend Existing Tables

Update existing Regulator tables to reference Vienna entities:

```sql
-- Add Vienna references to proposals
ALTER TABLE regulator.proposals
  ADD COLUMN intent_id TEXT,
  ADD COLUMN plan_id TEXT,
  ADD COLUMN execution_id TEXT;

-- Add indexes
CREATE INDEX idx_proposals_intent_id ON regulator.proposals(intent_id);
CREATE INDEX idx_proposals_plan_id ON regulator.proposals(plan_id);
CREATE INDEX idx_proposals_execution_id ON regulator.proposals(execution_id);
```

---

### Phase 2: Create New Reference Tables

```sql
-- Investigation ownership tracking
CREATE TABLE regulator.investigation_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  investigation_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_investigation_refs_user_id ON regulator.investigation_refs(user_id);
CREATE INDEX idx_investigation_refs_status ON regulator.investigation_refs(status);

-- Artifact metadata pointers
CREATE TABLE regulator.artifact_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL UNIQUE,
  artifact_type TEXT NOT NULL,
  name TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_artifact_refs_investigation_id ON regulator.artifact_refs(investigation_id);
CREATE INDEX idx_artifact_refs_artifact_type ON regulator.artifact_refs(artifact_type);

-- Incident metadata (optional, can defer)
CREATE TABLE regulator.incident_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  service_id TEXT,
  detected_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_incident_refs_status ON regulator.incident_refs(status);
CREATE INDEX idx_incident_refs_service_id ON regulator.incident_refs(service_id);
```

---

### Phase 3: Data Migration (if needed)

If existing `proposals` or `auditLog` data needs migrating to Vienna State Graph:

```typescript
// Migration script (one-time)
const existingProposals = await db.select().from(proposals)

for (const proposal of existingProposals) {
  // Create intent in Vienna
  const intent = await viennaAPI.post('/api/v1/intents', {
    user_input: proposal.action,
    normalized_action: { action_id: proposal.action, args: proposal.payload },
    created_by: proposal.agentId
  })

  // Create plan in Vienna
  const plan = await viennaAPI.post('/api/v1/plans', {
    intent_id: intent.intent_id,
    objective: proposal.action,
    risk_tier: proposal.riskTier,
    steps: [{ action_id: proposal.action, args: proposal.payload }]
  })

  // Update Neon proposal with Vienna references
  await db.update(proposals)
    .set({ intent_id: intent.intent_id, plan_id: plan.plan_id })
    .where(eq(proposals.id, proposal.id))
}
```

---

## Canonical Data Flow

### Investigation Creation

```
1. Operator creates investigation in product UI
2. Next.js API route: POST /api/investigations
3. Next.js → Vienna API: POST http://vienna:3100/api/v1/investigations
4. Vienna creates investigation in State Graph, returns investigation_id
5. Next.js stores reference in Neon: INSERT INTO investigation_refs
6. UI displays investigation
```

### Artifact Viewing

```
1. Operator clicks artifact in investigation detail
2. Next.js fetches artifact_ref from Neon (fast metadata query)
3. Next.js → Vienna API: GET http://vienna:3100/api/v1/artifacts/:artifact_id
4. Vienna returns full artifact content
5. UI displays artifact
```

### Execution Audit Trail

```
1. Operator views execution timeline
2. Next.js → Vienna API: GET http://vienna:3100/api/v1/ledger/events?execution_id=...
3. Vienna returns full event timeline from execution ledger
4. UI displays timeline (no Neon query needed)
```

---

**Status:** Domain model mapping complete  
**Next:** WORKSPACE_ROUTING_PLAN.md
