# Vienna Operator UI Specification
**Phase 10.5 — Operator Control Plane Dashboard**

**Status:** Specification  
**Target:** Vienna Console (UI layer only, read-only)  
**Goal:** Transform dashboard from generic infrastructure view to operator control plane reflecting governed reconciliation architecture  

---

## Design Principles

**Vienna is:**
- A governed reconciliation runtime
- An execution control plane
- A state machine enforcement system

**Vienna is NOT:**
- Generic infrastructure monitoring
- A service health dashboard
- A log aggregator

**Operator should immediately see:**
1. What Vienna is reconciling
2. What Vienna is executing
3. What Vienna is waiting on (cooldown/degraded)
4. What Vienna has bounded or degraded

---

## Dashboard Layout

### Top Bar (Always Visible)
```
┌─────────────────────────────────────────────────────────────┐
│ Vienna OS                    Observation Window: ACTIVE      │
│ Mode: NORMAL                 Phase: 10.3 (Execution Bounds)  │
│ Safe Mode: OFF               Queue: 0 pending                │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- Runtime mode: `systemStatus.runtime_mode` (from `/api/v1/status`)
- Safe mode: Phase 10.4 (placeholder: "Not Available")
- Observation window: Phase 10.3 deployment timestamp + 24h
- Queue depth: `systemStatus.queue_depth`

---

### Row 1: Control Plane Status (3 panels)

#### Panel 1.1: Runtime Control State
```
┌─────────────────────────────┐
│ Runtime Control State       │
├─────────────────────────────┤
│ Runtime Mode     NORMAL     │
│ Reconciliation   ACTIVE     │
│ Executor        RUNNING     │
│ Watchdog        ACTIVE      │
│ Verification    ONLINE      │
│ Ledger          RECORDING   │
│ Policy Engine   ACTIVE      │
└─────────────────────────────┘
```

**Data Sources:**
- Runtime Mode: `systemStatus.runtime_mode`
- Reconciliation: Check if `evaluation-service.js` running
- Executor: `systemStatus.executor_state`
- Watchdog: Check if `execution-watchdog.js` running
- Verification: Always "ONLINE" (no dedicated health check yet)
- Ledger: Check if `execution_ledger_events` table accessible
- Policy Engine: Always "ACTIVE" (no dedicated health check yet)

**Color Semantics:**
- NORMAL/ACTIVE/RUNNING/ONLINE/RECORDING: Green
- DEGRADED/PAUSED: Yellow
- OFFLINE/FAILED/STOPPED: Red
- NOT AVAILABLE: Gray

#### Panel 1.2: Execution Control
```
┌─────────────────────────────┐
│ Execution Control           │
├─────────────────────────────┤
│ Executor        RUNNING     │
│ Paused               NO     │
│ Trading Guard    ACTIVE     │
│ Kill Switch         OFF     │
└─────────────────────────────┘
```

**Data Sources:**
- Executor: `systemStatus.executor_state`
- Paused: `systemStatus.paused`
- Trading Guard: `systemStatus.trading_guard_state`
- Kill Switch: `systemStatus.kill_switch` (Phase 7.4)

#### Panel 1.3: Infrastructure Services
```
┌─────────────────────────────┐
│ Infrastructure Services     │
├─────────────────────────────┤
│ openclaw-gateway  healthy   │
│ vienna-console    healthy   │
│ anthropic        healthy    │
│ ollama           healthy    │
└─────────────────────────────┘
```

**Data Sources:**
- Services: `/api/v1/services` (existing)
- Providers: `/api/v1/providers` (existing)

**Display Rules:**
- Show max 6 services (critical infrastructure only)
- Status: healthy (green), degraded (yellow), failed (red)

---

### Row 2: Reconciliation Activity (Primary)

#### Panel 2.1: Reconciliation Activity (Full Width)
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Reconciliation Activity                                        [All] [Active]   │
├────────────┬──────────────┬───────┬──────────┬──────────────┬─────────────────┤
│ Objective  │ State        │ Gen   │ Attempts │ Cooldown     │ Last Transition │
├────────────┼──────────────┼───────┼──────────┼──────────────┼─────────────────┤
│ gateway-   │ reconciling  │  12   │   2/3    │      -       │ 2m ago          │
│ health     │              │       │          │              │                 │
├────────────┼──────────────┼───────┼──────────┼──────────────┼─────────────────┤
│ db-health  │ idle         │   8   │   0/3    │      -       │ 5m ago          │
├────────────┼──────────────┼───────┼──────────┼──────────────┼─────────────────┤
│ api-health │ cooldown     │   9   │   2/3    │ 210s         │ 1m ago          │
├────────────┼──────────────┼───────┼──────────┼──────────────┼─────────────────┤
│ auth-      │ degraded     │  11   │   3/3    │ DEGRADED     │ 8m ago          │
│ service    │              │       │          │              │                 │
└────────────┴──────────────┴───────┴──────────┴──────────────┴─────────────────┘
```

