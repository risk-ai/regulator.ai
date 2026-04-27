# Vienna OS Console — Remaining Work Brief

**From:** Aiden (ai.ventures COO)
**For:** Vienna (Max's agent)
**Date:** 2026-04-27
**Context:** PR #105 (`fix/console-audit-bugs`) fixes critical bugs and wires missing endpoints. After merging, these items remain.

---

## Priority 1 — Stub Endpoints Still Returning Static Data

These server endpoints return hardcoded JSON without touching the DB. They should be wired to real queries.

### `GET /api/v1/runtime/envelopes` (line ~1867 in server.js)
- Currently returns `{ data: [] }` 
- RuntimePage displays this — should query `regulator.proposals` or a dedicated envelopes table
- The RuntimePage shows "Pipeline Envelopes" and "Reconciliation Stats" — needs real data

### `GET /api/v1/runtime/stats` (line ~1872)
- Returns hardcoded `{ pipeline: { queued: 0, processing: 0 }, reconciliation: { pending: 0 } }`
- Should aggregate from proposals table: `COUNT(*) WHERE state = 'pending'`, etc.

### `GET /api/v1/objectives` (line ~1094)
- Returns `{ data: [] }` — WorkspacePage shows objectives panel
- Either create `regulator.objectives` table or derive from existing data

### `GET /api/v1/deadletters` (line ~1099)
- Returns `{ data: [] }` — for failed/stuck executions
- Should query proposals with `state = 'failed'` or create dedicated table

### `POST /api/v1/recovery/intent` (line ~1234)
- Returns `{ status: 'acknowledged' }` without doing anything
- Should create a recovery proposal in the proposals table

### `GET /api/v1/artifacts` (line ~1119)
- Returns `{ data: [] }` — WorkspacePage artifacts panel
- Create `regulator.artifacts` table or derive from execution records

### `GET /api/v1/incidents` and `/api/v1/investigations` (lines ~1124, ~1129)
- Both return empty arrays
- Create `regulator.incidents` table with severity, status, linked_proposal_id

### `GET /api/v1/integrations/types` (line ~2014)
- Returns a hardcoded list of integration types (slack, pagerduty, datadog, etc.)
- This is fine as static config, but consider making it extensible via DB

---

## Priority 2 — Governance Config Persistence

### Settings Page — Governance Configuration section
- **File:** `apps/console/client/src/pages/SettingsPage.tsx` lines 249-256
- Currently saves to `localStorage` only (`GOV_STORAGE_KEY`)
- Should call `PUT /api/v1/settings` (endpoint now exists in PR #105) to persist governance thresholds, auto-approve settings, etc.
- Change `handleSave` to use `apiClient.put('/settings', config)` instead of `localStorage.setItem`

### Settings Page — Notification Preferences
- **File:** `apps/console/client/src/pages/SettingsPage.tsx` line 1109
- Already calls `apiClient.put('/settings/notifications', updated)` ✅
- But also saves to localStorage as primary — should use API as source of truth and localStorage as cache only
- The `GET /api/v1/settings/notifications` endpoint now exists (PR #105)

---

## Priority 3 — UX Polish

### Integration Connect Flow
- IntegrationsPremium "Connect" button now redirects to `/integrations` (legacy config form)
- **Better approach:** Build an inline configuration modal in IntegrationsPremium that collects webhook URL / API key and POSTs to `/api/v1/integrations` with real config
- Each integration type needs different config fields (Slack = webhook URL, PagerDuty = API key + service ID, etc.)

### Unused Imports (build size)
Clean up unused imports flagged in the audit:
- `ApprovalsPremium.tsx` — `ShieldCheck`
- `CompliancePage.tsx` — `useResponsive`
- `DashboardControl.tsx` — `Activity`, `TrendingUp`, `Power`
- `DashboardPremium.tsx` — `Bell`, `X`, `ChevronRight`
- `ExecutionPage.tsx` — `ExecutionStatusBadge`
- `FleetDashboardPage.tsx` — `RISK_TIER_COLORS`
- `FleetPremium.tsx` — `TrendingUp`
- `GovernanceChainPage.tsx` — `apiClient`, `searchGovernance`
- `IntegrationsPremium.tsx` — `ExternalLink`

### Dead Page Files (not routed)
- `Dashboard.tsx` — replaced by `DashboardControl.tsx` / `DashboardPremium.tsx`
- `FilesWorkspace.tsx` — exists but not in App.tsx routes (WorkspacePage is used instead)
- `ExecutionDetailPage.tsx` — exists but not directly routed (used within ExecutionsPage?)

### Notification Center
- The `FeedbackWidget` and `GuidedTour` components exist in App.tsx
- The notification bell/center in the header should pull from `/api/v1/notifications`
- Ensure mark-as-read and notification count are wired to real DB

---

## Priority 4 — Remaining Fake Data Sources

### Simulation Engine (in-memory only)
- `POST /api/v1/simulation/start` starts an in-memory simulation that generates fake events
- This is acceptable for demo purposes but resets on cold start (Vercel serverless)
- Consider persisting simulation state to DB if it needs to survive between requests

### `GET /api/v1/status/assistant` (line ~760)
- Returns hardcoded assistant status for the sidebar
- Should show real system health aggregated from other endpoints

---

## Already Fixed in PR #105

For reference, these are done:
- ✅ useDemoMode 401 polling loop on login page
- ✅ Registration slug collision
- ✅ All `window.location.href` → `navigate()` (5 pages)
- ✅ `<a href>` → buttons in DashboardPremium
- ✅ OAuth callback path handling
- ✅ SQL injection in integrations/action_types UPDATE
- ✅ Hardcoded JWT fallback secrets removed
- ✅ Dead file cleanup (ProviderStatusBanner_OLD.tsx)
- ✅ POST /api/v1/api-keys (create + revoke)
- ✅ POST /api/v1/connect/test and /connect/activate-pack
- ✅ POST /api/v1/team/invite
- ✅ GET/PUT /api/v1/settings/notifications
- ✅ POST /api/v1/billing/portal (Stripe)
- ✅ Integration test endpoint — real validation
- ✅ Demo seed — creates real DB data
- ✅ Execution pause/resume — persists + audit log
- ✅ Services page — real health checks
- ✅ Settings GET — reads from DB
- ✅ Settings PUT — new endpoint
