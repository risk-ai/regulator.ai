# Vienna Integration Boundary Definition

**Date:** 2026-03-14  
**Purpose:** Freeze the architectural boundary between product shell and Vienna runtime to prevent accidental blurring during migration

---

## Core Principle

> The product shell (regulator.ai Next.js app) is the delivery mechanism.  
> Vienna runtime is the governed execution and investigation system.  
> These are distinct architectural layers with clear responsibilities.

**Do not:**
- Move governance logic into React components
- Flatten Vienna semantics into generic admin UI patterns
- Bypass Vienna execution pipeline from frontend
- Store governance state in frontend-only structures

---

## Three-Layer Architecture

### Layer 1: Product Shell (Next.js App)

**Location:** `regulator.ai/src/app/`, `src/components/`

**Responsibility:**
- User-facing presentation
- Authentication and session management
- Routing and navigation
- Layout and theme
- Client-side interactions
- Form submission and validation

**Technologies:**
- Next.js 14 App Router
- React 18
- Tailwind CSS
- NextAuth.js

**What it DOES:**
- Render investigation lists and detail views
- Display artifacts and timelines
- Show governance reasoning traces
- Provide operator controls (approve/deny)
- Handle authentication flows

**What it DOES NOT:**
- Decide if action is authorized
- Evaluate policies
- Execute commands
- Verify execution outcomes
- Track reconciliation state
- Generate warrants

**Example allowed code:**
```typescript
// src/components/workspace/InvestigationDetail.tsx
export function InvestigationDetail({ id }: { id: string }) {
  const { data: investigation } = useInvestigation(id)
  const { data: artifacts } = useArtifacts(id)
  
  return (
    <div>
      <h1>{investigation.name}</h1>
      <ArtifactBrowser artifacts={artifacts} />
      <TraceTimeline investigationId={id} />
    </div>
  )
}
```

**Example forbidden code:**
```typescript
// ❌ WRONG: Governance logic in component
export function InvestigationDetail({ id }: { id: string }) {
  const executeAction = async () => {
    // NO: Policy evaluation in frontend
    if (currentUser.role === 'admin') {
      await executeCommand(action)
    }
  }
}
```

**Correct pattern:**
```typescript
// ✅ CORRECT: Call governed API
export function InvestigationDetail({ id }: { id: string }) {
  const executeAction = async () => {
    // Governance happens server-side
    const result = await api.submitIntent({ action, context })
    // Frontend receives approval request or execution result
    if (result.requires_approval) {
      showApprovalCard(result.proposal)
    }
  }
}
```

---

### Layer 2: Vienna Application Layer

**Location:** `regulator.ai/src/lib/workspace/`, `src/app/api/workspace/`

**Responsibility:**
- Investigation data model
- Artifact storage and retrieval
- Timeline queries
- Related entity graph
- API contracts between frontend and runtime
- Data validation and serialization

**Technologies:**
- TypeScript
- Drizzle ORM
- Neon Postgres
- Next.js API routes (if embedded) OR REST API client (if separate)

**What it DOES:**
- Define Investigation, Artifact, Incident types
- Query/persist investigations and artifacts
- Expose stable API endpoints for frontend
- Transform database records into frontend-ready DTOs
- Handle pagination, filtering, search

**What it DOES NOT:**
- Execute commands
- Evaluate policies
- Issue warrants
- Run reconciliation loops
- Make governance decisions

**Example allowed code:**
```typescript
// src/lib/workspace/api.ts
export async function getInvestigation(id: string): Promise<Investigation> {
  const db = getDatabase()
  const investigation = await db.query.investigations.findFirst({
    where: eq(investigations.id, id),
    with: { artifacts: true }
  })
  return investigation
}
```

**Example forbidden code:**
```typescript
// ❌ WRONG: Governance decision in application layer
export async function executeRemediation(objectiveId: string) {
  // NO: This is runtime responsibility
  const objective = await getObjective(objectiveId)
  if (objective.status === 'unhealthy') {
    await restartService(objective.target)  // ❌ Bypass governance
  }
}
```

