# Vienna Execution Roadmap (Autonomous Mode)

**Status:** IN PROGRESS  
**Started:** 2026-03-23 20:30 EDT  
**Current Phase:** Phase 1 — Local Validation Pass

---

## Guiding Principle

Vienna is no longer building features.

Vienna is:

> **Proving that governed execution works end-to-end under real conditions**

---

## Hard Guardrails (ENFORCED)

1. ❌ **No new endpoints**
2. ❌ **No schema changes unless required for validation**
3. ❌ **No UI expansion beyond Intent panel**
4. ❌ **No agent shortcuts or alternate execution paths**
5. ✅ **All execution MUST go through `/api/v1/intent`**

---

## Phase 1 — Local Validation Pass (CURRENT)

### Objective
Prove the system works in the controlled environment before touching production.

### Tasks

#### 1. Start clean environment
- [ ] Restart backend
- [ ] Clear test database (or isolate test tenant)
- [ ] Ensure no stale state

#### 2. Run 5 validation cases via Intent UI

**Case 1 — Success:**
```json
{"mode":"success"}
```

**Case 2 — Simulation:**
```json
{"mode":"simulation"}
```
(toggle simulation ON explicitly)

**Case 3 — Quota Block:**
```json
{"mode":"quota_block"}
```

**Case 4 — Budget Block:**
```json
{"mode":"budget_block"}
```

**Case 5 — Failure:**
```json
{"mode":"failure"}
```

#### 3. For EACH case capture:
- [ ] Request payload
- [ ] UI output
- [ ] Raw backend response
- [ ] DB state after execution

#### 4. Validate invariants

**Execution correctness:**
- [ ] Success executes
- [ ] Simulation does not execute
- [ ] Blocks prevent execution

**Governance correctness:**
- [ ] Quota enforced
- [ ] Budget enforced
- [ ] Policy evaluated

**Financial correctness:**
- [ ] Cost only for real execution
- [ ] No cost for simulation
- [ ] No cost for blocked

**Attestation correctness:**
- [ ] Exists for executed (and if required, simulation)
- [ ] Linked to intent
- [ ] Not duplicated

**Data integrity:**
- [ ] No duplicate rows
- [ ] Correct tenant attribution
- [ ] Consistent IDs across tables

#### 5. Write validation logs
- [ ] Use `/api/v1/validation/log` for each case
- [ ] If endpoint incomplete → implement minimal version ONLY for logging

### Exit Criteria
- [ ] All 5 cases pass
- [ ] No invariant violations
- [ ] Logs recorded

---

## Phase 2 — Backend Truth Hardening

### Objective
Ensure backend is deterministic and audit-safe.

### Tasks

#### 1. Enforce single-write guarantees
- [ ] No duplicate intent creation
- [ ] Idempotency if needed (optional but ideal)

#### 2. Normalize response shape
Every `/api/v1/intent` response must include:
- [ ] tenant
- [ ] status
- [ ] explanation
- [ ] simulation flag
- [ ] cost
- [ ] attestation
- [ ] error (if any)

No missing fields. No UI guessing.

#### 3. Explicit state transitions
Ensure backend uses clear states:
- [ ] `executed`
- [ ] `simulated`
- [ ] `blocked_quota`
- [ ] `blocked_budget`
- [ ] `failed`

No ambiguous states.

#### 4. Logging completeness
Each intent should produce:
- [ ] Intent record
- [ ] Decision record (policy/quota/budget)
- [ ] Attestation record (if applicable)
- [ ] Cost record (if applicable)

### Exit Criteria
- [ ] Deterministic outputs
- [ ] Stable schema
- [ ] Clean audit trail

---

## Phase 3 — Production Deployment

### Objective
Move validated system to real environment.

### Tasks

#### 1. Deploy backend to Fly
- [ ] Include latest runtime stub
- [ ] Include all intent pipeline fixes

#### 2. Deploy frontend to Vercel
- [ ] Ensure correct build hash
- [ ] Verify base path + proxy config

#### 3. Verify routing
From browser: `console.regulator.ai → /api/* → vienna-os.fly.dev`

