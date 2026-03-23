# Vienna OS Backend/Visibility Gap Analysis

**Date:** 2026-03-14 00:05 EDT  
**Context:** Phase 10.5 visibility layer deployed, Now view operational  
**Purpose:** Identify gaps between backend capabilities and operator visibility

---

## Executive Summary

Vienna OS has a rich backend with 28 API route files and comprehensive governance infrastructure, but the current dashboard exposes only a fraction of these capabilities. This document identifies:

1. **Backend capabilities with no UI** — APIs that exist but have no operator-facing visualization
2. **Partial visibility** — APIs visible but with incomplete or hard-to-use UI
3. **Design improvements** — UX upgrades to improve operator effectiveness
4. **Chat interface cleanup** — Specific fixes for the chat panel

---

## Part 1: Backend Capabilities with No UI

### Critical Governance APIs (No Visibility)

**Execution Ledger** (`/api/v1/execution/*`)
- **Backend:** Complete forensic execution record with 15 event types
- **UI:** None (no ledger browser, no event timeline, no forensic query)
- **Impact:** Operators cannot investigate past executions, debug failures, or audit lifecycle events
- **Priority:** HIGH

**Policy Engine** (`/api/v1/policies/*`, `/api/v1/policy-decisions/*`)
- **Backend:** 10 constraint types, policy evaluation, decision persistence
- **UI:** None (no policy viewer, no constraint editor, no decision log)
- **Impact:** Operators cannot see what policies blocked execution, review decisions, or understand constraint logic
- **Priority:** HIGH

**Plans** (`/api/v1/plans/*`)
- **Backend:** Multi-step workflow plans with verification specs
- **UI:** None (no plan viewer, no step status, no workflow progress)
- **Impact:** Operators cannot see planned workflows before execution or track multi-step progress
- **Priority:** MEDIUM

**Verification Layer** (`/api/v1/verifications/*`, `/api/v1/workflow-outcomes/*`)
- **Backend:** Post-execution validation, verification results, workflow outcomes
- **UI:** None (no verification viewer, no outcome browser)
- **Impact:** Operators cannot see whether actions actually achieved their goals
- **Priority:** MEDIUM

**Warrants** (backend only)
- **Backend:** T1/T2 authorization, warrant issuance, warrant binding
- **UI:** None (no warrant viewer, no authorization log)
- **Impact:** Operators cannot audit authorization decisions
- **Priority:** LOW (audit-focused, less urgent for observation)

### Operational Data (Partial/No Visibility)

**Managed Objectives** (`/api/v1/managed-objectives/*`)
- **Backend:** Full objective lifecycle, evaluation history, transitions
- **UI:** Partial (listed in dashboard, but no detail view, no evaluation history, no timeline)
- **Impact:** Operators see objectives exist but cannot drill into health, history, or remediation status
- **Priority:** MEDIUM

**Dead Letter Queue** (`/api/v1/deadletters/*`)
- **Backend:** Failed execution archive, failure reasons, retry capability
- **UI:** None (no DLQ browser, no failure inspector)
- **Impact:** Operators cannot investigate permanent failures or trigger retries
- **Priority:** LOW (maintenance-focused)

**Replay Log** (`/api/v1/replay/*`)
- **Backend:** Historical execution replay capability
- **UI:** None (no replay browser)
- **Impact:** Operators cannot review past execution sequences
- **Priority:** LOW (debugging-focused)

**Audit Log** (`/api/v1/audit/*`)
- **Backend:** Complete audit trail of governance events
- **UI:** None (no audit browser)
- **Impact:** Operators cannot audit governance actions
- **Priority:** LOW (compliance-focused)

**Agents** (`/api/v1/agents/*`)
- **Backend:** Agent registry, agent status, agent metadata
- **UI:** None (no agent browser, no agent health)
- **Impact:** Operators cannot see which agents are active or their capabilities
- **Priority:** LOW (architectural visibility)

**Models** (`/api/v1/models/*`)
- **Backend:** Model registry, model selection logic, model constraints
- **UI:** None (no model browser, no selection transparency)
- **Impact:** Operators cannot see which models power which operations
- **Priority:** LOW (transparency-focused)