**Data Sources:**
- `/api/v1/managed-objectives` (existing)
- Fields:
  - `objective_id` (truncate for display)
  - `reconciliation_status` (idle/reconciling/cooldown/degraded/safe_mode)
  - `reconciliation_generation` (show as integer)
  - `consecutive_failures` + policy limit (show as X/Y)
  - `cooldown_until` (if cooldown, show countdown timer)
  - `last_transition_at` (relative time)

**State Color Semantics:**
- idle: Gray
- reconciling: Blue
- cooldown: Yellow
- degraded: Red/Orange
- safe_mode: Purple (Phase 10.4)

**Filter Options:**
- All (default)
- Active (reconciling only)
- Issues (cooldown + degraded)
- Idle

**Empty State:**
```
No objectives defined yet.
Vienna will reconcile objectives once they are declared.
```

---

### Row 3: Execution Visibility (2 panels)

#### Panel 3.1: Execution Leases
```
┌───────────────────────────────────────────────────────┐
│ Execution Leases                        [Active Only] │
├────────────┬─────────┬──────┬──────────┬──────────────┤
│ Objective  │ Attempt │ Gen  │ Deadline │ Remaining    │
├────────────┼─────────┼──────┼──────────┼──────────────┤
│ gateway-   │ exec-41 │  12  │ 21:15:30 │  28s  ●●●●●  │
│ health     │         │      │          │              │
├────────────┼─────────┼──────┼──────────┼──────────────┤
│ db-restart │ exec-42 │   8  │ 21:16:45 │  91s  ●●●●●● │
└────────────┴─────────┴──────┴──────────┴──────────────┘
```

**Data Sources:**
- Query State Graph for active execution attempts
- Fields from `managed_objective_history` where `transition_type = 'remediation_started'` and no matching `remediation_completed`
- Execution deadline calculation: `started_at` + execution timeout (default 120s, Phase 10.3)

**Visual Semantics:**
- >60s remaining: Green bars (●●●●●●)
- 30-60s: Yellow bars (●●●●●)
- <30s: Orange bars (●●●)
- Expired: Red "EXPIRED" text

**Refresh Rate:** 1 second (live countdown)

**Empty State:**
```
No active executions.
```

**Notes:**
- Execution lease data derived from Phase 10.3 execution-watchdog.js
- Deadline tracking may require new query method or cached watchdog state

#### Panel 3.2: Circuit Breakers
```
┌───────────────────────────────────────────────────┐
│ Circuit Breakers                                  │
├────────────┬──────────┬───────────┬───────────────┤
│ Objective  │ Failures │ Limit     │ State         │
├────────────┼──────────┼───────────┼───────────────┤
│ gateway-   │   2/3    │ Policy    │ 210s cooldown │
│ health     │          │           │               │
├────────────┼──────────┼───────────┼───────────────┤
│ auth-      │   3/3    │ Policy    │ DEGRADED      │
│ service    │          │           │               │
└────────────┴──────────┴───────────┴───────────────┘
```

**Data Sources:**
- `/api/v1/managed-objectives` filtered by `consecutive_failures > 0`
- Fields:
  - `consecutive_failures`
  - Policy limit from Phase 10.2 (default: 3 attempts)
  - `reconciliation_status` (cooldown/degraded)
  - `cooldown_until` (if cooldown)

