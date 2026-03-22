# UI Overhaul Master Plan — Vienna Console

**Created:** 2026-03-14  
**Purpose:** Total frontend restructure to industry-grade operator product  
**Trigger:** Contradictory provider status between dashboard surfaces (unacceptable state truth)

---

## Mission Statement

Transform Vienna Console from prototype dashboard to **industry-grade operator shell for governed infrastructure.**

**Core product standard:**
```
Vienna should feel like a serious control plane for governed execution infrastructure,
not a prototype dashboard with chat bolted on.
```

---

## Problem Statement

### Current State (Unacceptable)

**Observable failure:**
- Chat surface: "🚨 Chat Unavailable — all providers unavailable"
- Dashboard: Providers shown as green/healthy
- **Contradictory system truth visible to operator**

**Root causes:**
1. Multiple disconnected state sources
2. Inconsistent state interpretation (`unknown` treated as failure)
3. No unified status aggregation
4. Frontend derives what backend should aggregate
5. Information architecture built around prototype, not product
6. Workspace/files surface incomplete or broken
7. Visual design inconsistent across surfaces
8. Error handling chaotic (spam vs silence)

### Target State (Required)

**Operator trust restored:**
- Single source of truth per state domain
- Consistent status interpretation across all surfaces
- Graceful degradation (assistant down ≠ product broken)
- Clear, specific error messages
- Coherent navigation and information architecture
- Professional, infrastructure-native visual design
- Reliable, functional workspace experience

---

## Scope & Constraints

### In Scope
- ✅ Console frontend (`console/client/`)
- ✅ Console backend views/aggregations (`console/server/`)
- ✅ Read-only API additions
- ✅ State model refactoring
- ✅ Information architecture
- ✅ Visual design system
- ✅ UX functional repair
- ✅ Error handling

### Out of Scope (Protected)
- ❌ Vienna Core governance runtime
- ❌ Execution watchdog
- ❌ Reconciliation gate
- ❌ State machine logic
- ❌ Policy enforcement
- ❌ Warrant system

### Safety Constraints

**Protected runtime files (no modifications without approval):**
```
vienna-core/lib/core/execution-watchdog.js
vienna-core/lib/core/reconciliation-gate.js
vienna-core/lib/core/remediation-trigger-integrated.js
vienna-core/lib/core/failure-policy-schema.js
vienna-core/lib/core/objective-evaluator-integrated.js
vienna-core/lib/core/objective-coordinator-integrated.js
```

**Phase 10.3 observation window:** Under 24-hour monitoring, must not disrupt runtime behavior

---

## Overhaul Structure

### Phase 1: State Truth Model (P0 — 4-6 hours)
**Goal:** Fix contradictory system state

**Deliverables:**
- ✅ `STATE_TRUTH_MODEL.md` (complete)
- Backend: `/api/v1/status/assistant` endpoint
- Backend: Refactored `/api/v1/status` (runtime/assistant separation)
- Frontend: `useAssistantStatus()` hook
- Frontend: Fix `useProviderHealth()` interpretation
- Frontend: Update `ProviderStatusBanner` + `ChatInput`
- Validation: 4 test scenarios (fresh start, cooldown, mixed, degraded)

**Exit criteria:**
- No contradictory provider/assistant states visible
- `unknown` provider does not disable chat
- Cooldown shows countdown timer
- All surfaces use same truth source

---

### Phase 2: Information Architecture (P0 — 6-8 hours)
**Goal:** Restructure Vienna around operator workflows

**Deliverables:**
- `FRONTEND_INFORMATION_ARCHITECTURE.md`
- Navigation restructure to 6 top-level sections
- Now page as true landing surface
- Runtime page as operator control plane
- Workspace as functional artifact browser
- History as ledger/audit surface
- Services as infrastructure monitoring
- Settings as configuration

**Exit criteria:**
- Navigation makes sense to infrastructure operator
- Each section has clear purpose
- Operator can find what they need in <3 clicks
- No debug/prototype labels visible

---

### Phase 3: Workspace/Files Rebuild (P1 — 4-6 hours)
**Goal:** Make workspace genuinely useful

**Deliverables:**
- `WORKSPACE_REBUILD_PLAN.md`
- Audit current workspace state
- Identify backend requirements
- Rebuild workspace rail UI
- Implement file list/metadata
- Add open/select interactions
- Create useful empty states
- Remove all broken interactions

