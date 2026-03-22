# Frontend Information Architecture — Vienna Console

**Created:** 2026-03-14  
**Purpose:** Restructure Vienna UI around operator workflows (not prototype artifacts)  
**Phase:** 2 of 9 (UI Overhaul)

---

## Problem Statement

**Current navigation (prototype-era):**
```
Dashboard | Files | Runtime | Services | Replay | Audit | ...
```

**Issues:**
- Labels don't map to operator tasks
- No clear landing page
- Workspace/Files incomplete
- Debug/prototype labels visible
- No coherent information hierarchy
- Assistant-centric instead of infrastructure-centric

**Target:**
```
Now | Runtime | Workspace | History | Services | Settings
```

**Operator-centric, infrastructure-native, coherent hierarchy.**

---

## Core Principle

Vienna should feel like:
```
a serious control plane for governed infrastructure
```

Not:
```
a prototype dashboard with chat bolted on
```

**Design guidance:**
- Organize around **operator workflows**, not technical modules
- Landing page should answer "What needs attention **now**?"
- Navigation should make sense to infrastructure operator
- Each section has clear, distinct purpose
- No leftover debug/prototype labels

---

## Proposed Structure

### Top-Level Navigation (6 sections)

```
┌─────────────────────────────────────────────────────────┐
│ Now | Runtime | Workspace | History | Services | Settings │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Now (Landing Page)

**Purpose:** Current system posture and actionable summary

**Operator questions answered:**
- What is Vienna doing right now?
- What needs my attention right now?
- Is the runtime healthy right now?
- Is the assistant available right now?
- What should I inspect next?

**Content:**

### System Posture Card (Top)
- Runtime mode (normal/degraded/local-only/operator-only)
- Observation window status (if Phase 10.3 active)
- Assistant availability (with specific reason if unavailable)
- Provider health summary
- Safe mode indicator (if active)

### Actionable Summary Cards
- Active reconciliations count
- Degraded objectives requiring review
- Recent timeout count (last hour)
- Objectives in cooldown
- Circuit breakers tripped
- Execution leases active

### Suggested Next Actions
- "View 2 degraded objectives"
- "Inspect recent timeout events"
- "Check provider cooldown status"
- "Open reconciliation timeline"
- "Review execution pipeline"

### Assistant Panel (Bottom)
- Chat interface (if available)
- Graceful degradation when unavailable
- Clear messaging: "Assistant unavailable — runtime still operational"

**Graceful degradation:**
- Page useful with or without assistant
- Provider/runtime issues don't break layout
- Actionable summary always visible
- Suggested actions always available

**Navigation from Now:**
- Click degraded objectives → Runtime page (Reconciliation Activity)
- Click timeout count → History page (filtered to timeouts)
- Click cooldown → Services page (Provider Health)
- Suggested actions → Deep links to relevant surfaces

---

## 2. Runtime (Operator Control Plane)

**Purpose:** Governed reconciliation runtime visibility and control

**Operator questions answered:**
- What is Vienna reconciling right now?
- What execution authority is active?
- What circuit breakers are protecting the system?
- What is the reconciliation timeline?
- What is the execution pipeline status?

**Content:**

### Reconciliation Activity Panel
**Shows:** Active objectives being reconciled
- Objective name + target
- Reconciliation state (reconciling/cooldown/degraded)
- Generation number
- Failure streak
- Cooldown timer (countdown)
- Last transition time + reason

**Empty state:** "No active reconciliation. All objectives healthy or in stable state."

### Execution Leases Panel
**Shows:** Bounded execution authority currently active
- Attempt ID
- Objective + target
- Deadline (countdown timer)
- Remaining time
- Cancel requested flag
- Terminal reason (if expired)

**Warning state:** Yellow when <30s remaining, red when <10s

**Empty state:** "No active execution leases. Vienna is not currently executing any bounded reconciliations."

### Circuit Breakers Panel
**Shows:** Retry policies and failure protection
- Objective + target
- Current failure streak
- Threshold (max retries)
- Attempts remaining
- Degraded state flag
- Last failure reason + timestamp

**Empty state:** "All circuit breakers healthy. No repeated failures detected."

### Reconciliation Timeline
**Shows:** Recent reconciliation events (narrative format)
- Drift detected → Admitted → Execution started → Completed → Verified
- Or: Drift detected → Skipped (cooldown active)
- Or: Execution started → Timed out → Cooldown entered

**NOT:** Raw log dump  
**IS:** Story-like progression with clear lifecycle stages

### Execution Pipeline Status
**Shows:** Current pipeline health
- Executor status (healthy/degraded)
- Queue depth
- Rate limit status
- Policy engine status
- Verification engine status

### Runtime Control Panel
**Shows:** Operator override controls
- Safe mode toggle (emergency brake)
- Evaluation loop pause/resume
- Manual objective reset
- Watchdog status

**All actions require confirmation**

**Navigation within Runtime:**
- Click objective → Objective detail modal
- Click timeline event → Execution ledger detail
- Click lease → Execution detail
- Click circuit breaker → Objective history

---

## 3. Workspace (Artifact Browser)

**Purpose:** Files, reports, specs, artifacts, generated outputs

**Operator questions answered:**
- What docs and artifacts are relevant right now?
- What was recently generated?
- What can I inspect next?
- Where are my observation reports?
- Where are my deployment specs?

**Content:**

### File Tree / List View
**Organization options:**
1. **Recent** (default) — Last modified/created
2. **By Type:**
   - Reports (observation monitoring, phase completion, etc.)
   - Specs (architecture, plans, design docs)
   - Logs & Artifacts (execution traces, audit exports)
   - Deployment (config templates, production values)
   - Scripts (automation, validation)
3. **By Project:**
   - Vienna Core
   - Phase 10 (or current phase)
   - Console
   - Archive

### File Item Display
- Icon (based on type: .md, .json, .log, .sh)
- File name
- Size
- Last modified time (relative: "2 hours ago")
- Preview icon (if applicable)

### Interactions
- **Click:** Open in viewer/editor
- **Right-click:** Copy path, reveal in file manager
- **Drag:** (future) Attach to chat, move to folder

### Empty State
"Workspace empty or backend support not configured. Generated artifacts will appear here."

**Graceful degradation:**
- If backend file service missing: show clean empty state
- No broken file list
- No dead interactions
- Helpful message about backend requirement

**Navigation:**
- Click file → Opens viewer/editor modal
- Click folder → Expands tree or navigates to folder view

---

## 4. History (Ledger & Audit Trail)

**Purpose:** Execution history, reconciliation events, audit trail

**Operator questions answered:**
- What happened in the last hour?
- What executions completed/failed?
- What was the reconciliation lifecycle for objective X?
- What decisions did policies make?
- What verification checks ran?

**Content:**

### Execution Ledger View
**Filter controls:**
- Time range (last hour, 6h, 24h, 7d, custom)
- Objective filter
- Risk tier (T0, T1, T2)
- Status (completed, failed, timeout, cancelled)
- Service filter

**Ledger entries:**
- Execution ID
- Objective + target
- Timeline (intent → plan → execution → verification → outcome)
- Status badge (success/failure/timeout)
- Duration
- Click to expand full lifecycle

### Reconciliation Event Stream
**Shows:** Reconciliation lifecycle events
- objective.reconciliation.requested
- objective.reconciliation.admitted
- objective.reconciliation.started
- objective.reconciliation.completed
- objective.reconciliation.degraded
- objective.reconciliation.recovered

**Filters:**
- By objective
- By event type
- By time range

### Policy Decisions Log
**Shows:** Policy evaluation history
- Policy name
- Decision (permit/deny)
- Constraints evaluated
- Reason
- Timestamp
- Affected execution

### Verification Results
**Shows:** Post-execution verification outcomes
- Verification task ID
- Execution reference
- Check type (systemd_active, tcp_port_open, etc.)
- Result (success/failure/inconclusive)
- Evidence
- Timestamp

**Navigation:**
- Click execution → Full ledger timeline
- Click event → Related executions
- Click policy decision → Policy detail + constraints
- Click verification → Execution outcome

---

## 5. Services (Infrastructure Monitoring)

**Purpose:** Supporting services health and configuration

**Operator questions answered:**
- Are providers healthy?
- Is the console backend running?
- Is the gateway operational?
- What services are degraded?
- What is the policy engine status?

**Content:**

### Provider Health Panel
**Shows:** LLM provider status
- Anthropic (Sonnet/Opus)
- Ollama (local fallback)

**Per provider:**
- Status badge (healthy/degraded/unavailable/unknown)
- Last success timestamp
- Cooldown timer (if in cooldown)
- Error rate
- Average latency
- Consecutive failures
- Recent transitions (healthy → degraded → unavailable)

**Unknown status display:**
```
? Not yet used
Provider available but no execution history.
Will show health after first request.
```

### Gateway Services
**Shows:** Critical infrastructure services
- OpenClaw Gateway (port 18789)
- Vienna Console Backend (port 3100)
- Vienna Frontend (port 5174)

**Per service:**
- Status (active/degraded/stopped)
- Uptime
- Port status
- Recent restarts
- Health check results

### Governance Engines
**Shows:** Runtime governance components
- Policy Engine
- Verification Engine
- Execution Watchdog
- Reconciliation Gate
- Circuit Breaker Manager

**Per component:**
- Status (operational/degraded)
- Recent activity count
- Error count
- Last evaluation time

### State Graph Status
**Shows:** Persistent memory health
- Database size
- Table counts
- Recent write rate
- Integrity status
- Backup status (if applicable)

**Navigation:**
- Click provider → Provider detail + health timeline
- Click service → Service logs + restart history
- Click engine → Recent decisions/evaluations

---

## 6. Settings (Configuration)

**Purpose:** Operator preferences and system configuration

**Operator questions answered:**
- How do I configure providers?
- How do I change session settings?
- How do I export audit logs?
- How do I view system info?

**Content:**

### Operator Settings
- Display name
- Notification preferences
- Theme (dark/light)
- Timezone
- Session timeout preference

### Provider Configuration
- Anthropic API key (masked)
- Ollama endpoint
- Model preferences
- Fallback behavior
- Rate limits

### System Settings
- Runtime mode override
- Evaluation interval
- Log retention
- Audit export

### Session Info
- Current session ID
- Login time
- Session expires at
- IP address
- User agent

### About
- Vienna version
- OpenClaw version
- Build timestamp
- Environment (prod/test)
- Documentation links

**Navigation:**
- Click provider config → Provider setup modal
- Click audit export → Export wizard
- Click documentation → Opens docs in new tab

---

## Navigation Design

### Top Navigation Bar

```
┌──────────────────────────────────────────────────────────────┐
│ VIENNA OS                                                    │
│                                                              │
│ Now  Runtime  Workspace  History  Services  Settings       │
│ ━━━                                                          │
└──────────────────────────────────────────────────────────────┘
```

**Active state:** Underline + brighter text  
**Hover state:** Slight text brightness increase  
**Mobile:** Hamburger menu with same order

### Breadcrumb Trail (when applicable)

```
Services > Provider Health > Anthropic Detail
```

**Only show when navigated deep into section**

---

## Page Layout Pattern

All pages follow consistent structure:

```
┌────────────────────────────────────────────┐
│ Page Title                                 │
│ Brief description (1-2 sentences)          │
├────────────────────────────────────────────┤
│                                            │
│ [Primary Panel 1]                          │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│ [Primary Panel 2]                          │
│                                            │
├────────────────────────────────────────────┤
│ ... (additional panels)                    │
│                                            │
└────────────────────────────────────────────┘
```

**Consistent elements:**
- Page title (h1, bold, 24px)
- Description (14px, muted)
- Panels (card surface, consistent padding)
- Empty states (centered, helpful)
- Loading states (skeleton loaders)

---

## Routing Structure

**Routes:**
```
/                    → Now (default landing)
/runtime             → Runtime control plane
/workspace           → Workspace file browser
/history             → Execution ledger + audit
/services            → Infrastructure monitoring
/settings            → Configuration
```

**Deep links:**
```
/runtime/objectives/:id              → Objective detail
/runtime/executions/:id              → Execution detail
/history/executions/:id              → Execution ledger timeline
/services/providers/:name            → Provider health detail
/workspace/files/:path               → File viewer
```

**Query parameters:**
```
/history?time=last_hour&status=failed    → Filtered ledger
/runtime?objective=gateway_health        → Filtered to objective
```

---

## Empty State Design

Every surface has intentional empty state:

### Now Page (Nothing degraded)
```
✓ All systems operational
✓ No objectives requiring attention
✓ No recent timeouts
✓ All providers healthy