**State Semantics:**
- Active (X/3): Yellow
- Degraded (3/3): Red
- Cooldown timer: Live countdown

**Empty State:**
```
No circuit breakers engaged.
All objectives healthy or idle.
```

---

### Row 4: Execution Pipeline

```
┌────────────────────────────────────────────────────────────────────┐
│ Execution Pipeline                                                 │
├──────────┬──────┬────────┬─────────┬───────────┬──────────────────┤
│ Intent   │ Plan │ Policy │ Warrant │ Execution │ Verification     │
├──────────┼──────┼────────┼─────────┼───────────┼──────────────────┤
│     2    │   2  │    2   │    1    │     0     │        0         │
└──────────┴──────┴────────┴─────────┴───────────┴──────────────────┘
```

**Data Sources:**
- Intent: Count from chat-action-bridge (pending interpretation)
- Plan: `/api/v1/executions?status=pending` count
- Policy: Count of policy evaluations in flight (Phase 8.4)
- Warrant: Count of issued warrants not yet executed
- Execution: `systemStatus.active_envelopes`
- Verification: Count from verifications table where status = 'running'

**Purpose:**
- Visualize Vienna's architecture
- Show where work is currently staged

**Note:** If exact counts unavailable, show status indicators instead:
```
Intent: ACTIVE | Plan: ACTIVE | Policy: ACTIVE | etc.
```

---

### Row 5: Reconciliation Timeline (Full Width)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Reconciliation Timeline                                   [Last 100 events] │
├──────────┬─────────────┬─────┬──────────────────────────────────────────────┤
│ Time     │ Objective   │ Gen │ Event                                        │
├──────────┼─────────────┼─────┼──────────────────────────────────────────────┤
│ 21:10:15 │ gateway-    │  12 │ drift detected                               │
│          │ health      │     │                                              │
├──────────┼─────────────┼─────┼──────────────────────────────────────────────┤
│ 21:10:16 │ gateway-    │  12 │ reconciliation admitted                      │
│          │ health      │     │                                              │
├──────────┼─────────────┼─────┼──────────────────────────────────────────────┤
│ 21:10:17 │ gateway-    │  12 │ execution started (exec-41)                  │
│          │ health      │     │                                              │
├──────────┼─────────────┼─────┼──────────────────────────────────────────────┤
│ 21:11:28 │ gateway-    │  12 │ execution timeout                            │
│          │ health      │     │                                              │
├──────────┼─────────────┼─────┼──────────────────────────────────────────────┤
│ 21:11:29 │ gateway-    │  12 │ cooldown entered (300s)                      │
│          │ health      │     │                                              │
└──────────┴─────────────┴─────┴──────────────────────────────────────────────┘
```

**Data Sources:**
- Primary: `managed_objective_history` table
- Columns: `event_timestamp`, `objective_id`, `generation`, `transition_type`, `metadata`
- Order: `event_timestamp DESC`
- Limit: 100 events (configurable)

**Event Types to Display:**
- drift detected (VIOLATION_DETECTED)
- reconciliation admitted (reconciliation_requested)
- reconciliation skipped (reconciliation_skipped)
- execution started (remediation_started)
- execution completed (remediation_completed)
- execution timeout (execution_timed_out - Phase 10.3)
- cooldown entered (cooldown_entered)
- degraded (degraded)
- recovered (recovered)
- manual reset (manual_reset)
- safe mode entered/released (Phase 10.4)

**Color Coding:**
- Info (drift detected, admitted): Blue
- Running (execution started): Green
- Warning (cooldown, skipped): Yellow
- Error (timeout, degraded, failed): Red
- Success (recovered, completed): Green

**Empty State:**
```
No recent reconciliation events.
Timeline will populate when objectives are evaluated.
```

---

### Row 6: Vienna Operator Chat (Full Width)

**Keep existing chat panel.** No changes required.

---

## Metrics Panel (Optional, Phase 10.3 Observation Focus)

```
┌─────────────────────────────────────────────────────────────┐
│ Observation Metrics (Phase 10.3)                            │
├─────────────────────────────────────────────────────────────┤
│ Timeouts/hour:              2                               │
│ Cooldown entries/hour:      5                               │
│ Degraded transitions/hour:  0                               │
│ Reconciliations/hour:      12                               │
│ Avg execution duration:   45s                               │
│ Max execution duration:  118s                               │
│ Expired deadlines:          2                               │
│ Stale completions ignored:  0                               │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- Query `managed_objective_history` for events in last hour
- Count by `transition_type`
- Calculate durations from `started_at` / `completed_at` pairs

