# Vienna Execution Warrant Policy

## Purpose

This policy introduces a transactional control layer between approval and execution.

Its purpose is to ensure that no non-trivial system action is executed unless it is:

* bound to a verified truth snapshot
* derived from an approved plan
* constrained to explicit allowed actions
* checked for trading safety
* auditable after execution

This layer closes the gap between "approved in principle" and "safe to execute in practice."

---

## Core Rule

**No T1 or T2 action may execute without a valid Execution Warrant.**

An Execution Warrant must be:

* issued by Vienna
* based on a fresh Hardenberg truth snapshot
* based on a specific Talleyrand plan
* based on a specific Metternich approval
* time-bounded
* scope-bounded
* verifiable before and after execution

**Castlereagh may execute only the actions explicitly permitted by the warrant.**

---

## Updated Lifecycle

```text
Truth → Hardenberg
Plan → Talleyrand
Validate → Metternich
Warrant → Vienna Control Layer
Execute → Castlereagh
Verify → Castlereagh + Hardenberg
Improve → Alexander
```

Not all steps are required for every task, but warranting is mandatory for T1 and T2 actions.

---

## Risk Tier Rules

### T0 — Low Risk

**Examples:**
- Inspection, log review, summarization
- Read-only reconciliation

**Warrant requirement:** NOT required (optional lightweight action record allowed)

**Routing:**
```
Vienna
OR Vienna → Castlereagh
OR Vienna → Hardenberg
```

---

### T1 — Moderate Risk

**Examples:**
- Configuration edits
- Safe automation changes
- Non-critical service restarts
- Controlled file writes

**Warrant requirement:** REQUIRED

**Minimum chain:**
```
Hardenberg → Talleyrand → Metternich → Vienna Warrant → Castlereagh
```

Vienna may skip Hardenberg only if current truth is already fresh and explicitly sufficient.

---

### T2 — High Risk

**Examples:**
- Deployments
- Runtime state modifications
- Infrastructure changes
- Model routing changes
- Changes that could affect trading continuity

**Warrant requirement:** REQUIRED

**Additional requirements:**
- Strict preflight verification required
- Rollback or compensating action required

**Required chain:**
```
Hardenberg → Talleyrand → Metternich → Vienna Warrant → Castlereagh → Verification
```

---

## Execution Warrant Definition

An Execution Warrant is the authoritative execution contract for a single bounded change.

It translates approved intent into machine-checkable operational limits.

**Warrants must be:**
- Unique
- Immutable after issue
- Short-lived
- Specific to one change scope
- Invalidated by stale truth or changed conditions

**Schema:** See `EXECUTION_WARRANT.schema.json`

---

## Vienna Control Layer Responsibilities

Vienna acts as warrant compiler and execution gatekeeper.

**Vienna control responsibilities:**
1. Bind execution to fresh truth
2. Bind execution to one approved plan
3. Narrow plan intent into explicit allowed actions
4. Block execution if preconditions fail
5. Record warrant issuance and outcome
6. Invalidate expired or drifted warrants

**Vienna may NOT:**
- Silently widen allowed actions after approval
- Execute T1/T2 actions without a warrant
- Treat conversational intent as sufficient authorization

---

## Agent Responsibilities Under Warranting

### Hardenberg — Truth Reconciliation

**Must provide:**
- `authoritative_sources`
- `conflicting_sources`
- `current_best_truth`
- `confidence`
- `open_unknowns`
- `last_verified_at`
- `truth_snapshot_hash` (NEW)

**Freshness windows:**
- T0: flexible
- T1: within 30 minutes
- T2: within 10 minutes

**Does NOT:**
- Approve risk
- Plan implementation
- Execute changes

---

### Talleyrand — Strategy & Planning

**Must provide:**
- `plan_id` (NEW)
- `objective`
- `steps`
- `dependencies`
- `rollback_strategy` (NEW)
- `blast_radius_estimate` (NEW)
- `assumptions`
- `plan_hash` (NEW)

**Does NOT:**
- Approve safety
- Execute changes
- Issue warrants

---

### Metternich — Governance & Risk

**Must provide:**
- `approval_id` (NEW)
- `status`
- `approved_scope` (explicit)
- `prohibited_scope` (explicit)
- `required_conditions`
- `risk_rationale`
- `approval_hash` (NEW)

**Must approve based on:**
- Truth basis
- Plan basis
- Risk tier
- Blast radius
- Rollback adequacy
- Trading continuity risk
- Policy compliance

**Does NOT:**
- Execute changes
- Rewrite plan during execution
- Broaden scope implicitly

---

### Castlereagh — Operations & Execution

**May execute only:**
- Actions explicitly allowed by warrant
- Actions within time validity
- Actions consistent with preconditions

**Must return:**
- `executed_actions`
- `observed_results`
- `deviations`
- `verification_results`
- `rollback_results_if_any`
- `final_status`
- `executed_at`

**Must refuse execution if:**
- Warrant missing
- Warrant expired
- Truth snapshot stale
- Requested action outside scope
- Trading protections not green