Suggested actions:
• View reconciliation timeline
• Check provider health
• Review execution history
```

### Runtime (No active reconciliation)
```
No active reconciliation.

All objectives are healthy or in stable state.
Vienna is observing but not executing remediation.

This is normal during stable operation.
```

### Workspace (No files)
```
Workspace empty.

Generated artifacts, reports, and specs will appear here.
Check back after Vienna generates observation reports or phase completion docs.
```

### History (No executions in range)
```
No executions in selected time range.

Try expanding time range or clearing filters.
```

**Empty states are:**
- Centered vertically and horizontally
- Clear and specific (not "No data")
- Helpful (suggest next action or explain why empty)
- Graceful (not error-like)

---

## Mobile Considerations

**Responsive breakpoints:**
- Desktop: ≥1280px (3-column layouts)
- Tablet: 768-1279px (2-column, collapsible sidebar)
- Mobile: <768px (single column, hamburger nav)

**Mobile-specific:**
- Top nav → Hamburger menu
- Panels stack vertically
- Tables → Horizontal scroll or card view
- Timelines → Simplified view
- Modals → Full-screen on mobile

**Priority on mobile:**
- Now page most important
- Runtime second
- Others accessible but not optimized

---

## Success Criteria

Phase 2 complete when:

1. ✅ Navigation restructured to 6 sections
2. ✅ Now page implemented as landing page
3. ✅ Each section has clear purpose and content structure
4. ✅ Empty states meaningful and helpful
5. ✅ Routing logical and deep-linkable
6. ✅ No prototype/debug labels visible
7. ✅ Operator can find what they need in <3 clicks
8. ✅ Information hierarchy makes sense to infrastructure operator

---

## Implementation Priority

### P0 (Critical)
1. Navigation bar restructure (6 sections)
2. Now page layout + system posture card
3. Routing setup
4. Page title + description pattern

### P1 (High)
5. Runtime page panels
6. History ledger view
7. Services provider health
8. Empty states for all pages

### P2 (Medium)
9. Workspace file browser (if backend support exists)
10. Settings page
11. Deep link routes
12. Mobile responsive layouts

---

## Migration from Current Structure

**Current routes → New routes:**
```
/dashboard         → / (Now)
/runtime           → /runtime (keep, restructure content)
/files             → /workspace
/replay            → /history (ledger view)
/audit             → /history (audit view)
/services          → /services (keep, enhance)
[new]              → /settings
```

**Deprecated:**
- Any debug/prototype-specific pages
- Duplicate/overlapping surfaces
- Pages without clear operator purpose

---

## Next Steps

1. Create navigation component (`MainNav.tsx`)
2. Create page layout wrapper (`PageLayout.tsx`)
3. Implement Now page structure
4. Implement empty states library
5. Update routing configuration
6. Migrate existing content to new structure
7. Remove deprecated routes

---

**Status:** Architecture complete, ready for implementation  
**Estimated implementation:** 6-8 hours  
**Next:** Begin navigation component + routing setup