**Workflows** (`/api/v1/workflows/*`)
- **Backend:** Pre-defined workflow templates
- **UI:** None (no workflow browser, no template catalog)
- **Impact:** Operators cannot see available workflows
- **Priority:** LOW (discovery-focused)

**Commands** (`/api/v1/commands/*`)
- **Backend:** Command history, command status
- **UI:** Partial (chat shows recent, but no full history browser)
- **Impact:** Operators cannot review command history comprehensively
- **Priority:** LOW

---

## Part 2: Partial Visibility (Exists but Incomplete)

### Chat Interface

**Current State:**
- Shows message history
- Displays approval cards for T1 actions
- Shows error states (e.g., "all LLM providers in cooldown")

**Missing:**
- **Thread management:** No way to create new thread, switch threads, or see thread list
- **Message metadata:** No timestamps visible, no classification badges (command/informational/approval)
- **Failure recovery:** Provider cooldown errors should show ETA, not just "unavailable"
- **Action feedback:** No visual indication that action executed successfully vs failed
- **Approval history:** No log of past approvals/denials
- **Input affordances:** No autocomplete, no command palette, no examples

**Priority:** HIGH (primary operator interface)

### Services Panel

**Current State:**
- Lists services with status (active/inactive)
- Shows health (healthy/unhealthy/warning)

**Missing:**
- **Dependency graph:** No visualization of service dependencies
- **Restart actions:** No button to restart service from UI
- **Health history:** No timeline of status changes
- **Resource metrics:** No CPU/memory/uptime stats
- **Log viewer:** No inline log viewer

**Priority:** MEDIUM

### Providers Panel

**Current State:**
- Lists providers with status (active/degraded/unavailable)

**Missing:**
- **Failure rate graphs:** No visual trend of provider health
- **Cooldown timers:** When provider in cooldown, no countdown to recovery
- **Request metrics:** No success/failure counts, no latency stats
- **Configuration viewer:** No way to see provider config or model selection

**Priority:** MEDIUM

### Reconciliation Panels (Phase 10.5)

**Current State (NEW):**
- Reconciliation Activity: Shows active reconciliations
- Execution Leases: Shows execution deadlines
- Circuit Breakers: Shows breaker status
- Timeline: Shows 24hr event history

**Missing:**
- **Generation drill-down:** Cannot click generation to see full reconciliation trace
- **Manual intervention:** No "reset" or "force" buttons for stuck reconciliations
- **Filters:** Cannot filter timeline by objective, status, or outcome
- **Export:** Cannot export timeline for incident analysis

**Priority:** LOW (just deployed, validation pending)

---

## Part 3: Design Improvements

### Now View (OperatorNowView)

**Current State:**
- Shows metrics (queue depth, active objectives, failure rate, providers)
- Shows live activity feed
- Shows current work
- Shows attention panel for critical items

**Design Issues:**

1. **Information density:** Too much data, hard to scan quickly
2. **Visual hierarchy:** Metrics cards all look same priority (need critical/warning/info styling)
3. **No drill-down:** Clicking metrics does nothing (should navigate to detail view)
4. **Stale freshness:** "Updated: 5s ago" but no visual indicator of staleness
5. **No action buttons:** If failure rate high, no "investigate" or "view DLQ" button
6. **No empty states:** If queue empty, just shows "0" (should show positive message "✓ No work pending")

**Recommended Improvements:**

1. **Visual priority:** Color-code metric cards (green=healthy, yellow=warning, red=critical)
2. **Click targets:** Make all metrics clickable → navigate to detail view
3. **Freshness indicator:** Add pulsing dot for "live" updates, show staleness warning if >30s
4. **Quick actions:** Add action buttons below critical metrics ("View Failures", "Restart Service", "Clear DLQ")
5. **Empty state design:** Show positive confirmation messages for healthy states
6. **Responsive layout:** Stack metrics vertically on mobile, horizontal on desktop

### Chat Panel

**Current Design Issues:**

1. **Error visibility:** Provider errors show as chat messages (should be system banner)
2. **No input hints:** Empty input field, no placeholder text or examples
3. **No classification badges:** Cannot tell command vs info vs approval at a glance
4. **Approval cards blend in:** Should have more visual emphasis (colored border, larger)
5. **No loading states:** When sending message, just shows "Loading..." (should show which provider processing)