Check:
- [ ] No CORS issues
- [ ] No 404/timeout
- [ ] Auth/session working

### Exit Criteria
- [ ] Console loads
- [ ] Intent submission reaches backend
- [ ] No runtime crashes

---

## Phase 4 — Production Validation Pass (CRITICAL)

### Objective
Prove system works in real deployment.

**Repeat Phase 1 EXACTLY in production.**

### Tasks
- [ ] Run all 5 cases from `https://console.regulator.ai`
- [ ] Validate same invariants
- [ ] Compare results (Local vs Production must match)

### Exit Criteria
- [ ] 5/5 cases pass in production
- [ ] No divergence from local behavior

---

## Phase 5 — Persistence Deep Audit

### Objective
Prove system is trustworthy.

### Tasks

For each validation run:

**Verify:**
- [ ] Correct tenant on all records
- [ ] Intent → attestation linkage
- [ ] Intent → cost linkage
- [ ] No orphan records
- [ ] No duplicate writes
- [ ] Correct timestamps/order

**Edge checks:**
- [ ] Simulation creates no billable artifacts
- [ ] Blocked runs leave no execution traces
- [ ] Failure does not create false success records

### Exit Criteria
- [ ] Database is clean and consistent
- [ ] Audit trail is reconstructable

---

## Phase 6 — Phase 28 Integration (First Real Execution)

### Objective
Prove Vienna controls real external work.

### Build ONE integration only

Choose:
- Health check
- Webhook
- Simple external API call

### Requirements

Must go through:
```
Intent → Governance → Execution → Attestation → Cost → Response
```

Must prove:
- [ ] Tenant preserved
- [ ] Execution actually occurs externally
- [ ] Cost recorded
- [ ] Attestation generated
- [ ] Visible in UI

**Do NOT build:**
- Multiple integrations
- Abstraction layers
- Plugin systems

One proof is enough.

### Exit Criteria
- [ ] Real action executed
- [ ] Fully governed
- [ ] Fully traceable

---

## Phase 7 — Final Classification

### Objective
Lock the system state.

### Confirm:

| Phase | Status |
|-------|--------|
| 21–24 | Proven |
| 27    | Proven |
| 29    | Proven |
| 28    | Proven |
| 26.2+ | Deferred |
| 25, 30| Inactive |

### Freeze architecture
After this:
- [ ] No structural changes
- [ ] Only extensions via integrations

---

## Phase 8 — Post-Freeze (Optional, Not Now)

Only after everything above:
- Retry/DLQ (26.2+)
- Agent SDK
- NL → intent proposals
- Federation (future)

---

## Failure Rules

If anything breaks:
1. Stop immediately
2. Fix root cause
3. Re-run full validation
4. Do NOT patch around issues

---

## Execution Log

### 2026-03-23 20:30 EDT — Roadmap Created
- Roadmap document created
- Starting Phase 1 — Local Validation Pass
- Next: Clean environment setup

---

## Final Operating Mode

Vienna should now operate as:

> A governed execution engine where every action is:
> * intentional
> * validated
> * enforced
> * recorded
> * auditable

---

**When complete, produce final validation report.**

---

## Execution Log

### 2026-03-23 20:30 EDT — Roadmap Created
- Roadmap document created
- Starting Phase 1 — Local Validation Pass

### 2026-03-23 20:35 EDT — Phase 1 Complete ✅
- Test environment setup: ✅ COMPLETE
- Backend restarted with clean test database
- All 5 validation cases executed: ✅ PASS
  - Case 1 (Success): ✅ PASS
  - Case 2 (Simulation): ✅ PASS
  - Case 3 (Quota Block): ✅ PASS
  - Case 4 (Budget Block): ✅ PASS
  - Case 5 (Failure): ✅ PASS
- Database validation: ✅ PASS (11 intent traces, 0 duplicates)
- All invariants validated
- Results documented: `validation-results/phase1-local-validation.md`

**Phase 1 Status:** ✅ COMPLETE  
**Next:** Phase 2 — Backend Truth Hardening