**Exit criteria:**
- Workspace shows real artifacts (or clean empty state)
- File list functional and scrollable
- Open/select works
- No dead clicks or fake buttons
- Graceful when no backend support

---

### Phase 4: Now Surface Rebuild (P1 — 5-7 hours)
**Goal:** True operator landing page

**Deliverables:**
- `NOW_SURFACE_REBUILD_PLAN.md`
- System posture summary (top card)
- Actionable summary cards (degraded objectives, cooldowns, etc.)
- Assistant panel with graceful degradation
- Suggested next actions
- Useful when assistant down

**Exit criteria:**
- Now page answers "What needs attention right now?"
- Assistant unavailable does not break page
- Clear next actions visible
- Runtime status always visible
- Page useful with or without chat

---

### Phase 5: Runtime Surface Polish (P1 — 4-6 hours)
**Goal:** Coherent control-plane experience

**Deliverables:**
- Polish reconciliation activity panel
- Polish execution leases panel
- Polish circuit breakers panel
- Polish execution pipeline view
- Polish reconciliation timeline
- Consistent empty states
- Narrative timeline (not raw logs)

**Exit criteria:**
- All panels feel intentional
- Empty states explain absence
- Timeline reads like a story
- Metrics clearly labeled
- Deadline countdowns visible

---

### Phase 6: Design System (P1 — 6-8 hours)
**Goal:** Cohesive visual language

**Deliverables:**
- `DESIGN_SYSTEM_SPEC.md`
- `VIENNA_FRONTEND_STYLE_GUIDE.md` (update)
- Typography hierarchy
- Spacing system (8px scale)
- Surface design (cards, borders, shadows)
- State color palette (semantic)
- Data density guidelines
- Motion principles

**Exit criteria:**
- Consistent type scale across app
- Consistent spacing rhythm
- Consistent state colors (healthy/degraded/cooldown/etc.)
- Professional, infrastructure-native feel
- No toy-like or consumer-chat aesthetics

---

### Phase 7: Error Handling (P1 — 3-4 hours)
**Goal:** Trustworthy, specific errors

**Deliverables:**
- `ERROR_HANDLING_UI_MATRIX.md`
- Distinguished error types (assistant vs provider vs runtime vs auth)
- Clear error messages (no generic "something went wrong")
- Graceful degradation states
- Recovery guidance where applicable

**Exit criteria:**
- Operator always knows what failed
- Operator knows if runtime still functional
- No error spam in chat
- Clear distinction between temporary and critical failures

---

### Phase 8: Functional Stabilization (P2 — 4-6 hours)
**Goal:** Eliminate broken interactions

**Deliverables:**
- `FRONTEND_COMPONENT_MAP.md`
- `BROKEN_INTERACTIONS_AUDIT.md`
- Fix undefined prop crashes
- Fix polling bugs
- Fix stale state issues
- Add missing loading states
- Fix route mismatches

**Exit criteria:**
- No console errors in normal operation
- All buttons functional or removed
- All loading states present
- No dead interactions

---

### Phase 9: Deployment & Validation (P0 — 2-3 hours)
**Goal:** Ship safely

**Deliverables:**
- `FRONTEND_RESTRUCTURE_COMPLETE.md`
- Clean TypeScript build
- Restart console server only
- Validate 5 core scenarios
- Document before/after state

**Scenarios:**
1. Providers healthy → assistant usable, no contradictions
2. Providers unhealthy → assistant disabled cleanly, runtime still useful
3. No reconciliation activity → runtime page intentional empty states
4. Workspace populated → list works, open works
5. Workspace empty → useful empty state

**Exit criteria:**
- All scenarios pass
- No runtime disruption
- Operator can trust UI state
- Vienna feels like operator product

---

## Timeline & Priority

### Critical Path (P0 — Must complete)
- Phase 1: State Truth Model (4-6h)
- Phase 2: Information Architecture (6-8h)
- Phase 9: Deployment & Validation (2-3h)

**Total P0:** 12-17 hours

### High Priority (P1 — Should complete)
- Phase 3: Workspace Rebuild (4-6h)
- Phase 4: Now Surface Rebuild (5-7h)
- Phase 5: Runtime Surface Polish (4-6h)
- Phase 6: Design System (6-8h)
- Phase 7: Error Handling (3-4h)