**Recommended Improvements:**

1. **System banner:** Show provider status in persistent top banner, not as chat message
2. **Input affordances:** Add placeholder: "Type a command or question... (e.g., 'restart gateway', 'show health')"
3. **Message badges:** Add colored badge to each message (🔵 command, ℹ️ info, ⚠️ approval)
4. **Approval emphasis:** Bold border, yellow background, larger approve/deny buttons
5. **Loading indicator:** "Processing via Anthropic..." or "Using local fallback..."
6. **Keyboard shortcuts:** Show "(Ctrl+Enter to send)" in UI

### Dashboard Layout

**Current Structure:**
```
Row 1: Runtime Control + Execution Control + Services
Row 2: Runtime Statistics + Providers
Row 3: Reconciliation Activity + Execution Leases
Row 4: Circuit Breakers + Reconciliation Timeline
Row 5: Execution Pipeline
Row 6: Chat (full width)
```

**Design Issues:**

1. **Too many rows:** 6 rows is overwhelming, hard to see "at a glance"
2. **Chat placement:** Chat at bottom means scrolling to interact
3. **No focus mode:** Cannot maximize one panel for detailed view
4. **Static layout:** Cannot rearrange panels or hide unused ones
5. **No mobile support:** Layout breaks on small screens

**Recommended Layout:**

```
┌────────────────────────────────────────────────────────┐
│ Top Banner: Observation Window + Provider Status       │
├──────────────────────────┬─────────────────────────────┤
│ Primary Metrics          │ Chat Panel (sticky sidebar) │
│ (Runtime + Execution)    │ (always visible, can        │
│                          │  collapse to icon)          │
├──────────────────────────┤                             │
│ Reconciliation Overview  │                             │
│ (Activity + Leases)      │                             │
├──────────────────────────┤                             │
│ Health Status            │                             │
│ (Services + Providers)   │                             │
└──────────────────────────┴─────────────────────────────┘
```

Benefits:
- Chat always accessible (no scrolling)
- Primary metrics visible on page load
- Clear visual sections
- Mobile: Chat collapses to FAB (floating action button)

---

## Part 4: Chat Interface Cleanup (Immediate Fixes)

### Issue 1: Provider Cooldown Errors as Chat Messages

**Current Behavior:**
```
Vienna Chat
New thread
hello
12:04:04 AM
Failed to send message: AI chat temporarily unavailable 
(all LLM providers in cooldown)
12:04:04 AM
```

**Problem:** Error appears as chat message, looks like conversation failed

**Fix:**
1. Show provider status in **persistent system banner** at top of chat panel:
   ```
   ⚠️ Providers degraded: Anthropic (cooldown 2m 15s), Local (unavailable)
   ```
2. If all providers unavailable, **disable input field** with message:
   ```
   Chat unavailable — all providers in cooldown. Retry in 2m 15s.
   ```
3. If message sent during cooldown, show **inline error** (not as chat message):
   ```
   ⚠️ Message not sent — retrying when provider available
   ```

### Issue 2: No Thread Management

**Current Behavior:** Single thread, no way to start new conversation or switch threads

**Fix:**
1. Add **thread selector** in chat header:
   ```
   [Current Thread ▼] [+ New Thread]
   ```
2. Show **thread list** in dropdown:
   ```
   Active Threads:
   - Incident Investigation (12 messages, 2h ago)
   - Gateway Restart (5 messages, 30m ago)
   - General (this thread)
   ```
3. Allow **thread creation** with optional title:
   ```
   New Thread
   Title (optional): [                    ]
   [Create]  [Cancel]
   ```

### Issue 3: No Message Classification Visual

**Current Behavior:** All messages look identical

**Fix:**
1. Add **classification badge** to each message:
   ```
   🔵 COMMAND   hello
   ℹ️  INFO      Vienna is operational...
   ⚠️  APPROVAL  Restart gateway? [Approve] [Deny]
   ```
2. Color-code by type:
   - Command: Blue border
   - Info: Gray border
   - Approval: Yellow background + bold border
   - Error: Red border

### Issue 4: No Timestamp Visibility

**Current Behavior:** Timestamps visible but hard to scan

**Fix:**
1. Show **relative time** by default:
   ```
   Just now
   2m ago
   1h ago
   Yesterday 3:45 PM
   ```