**Purpose:**
- Phase 10.3 observation window monitoring
- Validate watchdog behavior
- Detect anomalies

**Placement:** Below chat panel or in sidebar (optional)

---

## Required Backend Endpoints

### New Endpoints (Read-Only)

**1. GET `/api/v1/reconciliation/leases`**
```json
{
  "success": true,
  "data": {
    "active_leases": [
      {
        "objective_id": "gateway-health",
        "attempt_id": "exec-41",
        "generation": 12,
        "started_at": "2026-03-13T21:14:30Z",
        "deadline_at": "2026-03-13T21:16:30Z",
        "seconds_remaining": 28
      }
    ]
  }
}
```

**Implementation:**
- Query `managed_objective_history` for recent `remediation_started` without matching `remediation_completed`
- Calculate deadline from `started_at` + timeout (default 120s)
- Compute `seconds_remaining` server-side

**2. GET `/api/v1/reconciliation/timeline`**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "timestamp": "2026-03-13T21:10:15Z",
        "objective_id": "gateway-health",
        "generation": 12,
        "event_type": "drift_detected",
        "summary": "Service health check failed"
      }
    ],
    "total": 100
  }
}
```

**Implementation:**
- Query `managed_objective_history` ordered by `event_timestamp DESC`
- Map `transition_type` to human-readable event names
- Return last N events (default 100)

**3. GET `/api/v1/reconciliation/breakers`**
```json
{
  "success": true,
  "data": {
    "breakers": [
      {
        "objective_id": "gateway-health",
        "consecutive_failures": 2,
        "policy_limit": 3,
        "reconciliation_status": "cooldown",
        "cooldown_until": "2026-03-13T21:15:30Z",
        "cooldown_remaining_seconds": 210
      }
    ]
  }
}
```

**Implementation:**
- Query `managed_objectives` where `consecutive_failures > 0`
- Include policy limit (default: 3)
- Compute `cooldown_remaining_seconds` from `cooldown_until`

**4. GET `/api/v1/reconciliation/metrics`**
```json
{
  "success": true,
  "data": {
    "timeouts_per_hour": 2,
    "cooldown_entries_per_hour": 5,
    "degraded_transitions_per_hour": 0,
    "reconciliations_per_hour": 12,
    "avg_execution_duration_ms": 45000,
    "max_execution_duration_ms": 118000,
    "expired_deadlines": 2,
    "stale_completions_ignored": 0
  }
}
```

**Implementation:**
- Query `managed_objective_history` for last hour
- Aggregate by `transition_type`
- Calculate durations from event pairs

### Existing Endpoints (Use As-Is)

- `/api/v1/managed-objectives` — Objectives list
- `/api/v1/status` — System status
- `/api/v1/services` — Service health
- `/api/v1/providers` — Provider health

---

## Refresh Behavior

**Active Panels (Live Updates):**
- Execution Leases: 1 second (countdown timer)
- Cooldown timers: 1 second
- Reconciliation Activity: 5 seconds
- Timeline: 10 seconds

**Status Panels (Moderate Refresh):**
- Runtime Control State: 10 seconds
- Execution Control: 10 seconds
- Infrastructure Services: 30 seconds

**Metrics Panel:**
- 60 seconds (low priority)

**Implementation:**
- Use polling (not WebSocket, keep it simple)
- Stagger refresh timers to avoid request bursts
- Cancel pending requests on unmount

---

## Empty State Behavior

**If no objectives exist:**
```
┌────────────────────────────────────────────┐
│ No objectives defined yet.                 │
│ Vienna will reconcile objectives once      │
│ they are declared via State Graph.         │
└────────────────────────────────────────────┘
```

**If all objectives idle:**
```
┌────────────────────────────────────────────┐
│ All objectives idle.                       │
│ Vienna is monitoring and will reconcile   │
│ when drift is detected.                    │
└────────────────────────────────────────────┘
```

**If no active executions:**
```
No active executions.
```

**If no circuit breakers:**
```
No circuit breakers engaged.
All objectives healthy or idle.
```

---

## Degraded State Display

**If reconciliation gate is offline:**
- Show "Reconciliation: OFFLINE" in red
- Display banner: "Reconciliation gate unavailable. Autonomous remediation paused."

**If executor is paused:**
- Show "Executor: PAUSED" in yellow
- Display pause reason in Execution Control panel

**If chat is unavailable:**
- Keep existing graceful degradation (503 with message)

---

## Safe Mode Placeholder (Phase 10.4)

**Until Safe Mode is implemented:**

**Top Bar:**
```
Safe Mode: NOT AVAILABLE (Phase 10.4 pending)
```

**Governance Controls Section (Placeholder):**
```
┌─────────────────────────────────────────┐
│ Governance Controls                     │
├─────────────────────────────────────────┤
│ Safe Mode controls available after      │
│ Phase 10.4 deployment.                  │
│                                         │
│ [ ENTER SAFE MODE ]  (disabled)        │
│ [ RELEASE HOLD ]     (disabled)        │
└─────────────────────────────────────────┘
```

**Color:** Gray (neutral)

**After Phase 10.4:**
- Enable buttons
- Add confirmation modals
- Show active safe mode status prominently

---

## Visual Design Standards

### Color Palette

**Status Colors:**
- Healthy/Running/Active: `#10b981` (green-500)
- Warning/Cooldown: `#f59e0b` (amber-500)
- Degraded/Error: `#ef4444` (red-500)
- Neutral/Idle: `#6b7280` (gray-500)
- Info/Reconciling: `#3b82f6` (blue-500)
- Safe Mode (future): `#8b5cf6` (purple-500)

