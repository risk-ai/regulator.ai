# Vienna OS — State Machine Specifications

> Formal state transition tables for all Vienna OS state machines.
> These tables are the authoritative specification. Code must conform to these transitions.

## 1. Warrant Lifecycle

```
┌──────────┐  issue()   ┌──────────┐  expires_at  ┌──────────┐
│          │───────────▶│          │──────────────▶│          │
│ (none)   │            │  issued  │               │ expired  │
│          │            │          │               │          │
└──────────┘            └────┬─────┘               └──────────┘
                             │
                             │ invalidate()
                             ▼
                        ┌──────────┐
                        │invalidated│
                        └──────────┘
```

| From | To | Trigger | Condition |
|------|-----|---------|-----------|
| (none) | issued | `Warrant.issue()` | T0/T1: auto; T2: approvalId present; T3: 2+ approvals + justification + rollback |
| issued | expired | Clock | `now > expires_at` |
| issued | invalidated | `Warrant.invalidate()` | Reason required |
| expired | — | Terminal | No transitions from expired |
| invalidated | — | Terminal | No transitions from invalidated |

**Invariants:**
- Signature covers: warrant_id, issued_by, issued_at, expires_at, risk_tier, truth_snapshot_id, truth_snapshot_hash, plan_id, approval_ids, objective, allowed_actions, forbidden_actions, constraints
- Any modification to signed fields → `WARRANT_TAMPERED` on verify
- TTL cap: T0 ≤ 60min, T1 ≤ 30min, T2 ≤ 15min, T3 ≤ 5min

---

## 2. Intent Lifecycle

```
┌──────────┐  submit   ┌──────────┐  policy eval  ┌────────────┐
│          │──────────▶│          │──────────────▶│            │
│ (none)   │           │ submitted│               │ evaluating │
│          │           │          │               │            │
└──────────┘           └──────────┘               └─────┬──────┘
                                                        │
                                          ┌─────────────┼─────────────┐
                                          ▼             ▼             ▼
                                    ┌──────────┐ ┌───────────┐ ┌──────────┐
                                    │ approved │ │  pending   │ │  denied  │
                                    │(T0/T1)   │ │ (T2/T3)   │ │          │
                                    └────┬─────┘ └─────┬─────┘ └──────────┘
                                         │             │
                                         │  approve()  │
                                         │◀────────────┘
                                         │     deny()
                                         │─────────────▶ denied
                                         ▼
                                    ┌──────────┐
                                    │ executed  │
                                    └──────────┘
```

| From | To | Trigger | Condition |
|------|-----|---------|-----------|
| (none) | submitted | Agent submits intent | API key valid, tenant active |
| submitted | evaluating | Policy engine invoked | Automatic |
| evaluating | approved | Policy allows + T0/T1 | No approval required |
| evaluating | pending | Policy allows + T2/T3 | Approval required |
| evaluating | denied | Policy denies | Policy decision = deny |
| pending | approved | Human approves | Required approvers met |
| pending | denied | Human denies | Any approver denies |
| approved | executed | Warrant issued + action runs | Warrant valid |

---

## 3. Approval State Machine

```
┌──────────┐  create  ┌──────────┐  approve  ┌──────────┐
│          │─────────▶│          │──────────▶│          │
│ (none)   │          │ pending  │           │ approved │
│          │          │          │           │          │
└──────────┘          └────┬─────┘           └──────────┘
                           │
                           │ deny / expire
                           ▼
                      ┌──────────┐
                      │ denied/  │
                      │ expired  │
                      └──────────┘
```

| From | To | Trigger | Condition |
|------|-----|---------|-----------|
| (none) | pending | Intent requires approval | T2: 1 approver; T3: 2+ approvers |
| pending | approved | `resolveApproval('approve')` | Required approval count met |
| pending | denied | `resolveApproval('deny')` | Any approver denies |
| pending | expired | Clock | `now > approval_expires_at` (24h default) |

**Sources:** Console UI, Slack interactive buttons, Email approve/deny links

---

## 4. Queue State Machine (Phase 16.3)

```
READY ──▶ RUNNING ──▶ COMPLETED
  │          │
  │          ├──▶ FAILED
  │          │
  ├──▶ BLOCKED_LOCK ──▶ READY
  │
  ├──▶ BLOCKED_APPROVAL ──▶ READY
  │
  ├──▶ BLOCKED_DEPENDENCY ──▶ READY
  │
  └──▶ RETRY_SCHEDULED ──▶ READY
```

| From | Allowed To |
|------|-----------|
| READY | RUNNING, BLOCKED_LOCK, BLOCKED_APPROVAL, BLOCKED_DEPENDENCY, RETRY_SCHEDULED, CANCELLED |
| RUNNING | COMPLETED, FAILED, BLOCKED_LOCK, BLOCKED_APPROVAL, BLOCKED_DEPENDENCY, RETRY_SCHEDULED, CANCELLED |
| BLOCKED_LOCK | READY, RETRY_SCHEDULED, CANCELLED |
| BLOCKED_APPROVAL | READY, CANCELLED |
| BLOCKED_DEPENDENCY | READY, RETRY_SCHEDULED, CANCELLED |
| RETRY_SCHEDULED | READY, CANCELLED |
| COMPLETED | (terminal) |
| FAILED | (terminal) |
| CANCELLED | (terminal) |

---

## 5. Reconciliation State Machine (Phase 10.1b)

```
┌──────────┐  drift   ┌──────────────┐  success  ┌──────────┐
│          │─────────▶│              │──────────▶│          │
│   idle   │          │ reconciling  │           │ cooldown │
│          │◀─────────│              │           │          │──▶ idle
└──────────┘  recover └──────┬───────┘           └──────────┘
                             │
                             │ failure
                             ▼
                        ┌──────────┐    max retries  ┌───────────┐
                        │ degraded │────────────────▶│ safe_mode │
                        └──────────┘                 └───────────┘
```

| From | To | Trigger |
|------|-----|---------|
| idle | reconciling | Drift detected by evaluator |
| reconciling | cooldown | Verification succeeds |
| reconciling | degraded | Execution or verification fails |
| cooldown | idle | Cooldown timer expires |
| degraded | reconciling | Cooldown expires, retry |
| degraded | safe_mode | Max retries exceeded |
| safe_mode | idle | Manual operator intervention |

**Principle:** Evaluator observes → Reconciliation gate decides → Execution performs → Verification determines truth → Ledger records lifecycle.

---

## 6. Risk Tier Decision Matrix

| Factor | T0 | T1 | T2 | T3 |
|--------|-----|-----|-----|-----|
| Example actions | status_check, file.read | send_email, create_ticket | deploy_code, modify_database | wire_transfer, delete_production |
| Financial impact | ≤$0 | ≤$1K | ≤$10K | >$10K |
| Reversibility | — | — | Irreversible → T2+ | — |
| PII + system_wide | — | — | — | Always T3 |
| Regulatory scope | — | — | — | Always T3 |
| Warrant required | No | Yes | Yes | Yes |
| Approval required | No | No | Yes (1) | Yes (2+) |
| Justification | No | No | No | Yes |
| Rollback plan | No | No | No | Yes |
| Max TTL | 60 min | 30 min | 15 min | 5 min |
| Truth freshness | ∞ | 30 min | 10 min | 5 min |
| Enhanced audit | No | No | No | Yes |

---

*Generated from Vienna OS codebase. Source files: `governance/warrant.js`, `governance/risk-tier.js`, `core/policy-engine.js`, `core/approval-state-machine.js`, `queue/state-machine.ts`, `core/reconciliation-state-machine.js`*
