# Phase 2D: Hardening Plan

**Date:** 2026-03-11  
**Status:** 🔨 PLANNING  
**Prerequisite:** Phase 2 Complete ✅  

---

## Overview

Phase 2 proved Vienna's governed execution pipeline. Phase 2D hardens that pipeline for production reliability.

**Core principle:** No new capabilities. Fix what Phase 2 proved.

---

## Scope

### What Phase 2D Fixes

1. **Failure Isolation** — folder operations don't cascade on single-file failures
2. **Dead Letter Visibility** — failed envelopes visible and actionable in UI
3. **Output Collision Handling** — deterministic naming prevents overwrites
4. **Runtime Observability** — clear progress, failure reasons, partial success

### What Phase 2D Does NOT Do

- LLM-backed summarization (deferred)
- Advanced graph visualization (deferred)
- Domain-specific workspaces (deferred)
- Parallel execution optimization (deferred)
- Production scale testing (deferred)

---

## Priority 1: Batch Execution Hardening

**Problem:** Folder summarization fails entirely if one file fails

**Current behavior:**
```
folder operation
  → file1 read fails
  → entire operation aborts
  → no output artifacts created
```

**Target behavior:**
```
folder operation
  → file1 read fails → log, continue
  → file2 succeeds → artifact created
  → file3 succeeds → artifact created
  → partial success reported
```

### Implementation

1. Wrap each file operation in try/catch
2. Collect successes + failures separately
3. Emit verification for successes
4. Emit dead letter for failures
5. Return structured result: `{ succeeded: [...], failed: [...] }`

### Success Criteria

- [ ] Folder operation with 1 failing file completes for other files
- [ ] Dead letter envelope created for failure
- [ ] Partial success reported accurately
- [ ] Output artifacts visible for succeeded files

---

## Priority 2: Output Collision Handling

**Problem:** Repeated summarize operations overwrite previous output

**Current behavior:**
```
summarize contract.md → writes contract-summary.md
summarize contract.md → overwrites contract-summary.md
```

**Target behavior:**
```
summarize contract.md → contract-summary-20260311-202245.md
summarize contract.md → contract-summary-20260311-202301.md
```

### Implementation

1. Add timestamp to output filename generator
2. Format: `{basename}-summary-{YYYYMMDD-HHMMSS}.md`
3. Update ActionAdapter.summarize_file to use timestamped names
4. Update verification to check for timestamped file

### Success Criteria

- [ ] Repeated summarize operations create unique files
- [ ] No overwrites occur
- [ ] Filenames deterministic and sortable
- [ ] File tree shows all outputs

---

## Priority 3: Dead Letter Visibility

**Problem:** Failed envelopes disappear into logs, no UI visibility

**Current behavior:**
```
envelope execution fails
  → logged to console
  → operator has no visibility
  → no retry mechanism
```

**Target behavior:**
```
envelope execution fails
  → dead letter envelope created
  → visible in visualizer with ❌ status
  → failure reason displayed
  → retry/cancel actions available
```

### Implementation

1. Create `EnvelopeStatus` enum: pending, executing, completed, failed
2. Add status field to envelope schema
3. Update visualizer to show status icons
4. Add failure_reason field for dead letters
5. UI: click failed envelope → show reason + retry button

### Success Criteria

- [ ] Failed envelopes visible in visualizer
- [ ] Failure reasons displayed clearly
- [ ] Can distinguish failed from succeeded envelopes
- [ ] Retry button present (implementation Phase 3)

---

## Priority 4: Runtime Observability

**Problem:** No clear indication of what's executing or why it's taking time

**Current behavior:**
```
submit command
  → "Objective queued"
  → silence
  → eventually artifacts appear (or don't)
```

**Target behavior:**
```
submit command
  → "Planning..." (planner active)
  → "Queued 4 envelopes" (ready to execute)
  → "Executing 1/4..." (read step)
  → "Executing 2/4..." (summarize step)
  → "Completed 4/4" (verification done)
  → "Created: contract-summary-20260311.md"
```

### Implementation

1. Add progress field to objective: `{ total: 4, completed: 1 }`
2. Emit progress events during execution
3. UI: subscribe to progress via WebSocket or polling
4. Display progress bar or step counter
5. Link to output artifacts in completion message

### Success Criteria

- [ ] Operator sees planning phase clearly
- [ ] Progress indicator shows envelope execution
- [ ] Completion message includes output paths
- [ ] Can click paths to navigate directly

---

## Priority 5: Better Result Messages

**Problem:** Generic "4 envelopes queued" tells operator nothing useful

**Current behavior:**
```
{
  "objective_id": "obj_xyz",
  "envelopes_queued": 4
}
```