**Background:**
- Panel background: `#1f2937` (gray-800)
- Panel border: `#374151` (gray-700)
- Card background: `#111827` (gray-900)

**Text:**
- Primary: `#f3f4f6` (gray-100)
- Secondary: `#9ca3af` (gray-400)
- Muted: `#6b7280` (gray-500)

### Typography

- Panel titles: 14px, font-medium
- Data labels: 12px, font-normal
- Data values: 13px, font-mono (for metrics)
- Event text: 12px, font-normal

### Spacing

- Panel padding: 16px
- Row spacing: 24px
- Panel gap: 24px
- Table row height: 40px

---

## Implementation Phases

### Phase 1: Backend APIs (2-3 hours)
- Implement 4 new read-only endpoints
- Test with existing State Graph data
- Validate query performance

### Phase 2: Core Layout Restructure (3-4 hours)
- Replace top 3 cards with Runtime Control State + Execution Control + Infrastructure
- Move services to secondary position
- Add observation window banner

### Phase 3: Reconciliation Activity Panel (2-3 hours)
- Build objectives table component
- Add filters (All/Active/Issues/Idle)
- Implement generation display
- Add cooldown countdown timer
- Color code by state

### Phase 4: Execution Visibility (3-4 hours)
- Build Execution Leases panel with live countdown
- Build Circuit Breakers panel
- Implement 1-second refresh for timers

### Phase 5: Timeline & Pipeline (2-3 hours)
- Build Reconciliation Timeline panel
- Build Execution Pipeline status bar
- Map event types to human-readable text

### Phase 6: Metrics Panel (1-2 hours - Optional)
- Build observation metrics panel
- Add hourly aggregations
- Position below chat or in sidebar

### Total: 13-19 hours (8-12 hours if metrics deferred)

---

## Testing Checklist

**Data Population:**
- [ ] Create test objective in State Graph
- [ ] Trigger reconciliation to generate events
- [ ] Verify timeline populates
- [ ] Verify leases appear during execution
- [ ] Verify breakers appear after failures
- [ ] Verify cooldown countdown works

**Empty States:**
- [ ] No objectives: Shows placeholder
- [ ] No active executions: Shows placeholder
- [ ] No breakers: Shows placeholder
- [ ] No timeline events: Shows placeholder