**Correct pattern:**
```typescript
// ✅ CORRECT: Trigger governed execution
export async function requestRemediation(objectiveId: string) {
  // Application layer prepares request
  const objective = await getObjective(objectiveId)
  
  // Runtime layer handles governance
  return await viennaRuntime.submitIntent({
    type: 'remediation',
    objective_id: objectiveId,
    proposed_by: 'operator'
  })
}
```

---

### Layer 3: Vienna Runtime/Governance Core

**Location:**
- Option A (embedded): `regulator.ai/src/lib/vienna-runtime/`
- Option B (separate): `vienna-runtime/lib/`

**Responsibility:**
- Governance decisions (policy evaluation, warrant issuance)
- Execution coordination
- Verification checks
- Objective evaluation
- Reconciliation loops
- State machine enforcement
- Audit trail generation

**Technologies:**
- Node.js / TypeScript
- State Graph (Postgres-backed)
- Execution adapters
- Policy engine
- Verification engine

**What it DOES:**
- Receive intents from application layer
- Evaluate policies against constraints
- Issue time-bounded warrants
- Execute actions via adapters
- Run independent verification checks
- Maintain objective state machines
- Record all governance events in ledger

**What it DOES NOT:**
- Render UI
- Handle HTTP requests directly (if embedded)
- Manage user sessions
- Store presentation state

**Example allowed code:**
```typescript
// src/lib/vienna-runtime/core/intent-handler.ts
export async function handleIntent(intent: Intent): Promise<IntentResult> {
  // 1. Generate plan
  const plan = await planGenerator.generatePlan(intent)
  
  // 2. Evaluate policies
  const policyResult = await policyEngine.evaluate(plan)
  if (!policyResult.approved) {
    return { status: 'denied', reason: policyResult.reason }
  }
  
  // 3. Issue warrant
  const warrant = await warrantAuthority.issue(plan, policyResult)
  
  // 4. Execute
  const executionResult = await executor.execute(plan, warrant)
  
  // 5. Verify
  const verificationResult = await verifier.verify(executionResult)
  
  // 6. Record outcome
  await ledger.record({ plan, execution: executionResult, verification: verificationResult })
  
  return { status: 'completed', outcome: verificationResult }
}
```

**Example forbidden code:**
```typescript
// ❌ WRONG: UI concerns in runtime
export async function handleIntent(intent: Intent) {
  const result = await execute(intent)
  
  // NO: Runtime should not know about UI
  if (result.success) {
    displaySuccessToast('Action completed')  // ❌ UI coupling
  }
  
  return result
}
```

---

## Boundary Enforcement Rules

### Rule 1: Governance Must Not Leak Into Frontend

**Forbidden:**
- Policy evaluation in React components
- Warrant generation client-side
- Execution decisions based on user role checks in frontend

**Allowed:**
- Display governance outcomes (approved, denied, reason)
- Show policy constraints to user before submission
- Present warrant details and expiration

### Rule 2: Frontend Must Not Bypass Runtime

**Forbidden:**
- Direct database writes from React components
- Command execution from browser
- Policy rule modification without audit trail

**Allowed:**
- Submit intents to runtime API
- Display runtime responses
- Request approval/denial via structured API

### Rule 3: Application Layer Is Data, Not Decisions

**Forbidden:**
- "Smart" CRUD that makes governance decisions
- Implicit authorization (e.g., "admins can delete")
- State transitions without runtime state machine

**Allowed:**
- Query investigations, artifacts, timelines
- Validate input formats
- Transform data for presentation

### Rule 4: Runtime Owns State Machines

**Forbidden:**
- Objective state transitions in application layer
- Plan lifecycle management in frontend
- Reconciliation state updates from API routes

**Allowed:**
- Query current state for display
- Trigger state machine via runtime API
- Receive state change events

---

## Integration Points (Safe Crossings)

### How Layers Communicate

```
Product Shell → Application Layer → Runtime Core
     ↓                ↓                  ↓
  Display         API Contract      Governance
```

### Frontend → Application Layer