**Target behavior:**
```
{
  "objective_id": "obj_xyz",
  "command": "summarize_file",
  "attachments": ["contract.md"],
  "plan_summary": "Read → Summarize → Write → Verify",
  "expected_output": "contract-summary-20260311-202245.md",
  "status": "queued"
}
```

### Implementation

1. Extend command response schema
2. Include human-readable plan summary
3. Include expected output path
4. Update UI to display structured result
5. Add quick-jump link to expected output location

### Success Criteria

- [ ] Operator knows what will happen before it happens
- [ ] Expected output path displayed upfront
- [ ] Can navigate to output location immediately
- [ ] Clear success/failure indication

---

## Non-Goals (Explicit Deferrals)

### LLM-Backed Summarization

**Status:** Deferred to future phase  
**Reason:** Phase 2 validates pipeline, not AI quality  
**Requirement:** Real summarization requires model integration, prompt engineering, cost controls

### Advanced Visualizer Features

**Status:** Deferred to Phase 3+  
**Features:** Graph layout, collapsible trees, search, filtering  
**Reason:** Basic lineage visibility sufficient for Phase 2D

### Domain-Specific Workspaces

**Status:** Deferred to Phase 4+  
**Examples:** Legal workspace, Markets workspace, Code workspace  
**Reason:** Prove general execution model first

### Parallel Execution

**Status:** Deferred to Phase 3+  
**Reason:** Sequential execution proven, parallelism adds complexity without validating governance

---

## Implementation Order

### Week 1: Failure Isolation
- [ ] Implement try/catch wrappers in ActionAdapter
- [ ] Add dead letter envelope creation
- [ ] Test folder operation with failing file
- [ ] Verify partial success reporting

### Week 2: Output Collision + Observability
- [ ] Add timestamp to output filenames
- [ ] Implement progress tracking in executor
- [ ] Wire up progress events to UI
- [ ] Test repeated operations

### Week 3: Dead Letter Visibility
- [ ] Add status field to envelope schema
- [ ] Update visualizer to show status icons
- [ ] Display failure reasons
- [ ] Add retry button (no-op for now)

### Week 4: Result Messages + Polish
- [ ] Extend command response schema
- [ ] Update UI result display
- [ ] Add quick-jump links
- [ ] Add dependency validation script
- [ ] Integration testing

---

## Success Criteria

Phase 2D is complete when:

1. ✅ Folder operations isolate failures per-file
2. ✅ Failed envelopes visible in UI with reasons
3. ✅ Repeated operations create unique outputs
4. ✅ Operator sees clear progress indicators
5. ✅ Result messages include output paths and status
6. ✅ No regressions in Phase 2 functionality

---

## Validation Plan

### Automated Tests
- Unit tests for failure isolation
- Unit tests for collision-free naming
- Integration tests for partial success

### Manual Tests
- Run folder summarize with intentional file failure
- Repeat same summarize operation 3 times
- Observe visualizer during execution
- Verify dead letters displayed correctly

### Acceptance
- All Phase 2 validation tests still pass
- All Phase 2D hardening tests pass
- No observable regressions
- Documentation updated

---

## Lessons from Phase 2

### Router Dependency Issue (2026-03-11)

**Problem:** `react-router-dom` import added but dependency not installed  
**Impact:** Vite dev server failed to resolve import  
**Resolution:** `npm install react-router-dom`  

**Lesson learned:** Need automated dependency validation before commit

**Hardening action:** Add `npm run check-deps` script to verify all imports have corresponding dependencies

---

## Risk Assessment

**Low Risk:**
- Timestamped filenames (backwards compatible)
- Progress tracking (additive)
- Better result messages (cosmetic)
- Dependency validation script (no runtime impact)

**Medium Risk:**
- Failure isolation (execution model change)
- Dead letter visibility (schema change)

**Mitigation:**
- Feature flags for new behaviors
- Rollback plan: remove try/catch wrappers
- Keep Phase 2 validation suite green
- Automated dependency checks prevent import errors

---

## Timeline

**Estimated duration:** 3-4 weeks  
**Dependencies:** None (builds on Phase 2 only)  
**Blockers:** None identified  

**Milestone targets:**
- Week 1 end: Failure isolation working
- Week 2 end: Output collision solved, progress visible
- Week 3 end: Dead letters visible in UI
- Week 4 end: Full Phase 2D validation passed

---

## Next Steps

1. Begin Week 1: Failure Isolation implementation
2. Create feature branch: `phase-2d-hardening`
3. Set up test cases for partial success scenarios
4. Daily commits with test coverage
5. Weekly validation checkpoint

---

**Phase 2D Status:** 🔨 READY TO BEGIN  
**Prerequisite:** Phase 2 Complete ✅  
**Expected Completion:** 2026-04-08  

---

**Phase 2D hardens what Phase 2 proved. No scope creep. Fix the foundation.**