**Total P1:** 22-31 hours

### Medium Priority (P2 — Nice to have)
- Phase 8: Functional Stabilization (4-6h)

**Total P2:** 4-6 hours

**Grand Total:** 38-54 hours (full overhaul)

**Realistic execution:** 2-3 full work sessions

---

## Execution Strategy

### Session 1: State Truth & Architecture (10-14h)
- Phase 1: State Truth Model (complete)
- Phase 2: Information Architecture
- Begin Phase 3: Workspace audit

### Session 2: Surfaces & Design (10-14h)
- Complete Phase 3: Workspace
- Phase 4: Now Surface
- Phase 5: Runtime Surface
- Begin Phase 6: Design System

### Session 3: Polish & Deploy (8-12h)
- Complete Phase 6: Design System
- Phase 7: Error Handling
- Phase 8: Functional Stabilization
- Phase 9: Deployment & Validation

---

## Success Criteria

**The overhaul is successful when:**

1. ✅ Provider/dashboard contradictions eliminated
2. ✅ `unknown` provider state does not disable chat
3. ✅ Operator can trust all visible state
4. ✅ Navigation makes sense for infrastructure operator
5. ✅ Now page useful even when chat down
6. ✅ Workspace functional (or gracefully empty)
7. ✅ Runtime page reflects true architecture
8. ✅ Visual design feels professional and coherent
9. ✅ Error messages specific and trustworthy
10. ✅ No broken interactions visible

**Product standard achieved:**
```
Vienna feels like a serious control plane for governed infrastructure
```

---

## Risk Mitigation

### Risk: Backend changes required
**Mitigation:** All backend changes are read-only aggregations, no runtime behavior changes

### Risk: Timeline overrun
**Mitigation:** P0 work small enough to complete in single session, P1/P2 can follow incrementally

### Risk: TypeScript build issues
**Mitigation:** Document and isolate, do not block deployment on TypeScript perfection

### Risk: Observation window contamination
**Mitigation:** Console-layer only changes, protected runtime files untouched by policy

### Risk: User disruption
**Mitigation:** Deploy during low-activity window, console restart does not affect core runtime

---

## Deliverable Checklist

### Core Documents (Required)
- [x] `UI_OVERHAUL_MASTER_PLAN.md` (this document)
- [x] `STATE_TRUTH_MODEL.md` (complete)
- [ ] `FRONTEND_INFORMATION_ARCHITECTURE.md`
- [ ] `DESIGN_SYSTEM_SPEC.md`
- [ ] `WORKSPACE_REBUILD_PLAN.md`
- [ ] `NOW_SURFACE_REBUILD_PLAN.md`

### Supporting Documents (Optional)
- [ ] `ERROR_HANDLING_UI_MATRIX.md`
- [ ] `FRONTEND_COMPONENT_MAP.md`
- [ ] `WORKSPACE_FEATURE_MATRIX.md`
- [ ] `NOW_DASHBOARD_STATE_MATRIX.md`
- [ ] `BROKEN_INTERACTIONS_AUDIT.md`
- [ ] `BEFORE_AFTER_UI_NOTES.md`

### Completion Document
- [ ] `FRONTEND_RESTRUCTURE_COMPLETE.md`

---

## Current Status

**Phase 1: State Truth Model**
- ✅ STATE_TRUTH_MODEL.md complete (18KB, comprehensive audit)
- 🔄 Backend implementation pending
- 🔄 Frontend integration pending
- 🔄 Validation pending

**Next action:** Begin Phase 1 backend implementation

---

## Escalation Triggers

**Escalate to operator if:**
- Fixing state truth requires protected runtime changes
- Workspace depends on unavailable backend that requires significant new implementation
- Major architectural blocker prevents overhaul
- Deployment would disturb core runtime under observation

**Otherwise:** Proceed autonomously per directive

---

## References

**Directive:** Vienna Directive — Total UI Overhaul (2026-03-14 01:39 EDT)  
**State audit:** `STATE_TRUTH_MODEL.md`  
**Current codebase:** `console/client/` + `console/server/`  
**Protected runtime:** Phase 10.3 under observation (24h window)

---

**Status:** Master plan complete, Phase 1 implementation ready to begin  
**Estimated completion:** 2-3 full work sessions (38-54 hours total)  
**Next:** Execute Phase 1 backend changes + frontend integration
