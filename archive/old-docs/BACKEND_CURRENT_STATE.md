# Backend Current State — regulator.ai

**Date:** 2026-03-14  
**Purpose:** Stage 2 Architecture Reconciliation — Backend Inspection

---

## API Route Structure

**Current state:** NO API routes exist yet.

```
src/app/api/
```

This directory does not exist. regulator.ai is currently a **static landing page** with no backend endpoints.

**Implication:** Vienna integration will need to define the entire API surface.

---

## Data Access Patterns

**Current database layer:**

```
src/db/index.ts
src/db/schema.ts
```

**ORM:** Drizzle ORM (neon-http adapter)  
**Database:** Neon Postgres (serverless)  
**Schema definition:** pgSchema('regulator')

**Connection:**

```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

**Access pattern:** Direct `drizzle` instance exported.

**Current usage:** NONE (no API routes consuming database yet).

---

## Existing Schema

**5 tables defined:**

### 1. `proposals`

Agent action proposals with lifecycle state machine:

```
submitted → validated → policy_checked → authorized → executing → executed → verified → archived
```

Fields:
- `id` (uuid, PK)
- `agentId` (text)
- `action` (text)
- `payload` (jsonb)
- `riskTier` (integer, default 0)
- `state` (text, default 'submitted')
- `warrantId` (uuid, nullable)
- `result` (jsonb, nullable)
- `error` (text, nullable)
- `createdAt` / `updatedAt` (timestamp)

**Vienna mapping:** Similar to Vienna's `intent` + `plan` combination

---

### 2. `policies`

Governance rules for agent actions:

Fields:
- `id` (uuid, PK)
- `name` (text)
- `description` (text, nullable)
- `rules` (jsonb)
- `riskTier` (integer, nullable)
- `enabled` (boolean, default true)
- `createdAt` / `updatedAt` (timestamp)

**Vienna mapping:** Direct match to Vienna's `policies` table

---

### 3. `warrants`

Authorization tokens for execution:

Fields:
- `id` (uuid, PK)
- `proposalId` (uuid, FK)
- `signature` (text)
- `expiresAt` (timestamp)
- `revoked` (boolean, default false)
- `revokedAt` / `revokedReason` (timestamp/text, nullable)
- `issuedBy` (text)
- `createdAt` (timestamp)

**Vienna mapping:** Similar to Vienna's execution authorization + warrant concept

---

### 4. `auditLog`

Event trail for all proposal lifecycle events:

Fields:
- `id` (uuid, PK)
- `proposalId` / `warrantId` (uuid, nullable)
- `event` (text)
- `actor` (text)
- `riskTier` (integer, nullable)
- `details` (jsonb)
- `createdAt` (timestamp)

**Vienna mapping:** Similar to Vienna's `execution_ledger_events`

---

### 5. `adapters`

Configuration for external integrations:

Fields:
- `id` (uuid, PK)
- `name` / `type` (text)
- `config` (jsonb)
- `enabled` (boolean, default true)
- `createdAt` (timestamp)

**Vienna mapping:** Deployment adapter configuration (not core governance)

---

## Governance Logic Location

**Current state:** NONE exists yet.

No governance logic is implemented. The schema exists but no:

- Policy evaluation engine
- Warrant issuance
- Execution routing
- Verification engine
- Audit logging

**Implication:** Vienna integration will provide **ALL governance logic**.

---

## Limitations for Vienna Runtime

### Current Constraints

**No backend infrastructure:**
- No API routes
- No governance execution
- No background services
- No watchdog/monitoring

**Schema gaps for Vienna:**
- Missing `investigations` table
- Missing `artifacts` table
- Missing `traces` table (distinct from audit_log)
- Missing `executions` table (distinct from proposals)
- Missing `incidents` table
- Missing `objectives` table
- Missing `verifications` table
- Missing `workflow_outcomes` table

**Data model mismatch:**
- `proposals` combines Vienna's `intent` + `plan` + `execution`
- No multi-step plan support
- No verification layer (separate from execution)
- No investigation/artifact workspace

**Architectural constraints:**
- Drizzle ORM (Neon serverless) → no local SQLite for dev
- Next.js App Router → serverless by default (no long-running processes)
- pgSchema('regulator') → all tables namespaced

---

## Architecture Implications

### Vienna Runtime Cannot Run Embedded in Next.js

**Why:**

Vienna requires:
- Continuous evaluation loops (background objective monitoring)
- Watchdog processes (execution timeouts, circuit breakers)
- Long-running reconciliation (autonomous drift correction)
- Artifact filesystem management (workspace storage)
- SQLite State Graph (dev environment)

Next.js App Router is:
- Stateless per-request
- Serverless function execution model
- No persistent background processes
- No filesystem persistence (Vercel ephemeral)

**Decision:** Vienna runtime MUST be a separate service.

---

## Recommended Backend Shape

### Architecture Decision

**Vienna Runtime:** Separate service process  
**regulator.ai Backend:** Next.js API routes (thin adapter layer)

**Why:**

- Vienna needs continuous loops → separate process
- Vienna needs SQLite dev mode → separate process
- Vienna needs filesystem artifacts → separate process
- Vienna needs watchdogs → separate process

**Next.js role:** Product shell, API adapter, UI rendering only.

**Communication:** HTTP API boundary between Next.js ↔ Vienna runtime.

---

## Next Steps

1. **Define API boundary** (Next.js ↔ Vienna runtime)
2. **Map domain models** (Regulator schema ↔ Vienna entities)
3. **Plan workspace routing** (investigation/artifact UI integration)
4. **Define adapter layer** (Drizzle adapter for Vienna State Graph reads)

---

**Status:** Backend inspection complete.  
**Next:** ARCHITECTURE_DECISION_BACKEND.md