**Safe patterns:**
- REST API calls (`/api/workspace/investigations`)
- React hooks (`useInvestigation(id)`)
- Server Components (Next.js 14 server data fetching)

**Unsafe patterns:**
- Direct database imports in client components
- Shared state management (Zustand, Redux) with governance logic

### Application Layer → Runtime Core

**Safe patterns:**
- Function calls (if embedded): `viennaRuntime.submitIntent(intent)`
- HTTP API (if separate): `POST /api/v1/intents`
- Structured message passing

**Unsafe patterns:**
- Bypassing runtime validation
- Direct State Graph writes from application layer
- Shared mutable state

---

## Validation Checklist

Before merging any code, verify:

- [ ] No policy evaluation in React components
- [ ] No execution logic in frontend
- [ ] No warrant generation client-side
- [ ] No state machine transitions outside runtime
- [ ] All governance decisions go through runtime API
- [ ] Application layer only queries/transforms data
- [ ] Frontend only displays outcomes, doesn't compute them

---

## Migration Safeguards

During Vienna → regulator.ai migration:

### Phase 3 (Frontend Port)

**Watch for:**
- Vite routing → Next.js App Router: Preserve boundary (no logic in route files)
- API client porting: Keep all calls to runtime API, no inline governance

### Phase 4 (Backend Integration)

**Watch for:**
- Vienna APIs → Next.js route handlers: Keep route handlers thin, delegate to runtime
- State Graph migration: Runtime owns writes, application layer only reads

### Phase 5 (Validation)

**Test:**
- Can frontend display governance outcomes? ✅
- Does frontend attempt governance decisions? ❌
- Can application layer query data? ✅
- Does application layer execute commands? ❌
- Does runtime enforce all policies? ✅
- Can runtime be bypassed? ❌

---

## Red Flags (Signs of Boundary Violation)

### In Frontend Code

```typescript
// ❌ Policy logic in component
if (user.role === 'admin' && action.riskTier < 3) {
  executeAction()
}

// ❌ Warrant generation client-side
const warrant = signWarrant(action, user.privateKey)

// ❌ Direct execution
await fetch('/system/restart', { method: 'POST' })
```

### In Application Layer Code

```typescript
// ❌ Governance decision in API route
export async function POST(req: Request) {
  const { action } = await req.json()
  
  // NO: This is runtime responsibility
  if (isAuthorized(action)) {
    await executeAction(action)
  }
}
```

### In Runtime Code

```typescript
// ❌ UI concerns in runtime
export async function executeIntent(intent: Intent) {
  const result = await execute(intent)
  
  // NO: Runtime should not format for display
  return {
    ...result,
    displayMessage: `Action ${result.status}`,  // ❌ UI coupling
    icon: result.success ? '✅' : '❌'
  }
}
```

---

## Green Flags (Correct Boundary Respect)

### In Frontend Code

```typescript
// ✅ Submit intent, display outcome
const result = await api.submitIntent(intent)
if (result.requires_approval) {
  setApprovalRequest(result.proposal)
} else {
  setExecutionResult(result.outcome)
}
```

### In Application Layer Code

```typescript
// ✅ Thin API route, delegates to runtime
export async function POST(req: Request) {
  const intent = await req.json()
  const result = await viennaRuntime.handleIntent(intent)
  return Response.json(result)
}
```

### In Runtime Code

```typescript
// ✅ Pure governance logic
export async function handleIntent(intent: Intent): Promise<IntentResult> {
  const plan = await generatePlan(intent)
  const policyResult = await evaluatePolicy(plan)
  const warrant = await issueWarrant(plan, policyResult)
  const outcome = await execute(plan, warrant)
  return outcome
}
```

---

## Summary

**Product Shell:** Presents governance outcomes, does not compute them

**Application Layer:** Queries data, validates input, does not make governance decisions

**Runtime Core:** Owns all governance logic, execution, verification, state machines

**Communication:** Structured APIs, no shared mutable state, no logic leakage

**Enforcement:** Code review, test validation, architectural principles

**Migration constraint:** Port components without flattening Vienna semantics

---

**This boundary is frozen.** Any code that violates it during migration must be refactored before merge.