**Does NOT:**
- Plan
- Approve
- Reinterpret broad intent as permission
- Self-authorize extra changes

---

### Alexander — Learning & Improvement

**Receives:**
- Warrant outcomes
- Deviations
- Incidents
- Repeated failure patterns
- Rollback events

**Outputs:**
- `observed_pattern`
- `triggering_incidents`
- `root_cause_hypothesis`
- `recommended_changes`
- `priority`
- `confidence`

**Does NOT:**
- Determine current truth
- Approve live changes
- Execute fixes

---

## Warrant Validity Rules

A warrant is valid only if ALL of the following are true:

- ✓ Current time is before `expires_at`
- ✓ Truth snapshot is still fresh
- ✓ Truth snapshot hash still matches relevant observed state
- ✓ Plan hash matches approved plan
- ✓ Approval hash matches current approval
- ✓ Required preconditions are satisfied
- ✓ No forbidden trading impact is detected

**If any condition fails, the warrant is invalid.**

**Invalid warrants must NOT be executed.**

---

## Drift Invalidation Rules

A warrant must be invalidated if any of the following occur before execution:

- Relevant files changed outside expected path scope
- Service state changed materially
- Trading cron health changed
- Plan content changed
- Approval conditions changed
- Truth confidence drops below acceptable threshold

**For T2 actions:** Any material drift requires new Hardenberg reconciliation and new Metternich approval.

---

## Trading Safety Rules

**Trading continuity is a hard safety boundary.**

No warrant may permit actions that:

- Stop Kalshi trading cron jobs
- Disable autonomous trading windows
- Modify trading configuration without explicit T2 approval
- Restart or reload trading-related services unless explicitly approved
- Introduce unverified dependency changes affecting live trading

**Every T1/T2 warrant must include:**
- Trading safety assertion
- Explicit statement of whether trading systems are in scope
- Explicit verification that trading remained uninterrupted

**If trading is in scope, warrant must be treated as T2.**

---

## Preflight Verification

Before execution, Vienna or Castlereagh must confirm:

- ✓ Warrant exists
- ✓ Warrant is not expired
- ✓ Truth snapshot is fresh
- ✓ Approval exists and matches
- ✓ Plan exists and matches
- ✓ Target scope matches live request
- ✓ Backups exist if required
- ✓ Trading safety checks are green

**If any preflight check fails, execution must NOT begin.**

---

## Post-Execution Verification

After execution, Castlereagh must verify:

- ✓ Only intended targets changed
- ✓ No forbidden action occurred
- ✓ Expected outcome was achieved
- ✓ Services remain healthy
- ✓ Trading remains uninterrupted
- ✓ Diff or action record exists
- ✓ Rollback executed if needed

For higher-confidence closure, Vienna may request Hardenberg reconciliation after execution.

---

## Audit Record Requirements

Every T1 and T2 execution must produce an audit record containing:

- `change_id`
- `risk_tier`
- `truth_snapshot_id`
- `plan_id`
- `approval_id`
- `issued_at`
- `executed_at`
- `actor`
- `target_scope`
- `executed_actions`
- `deviations`
- `verification_results`
- `rollback_results`
- `final_status`

**Audit records should be append-only.**

**Location:** `warrants/audit/`

---

## Failure Handling

If execution fails, Vienna must classify the failure as:

- Preflight failure
- Execution failure
- Verification failure
- Rollback failure
- Truth drift failure
- Policy violation

**Alexander should receive any of the following as learning triggers:**
- Repeated drift invalidations
- Repeated rollback events
- Recurring approval/execution mismatches
- Incidents near trading boundaries
- Scope creep attempts by execution layer

---

## Minimal Operational Policy (Compact Version)

**For any T1 or T2 action, require an Execution Warrant before Castlereagh may act.**

A valid warrant must bind:
- One fresh Hardenberg truth snapshot
- One Talleyrand plan
- One Metternich approval
- One bounded action scope
- One expiration window
- One verification set
- One rollback path if needed

**Castlereagh may execute only explicitly allowed actions inside the warrant.**

Any truth drift, scope drift, approval mismatch, expiration, or trading safety failure invalidates the warrant.

**No trading-interrupting action is allowed without explicit T2 treatment and direct verification.**

---

## Implementation Status

**Phase:** Policy defined, implementation pending

**Required artifacts:**
- ✓ `VIENNA_WARRANT_POLICY.md` (this file)
- ⏳ `EXECUTION_WARRANT.schema.json`
- ⏳ `scripts/precheck-trading-guard.sh`
- ⏳ `scripts/issue-warrant.js`
- ⏳ `scripts/verify-warrant.js`
- ⏳ `warrants/` directory structure

**Next steps:**
1. Create schema and validation scripts
2. Update agent output schemas to include required IDs/hashes
3. Integrate warrant checks into delegation wrapper
4. Create audit trail infrastructure
5. Test with non-critical T1 action

---

**Owner:** Vienna  
**Approved:** 2026-03-10  
**Status:** DRAFT (policy defined, awaiting implementation)