2. Show **absolute time** on hover:
   ```
   [tooltip] 2026-03-14 00:04:04 EDT
   ```

### Issue 5: No Action Feedback

**Current Behavior:** After approval, no clear indication of execution success/failure

**Fix:**
1. Add **execution result** inline after approval:
   ```
   ⚠️  APPROVAL  Restart gateway?
                 [Approved by operator at 00:05:12]
   
   ✅ RESULT    Gateway restarted successfully
                (execution_id: exec_20260314_000512)
                [View Details]
   ```
2. If execution failed:
   ```
   ❌ RESULT    Gateway restart failed
                Error: Service not responding
                [View Logs] [Retry]
   ```

---

## Part 5: Priority Roadmap

### P0 — Immediate (24-48 hours)

**Goal:** Make chat usable, fix provider error UX

1. ✅ Provider status banner (replace error messages)
2. ✅ Disable input during cooldown
3. ✅ Message classification badges
4. ✅ Relative timestamps
5. ✅ Execution result feedback

**Files to modify:**
- `client/src/components/chat/ChatPanel.tsx`
- `client/src/components/chat/ChatMessage.tsx` (new component)
- `client/src/components/chat/ProviderStatusBanner.tsx` (new component)

### P1 — Short-term (1 week)

**Goal:** Enable governance visibility, improve dashboard layout

1. Execution Ledger browser (basic table view)
2. Policy decision viewer (list recent blocks)
3. Managed objectives detail view (drill-down from activity panel)
4. Dashboard layout refactor (chat sidebar, primary metrics on top)
5. Empty state design (positive messages for healthy states)

**Files to create:**
- `client/src/components/ledger/ExecutionLedgerBrowser.tsx`
- `client/src/components/policies/PolicyDecisionViewer.tsx`
- `client/src/components/objectives/ObjectiveDetailView.tsx`
- `client/src/layouts/DashboardLayoutV2.tsx`

### P2 — Medium-term (2-4 weeks)

**Goal:** Complete governance visibility, advanced operator tools

1. Plan viewer with step progress
2. Verification result browser
3. Workflow outcome viewer
4. Service detail view with logs
5. Provider metrics dashboard
6. Thread management UI

**Files to create:**
- `client/src/components/plans/PlanViewer.tsx`
- `client/src/components/verification/VerificationResultBrowser.tsx`
- `client/src/components/services/ServiceDetailView.tsx`
- `client/src/components/providers/ProviderMetricsDashboard.tsx`
- `client/src/components/chat/ThreadManager.tsx`

### P3 — Long-term (1-2 months)

**Goal:** Advanced features, polish, mobile support

1. DLQ browser with retry actions
2. Audit log browser
3. Agent registry viewer
4. Model transparency dashboard
5. Workflow template catalog
6. Mobile-responsive layout
7. Keyboard shortcuts
8. Dark/light theme toggle

---

## Part 6: Quick Wins (< 2 hours each)

These can be implemented immediately for high impact:

1. **Provider status banner** (1 hour)
   - Replace chat error messages with persistent banner
   - Show cooldown countdown timers
   
2. **Message classification badges** (1 hour)
   - Add colored badge to each message
   - Color-code by type (command/info/approval/error)

3. **Empty state design** (1 hour)
   - Add positive messages when metrics healthy
   - Show "✓ No failures" instead of "0 failures"

4. **Click targets on metrics** (1.5 hours)
   - Make all metric cards clickable
   - Navigate to relevant detail view

5. **Relative timestamps** (30 minutes)
   - Show "2m ago" instead of absolute time
   - Tooltip for absolute time on hover

6. **Loading indicators** (1 hour)
   - Show provider name during chat loading
   - Show "Processing via Anthropic..."

---

## Bottom Line

**Backend richness:** 28 API route files, comprehensive governance infrastructure  
**UI coverage:** ~30% of backend capabilities visible  
**Biggest gap:** Governance layer (ledger, policies, plans, verifications) has no UI  
**Highest priority:** Chat interface cleanup + provider status visibility  
**Quick wins:** 6 improvements implementable in < 2 hours each

**Next step:** Implement P0 chat cleanup fixes, then tackle P1 governance visibility.