**Refresh Behavior:**
- [ ] Leases countdown updates every second
- [ ] Cooldown timer decrements correctly
- [ ] Timeline shows new events within 10s
- [ ] Stale data doesn't persist after refresh

**Error Handling:**
- [ ] API failure shows error state, not crash
- [ ] Degraded services show warning
- [ ] Missing data shows placeholder, not undefined

**Performance:**
- [ ] Polling doesn't cause request storms
- [ ] Page remains responsive during refresh
- [ ] No memory leaks from timers

---

## Deployment Strategy

**Build:**
```bash
cd console/client
npm run build
```

**Deploy:**
```bash
# Copy built assets to server
cp -r dist/* ../server/public/

# Restart console backend only (no core runtime)
pm2 restart vienna-console
```

**Validation:**
- Load dashboard at http://100.120.116.10:5174
- Verify all panels render
- Check browser console for errors
- Confirm API endpoints return data

**Rollback:**
```bash
# Restore previous build
git checkout HEAD~1 -- console/client/dist/
pm2 restart vienna-console
```

---

## Success Criteria

**This UI restructure is complete when:**

1. ✅ Dashboard reflects Vienna's actual architecture (reconciliation-first)
2. ✅ Reconciliation activity is visible (objectives + states + generation)
3. ✅ Execution leases are visible (with live countdown)
4. ✅ Circuit breaker state is visible (failures + cooldown timers)
5. ✅ Event timeline tells the reconciliation story
6. ✅ UI deployed without disturbing observed runtime
7. ✅ Operators have better visibility for remaining observation window

**The operator should be able to answer:**
- What objectives exist? → Reconciliation Activity panel
- What is Vienna reconciling right now? → Leases panel
- What has failed? → Circuit Breakers panel
- What happened recently? → Timeline panel
- Is Vienna working correctly? → Runtime Control State panel

---

## Deferred to Phase 10.4+

**Governance Controls:**
- ENTER SAFE MODE button
- RELEASE HOLD button
- RESET OBJECTIVE action
- Manual override controls

**Advanced Features:**
- Objective detail drill-down
- Execution replay/timeline inspection
- Policy rule editor
- Generation graph visualization

**Reason:** Safe Mode (Phase 10.4) must be implemented before governance controls can be surfaced in UI.

---

## Files to Modify (Console Layer Only)

**Backend (Server):**
- `console/server/src/routes/reconciliation.ts` (NEW)
- `console/server/src/services/reconciliationService.ts` (NEW)
- `console/server/src/server.ts` (register new router)

**Frontend (Client):**
- `console/client/src/pages/Dashboard.tsx` (restructure layout)
- `console/client/src/components/reconciliation/ReconciliationActivityPanel.tsx` (NEW)
- `console/client/src/components/reconciliation/ExecutionLeasesPanel.tsx` (NEW)
- `console/client/src/components/reconciliation/CircuitBreakersPanel.tsx` (NEW)
- `console/client/src/components/reconciliation/ReconciliationTimeline.tsx` (NEW)
- `console/client/src/components/reconciliation/ExecutionPipelineStatus.tsx` (NEW)
- `console/client/src/components/runtime/RuntimeControlPanel.tsx` (NEW - refactor from StatusCard)
- `console/client/src/api/reconciliation.ts` (NEW - API client)

**Files NOT Modified (Protected):**
- `vienna-core/lib/core/reconciliation-gate.js`
- `vienna-core/lib/core/remediation-trigger-integrated.js`
- `vienna-core/lib/core/execution-watchdog.js`
- `vienna-core/lib/core/objective-evaluator-integrated.js`
- `vienna-core/lib/core/objective-coordinator-integrated.js`
- All state machine / governance / executor files

---

## Notes

**Architecture Alignment:**
- This spec reflects **actual Vienna architecture** from Phase 9-10
- Data sources are **real State Graph tables** deployed in production
- No speculative features that don't exist yet

**Observation Window Safety:**
- All changes confined to console layer
- No core runtime modifications
- Read-only endpoints only
- Can rollback UI without affecting runtime

**Extensibility:**
- Panel structure allows easy addition of Phase 10.4 controls
- Timeline is extensible for new event types
- Metrics panel optional for observation focus

---

**End of Specification**
