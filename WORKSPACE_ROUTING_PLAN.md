# Workspace Routing Plan — Vienna UI → Next.js

**Date:** 2026-03-14  
**Stage:** Stage 2 Architecture Reconciliation  
**Purpose:** Define Next.js route structure for Vienna workspace integration

---

## Route Structure

### Primary Routes

```
/                                  → Landing page (existing)
/workspace                         → Workspace hub (new)
/workspace/investigations          → Investigation index (new)
/workspace/investigations/[id]     → Investigation detail (new)
/workspace/incidents               → Incident index (new)
/workspace/incidents/[id]          → Incident detail (new)
/workspace/artifacts               → Artifact browser (new)
/workspace/traces                  → Trace browser (new)
/workspace/objectives              → Objective monitor (new)
```

---

## Route Mapping to Vienna Components

### 1. Workspace Hub — `/workspace`

**Purpose:** Entry point for all investigation/incident workflows

**Component Mapping:**

| Vienna Component | Next.js Component | Location |
| ---------------- | ----------------- | -------- |
| N/A (new design) | `WorkspaceHub` | `src/app/workspace/page.tsx` |

**Layout:**

```
┌────────────────────────────────────────────┐
│ Workspace                                   │
├────────────────────────────────────────────┤
│                                             │
│ ┌──────────────┐  ┌──────────────┐        │
│ │ Investigations│  │  Incidents   │        │
│ │  12 open     │  │   3 open     │        │
│ └──────────────┘  └──────────────┘        │
│                                             │
│ ┌──────────────┐  ┌──────────────┐        │
│ │  Objectives  │  │   Artifacts  │        │
│ │  10 healthy  │  │   142 total  │        │
│ └──────────────┘  └──────────────┘        │
│                                             │
│ Recent Activity                             │
│ • Gateway remediation completed             │
│ • Investigation "Gateway Failure" opened    │
└────────────────────────────────────────────┘
```

**Data Sources:**

- Investigation count: Neon `investigation_refs` table
- Incident count: Neon `incident_refs` table
- Objective count: Vienna API `GET /api/v1/objectives`
- Artifact count: Neon `artifact_refs` table
- Recent activity: Vienna API `GET /api/v1/ledger/events?limit=10`

---

### 2. Investigation Index — `/workspace/investigations`

**Purpose:** List all investigations with filtering/search

**Component Mapping:**

| Vienna Component | Next.js Component | Location |
| ---------------- | ----------------- | -------- |
| `InvestigationManager` (list view) | `InvestigationIndex` | `src/app/workspace/investigations/page.tsx` |

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│ Investigations                             [+ New]         │
├────────────────────────────────────────────────────────────┤
│ Filters: [All] [Open] [Investigating] [Resolved]           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Gateway Failure 2026-03-14                                 │
│ Status: Investigating | 12 artifacts | 3 traces            │
│ Created: 2h ago by operator@example.com                    │
│                                                             │
│ Database Performance Degradation                           │
│ Status: Resolved | 8 artifacts | 1 trace                   │
│ Created: 2d ago | Resolved: 1d ago                         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Data Sources:**

- Investigation list: Neon `investigation_refs` (fast query)
- Artifact/trace counts: Neon `artifact_refs` aggregation
- Full investigation data: Fetch on-demand from Vienna API

**Filters:**

```typescript
interface InvestigationFilters {
  status?: 'open' | 'investigating' | 'resolved' | 'archived'
  created_by?: string
  objective_id?: string
  search?: string // name or description
}
```

**API Route:**

- `GET /api/investigations` → Queries Neon + enriches from Vienna API

---

### 3. Investigation Detail — `/workspace/investigations/[id]`

**Purpose:** Complete investigation workspace with artifacts, traces, timeline

**Component Mapping:**

| Vienna Component | Next.js Component | Location |
| ---------------- | ----------------- | -------- |
| `InvestigationManager` (detail view) | `InvestigationDetail` | `src/app/workspace/investigations/[id]/page.tsx` |
| `ArtifactBrowser` | `ArtifactPanel` | Component in detail page |
| `TraceTimelinePanel` | `TraceTimeline` | Component in detail page |
| `RelatedEntitiesPanel` | `RelatedEntities` | Component in detail page |

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ Investigation: Gateway Failure 2026-03-14                     │
│ Status: Investigating | Created: 2h ago                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Description                                                   │
│ Repeated gateway restarts every 30 minutes. Investigating    │
│ root cause and stability improvements.                        │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ Artifacts (12)                                                │
│                                                               │
│ [Trace] intent_trace_gateway_restart.json       4.5 KB       │
│ [Execution] execution_graph_restart.json        2.1 KB       │
│ [Timeline] timeline_export_2026-03-14.md        8.3 KB       │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ Related Objectives                                            │
│                                                               │
│ • Maintain Gateway Health (HEALTHY)                          │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ Timeline                                                      │
│                                                               │
│ 21:18:00 Investigation opened                                │
│ 21:18:05 Trace artifact added                                │
│ 21:20:00 Remediation executed (successful)                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Sub-Components:**

1. **Investigation Header**
   - Name, status, created/resolved timestamps
   - Status badge (open/investigating/resolved/archived)
   - Actions: [Edit] [Resolve] [Archive]

2. **Artifact Panel**
   - List artifacts grouped by type
   - Download/preview actions
   - Add artifact button

3. **Trace Timeline**
   - Execution timeline for related traces
   - Event graph visualization
   - Export options (JSON, Markdown)

4. **Related Entities**
   - Linked objectives
   - Linked incidents
   - Linked executions

**Data Sources:**

- Investigation metadata: Vienna API `GET /api/v1/investigations/:id`
- Artifacts: Vienna API `GET /api/v1/artifacts?investigation_id=:id`
- Trace timeline: Vienna API `GET /api/v1/traces/:id/timeline`
- Related entities: Vienna API (investigation graph)

**API Routes:**

- `GET /api/investigations/:id` → Proxy to Vienna API
- `GET /api/investigations/:id/artifacts` → Proxy to Vienna API
- `POST /api/investigations/:id/artifacts` → Upload artifact
- `PATCH /api/investigations/:id` → Update status

---

### 4. Incident Index — `/workspace/incidents`

**Purpose:** Monitor active/resolved incidents

**Component Mapping:**

| Vienna Component | Next.js Component | Location |
| ---------------- | ----------------- | -------- |
| N/A (Vienna incidents in State Graph) | `IncidentIndex` | `src/app/workspace/incidents/page.tsx` |

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│ Incidents                                   Severity: All  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔴 CRITICAL | OpenClaw Gateway Unavailable                 │
│ Service: openclaw-gateway | Detected: 2h ago               │
│ Status: RESOLVED (5m ago) | Remediation: Automatic         │
│                                                             │
│ 🟡 MEDIUM | Database Connection Pool Exhausted             │
│ Service: postgres | Detected: 1d ago                       │
│ Status: OPEN | Remediation: Manual investigation           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Data Sources:**

- Incident list: Neon `incident_refs` (fast query) OR Vienna API
- Full incident details: Vienna API `GET /api/v1/incidents/:id`

**Filters:**

```typescript
interface IncidentFilters {
  status?: 'open' | 'investigating' | 'resolved'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  service_id?: string
}
```

---

### 5. Incident Detail — `/workspace/incidents/[id]`

**Purpose:** Full incident timeline, remediation history, related investigations

**Component Mapping:**

| Vienna Component | Next.js Component | Location |
| ---------------- | ----------------- | -------- |
| N/A (Vienna incidents) | `IncidentDetail` | `src/app/workspace/incidents/[id]/page.tsx` |

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ Incident: OpenClaw Gateway Unavailable                        │
│ Severity: CRITICAL | Status: RESOLVED                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Service: openclaw-gateway                                     │
│ Detected: 2026-03-14 21:15:00 by objective_evaluator         │
│ Resolved: 2026-03-14 21:20:00 (5m duration)                  │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ Timeline                                                      │
│                                                               │
│ 21:15:00 Incident detected (Connection refused on 18789)     │
│ 21:15:05 Remediation started (plan: gateway_recovery)        │
│ 21:15:10 Service restarted                                   │
│ 21:15:15 Health check passed                                 │
│ 21:20:00 Incident resolved (verification: healthy)           │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ Related Investigations                                        │
│                                                               │
│ • Gateway Failure 2026-03-14 (INVESTIGATING)                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Data Sources:**

- Incident metadata: Vienna API `GET /api/v1/incidents/:id`
- Timeline events: Vienna API (incident timeline)
- Related investigations: Vienna API (investigation graph)

---

### 6. Artifact Browser — `/workspace/artifacts`

**Purpose:** Browse all artifacts across investigations

**Component Mapping:**

| Vienna Component | Next.js Component | Location |
| ---------------- | ----------------- | -------- |
| `ArtifactBrowser` (full view) | `ArtifactBrowser` | `src/app/workspace/artifacts/page.tsx` |

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│ Artifacts                             Type: [All]           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ [Trace] intent_trace_gateway_restart.json     4.5 KB       │
│ Investigation: Gateway Failure 2026-03-14                  │
│ Created: 2h ago                                             │
│                                                             │
│ [Execution Graph] execution_graph_restart.json  2.1 KB     │
│ Investigation: Gateway Failure 2026-03-14                  │
│ Created: 2h ago                                             │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Filters:**

```typescript
interface ArtifactFilters {
  artifact_type?: 'trace' | 'execution_graph' | 'timeline_export' | 'investigation' | 'incident'
  investigation_id?: string
  intent_id?: string
  execution_id?: string
}
```

**Data Sources:**

- Artifact list: Neon `artifact_refs` (fast metadata query)
- Artifact content: Vienna API `GET /api/v1/artifacts/:id`

---

### 7. Trace Browser — `/workspace/traces`

**Purpose:** Browse execution traces, timelines, graphs

**Component Mapping:**

| Vienna Component | Next.js Component | Location |
| ---------------- | ----------------- | -------- |
| `TraceExplorer` | `TraceBrowser` | `src/app/workspace/traces/page.tsx` |

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│ Traces                                Status: [All]         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ int_20260314_001 | Restart Gateway                         │
│ Status: Completed | Risk: T1 | Duration: 5s                │
│ Created: 2h ago                                             │
│                                                             │
│ int_20260314_002 | Check Gateway Health                    │
│ Status: Completed | Risk: T0 | Duration: 1s                │
│ Created: 3h ago                                             │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Data Sources:**

- Trace list: Vienna API `GET /api/v1/ledger/executions`
- Trace timeline: Vienna API `GET /api/v1/traces/:id/timeline`
- Trace graph: Vienna API `GET /api/v1/traces/:id/graph`

---

### 8. Objective Monitor — `/workspace/objectives`

**Purpose:** Monitor objective health, evaluation history, remediation status

**Component Mapping:**

| Vienna Component | Next.js Component | Location |
| ---------------- | ----------------- | -------- |
| N/A (Vienna objectives) | `ObjectiveMonitor` | `src/app/workspace/objectives/page.tsx` |

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│ Objectives                            Status: [All]         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ Maintain Gateway Health                                 │
│ Service: openclaw-gateway | Status: HEALTHY                │
│ Last evaluated: 30s ago | Next: 30s                        │
│                                                             │
│ 🔄 Maintain Database Performance                           │
│ Service: postgres | Status: REMEDIATING                    │
│ Last evaluated: 15s ago | Remediation: In progress         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Data Sources:**

- Objective list: Vienna API `GET /api/v1/objectives`
- Objective details: Vienna API `GET /api/v1/objectives/:id`
- Evaluation history: Vienna API `GET /api/v1/objectives/:id/evaluations`

---

## Layout Components

### App Layout — `src/app/layout.tsx`

**Updates:**

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Header /> {/* Navigation: Home | Workspace */}
        {children}
        <Footer />
      </body>
    </html>
  )
}
```

**Navigation:**

- `/` → Home (landing page)
- `/workspace` → Workspace (Vienna UI)

---

### Workspace Layout — `src/app/workspace/layout.tsx`

**New layout for all `/workspace/*` routes:**

```tsx
export default function WorkspaceLayout({ children }) {
  return (
    <div className="workspace-layout">
      <WorkspaceSidebar />
      <main className="workspace-content">
        {children}
      </main>
    </div>
  )
}
```

**Workspace Sidebar:**

```
Workspace
├─ Investigations
├─ Incidents
├─ Objectives
├─ Artifacts
└─ Traces
```

---

## Component Hierarchy

```
src/app/
├── page.tsx                               (landing page, existing)
├── layout.tsx                             (root layout)
└── workspace/
    ├── layout.tsx                         (workspace layout, new)
    ├── page.tsx                           (workspace hub, new)
    ├── investigations/
    │   ├── page.tsx                       (investigation index, new)
    │   └── [id]/
    │       └── page.tsx                   (investigation detail, new)
    ├── incidents/
    │   ├── page.tsx                       (incident index, new)
    │   └── [id]/
    │       └── page.tsx                   (incident detail, new)
    ├── artifacts/
    │   └── page.tsx                       (artifact browser, new)
    ├── traces/
    │   └── page.tsx                       (trace browser, new)
    └── objectives/
        └── page.tsx                       (objective monitor, new)
```

---

## Component Library

**Create new component directory:**

```
src/components/workspace/
├── InvestigationCard.tsx
├── ArtifactList.tsx
├── TraceTimeline.tsx
├── ExecutionGraph.tsx
├── ObjectiveCard.tsx
├── IncidentCard.tsx
├── WorkspaceSidebar.tsx
├── StatusBadge.tsx
└── EmptyState.tsx
```

**Reusable components:**

- `InvestigationCard` — Investigation summary card
- `ArtifactList` — Artifact list with type icons
- `TraceTimeline` — Event timeline visualization
- `ExecutionGraph` — D3.js execution graph
- `ObjectiveCard` — Objective health card
- `IncidentCard` — Incident summary card
- `StatusBadge` — Status indicator (open/resolved/healthy/etc.)
- `EmptyState` — Empty state UI for lists

---

## API Routes for Workspace

**Create new API routes:**

```
src/app/api/
├── investigations/
│   ├── route.ts                  (GET /api/investigations - list)
│   └── [id]/
│       ├── route.ts              (GET/PATCH /api/investigations/:id)
│       └── artifacts/
│           └── route.ts          (GET/POST /api/investigations/:id/artifacts)
├── incidents/
│   ├── route.ts                  (GET /api/incidents - list)
│   └── [id]/
│       └── route.ts              (GET /api/incidents/:id)
├── artifacts/
│   ├── route.ts                  (GET /api/artifacts - list)
│   └── [id]/
│       ├── route.ts              (GET /api/artifacts/:id)
│       └── download/
│           └── route.ts          (GET /api/artifacts/:id/download)
├── traces/
│   └── [id]/
│       ├── timeline/
│       │   └── route.ts          (GET /api/traces/:id/timeline)
│       ├── graph/
│       │   └── route.ts          (GET /api/traces/:id/graph)
│       └── export/
│           └── route.ts          (GET /api/traces/:id/export)
└── objectives/
    ├── route.ts                  (GET /api/objectives - list)
    └── [id]/
        ├── route.ts              (GET /api/objectives/:id)
        └── evaluations/
            └── route.ts          (GET /api/objectives/:id/evaluations)
```

**All API routes proxy to Vienna runtime:**

```typescript
// Example: GET /api/investigations
export async function GET(request: Request) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')

  const response = await fetch(
    `http://vienna-runtime:3100/api/v1/investigations?status=${status}`
  )

  const data = await response.json()
  return Response.json(data)
}
```

---

## Data Fetching Strategy

### Server Components (Default)

Most workspace pages use **Server Components** for initial data fetching:

```typescript
// src/app/workspace/investigations/page.tsx
export default async function InvestigationsPage() {
  const investigations = await fetch('http://vienna-runtime:3100/api/v1/investigations')
    .then(res => res.json())

  return <InvestigationIndex investigations={investigations} />
}
```

**Benefits:**
- Fast initial render (SSR)
- SEO-friendly
- No client-side loading states

---

### Client Components (Interactive)

Interactive components use **Client Components** with SWR/React Query:

```typescript
// src/components/workspace/TraceTimeline.tsx
'use client'

import useSWR from 'swr'

export function TraceTimeline({ traceId }) {
  const { data, error } = useSWR(`/api/traces/${traceId}/timeline`, fetcher)

  if (!data) return <Loading />
  return <Timeline events={data.timeline} />
}
```

**Benefits:**
- Real-time updates (polling/refetch)
- Optimistic UI updates
- Client-side caching

---

## Styling Consistency

**Use existing Regulator design system:**

- Dark navy background (`bg-navy-900`)
- Purple/blue accent colors (`text-purple-400`, `text-blue-400`)
- Border colors (`border-navy-700`)
- Card backgrounds (`bg-navy-800`)
- Hover effects (`hover:scale-[1.02]`)

**Example workspace card:**

```tsx
<div className="bg-navy-800 border border-navy-700 rounded-xl p-6 hover:scale-[1.02] transition">
  <h3 className="text-white font-semibold mb-2">Investigation Name</h3>
  <p className="text-slate-400 text-sm">Status: Investigating</p>
</div>
```

---

## Progressive Enhancement

**Phase 1 (MVP):**
- Static investigation/incident lists
- Basic artifact browser
- Trace timeline (read-only)

**Phase 2 (Enhanced):**
- Real-time objective monitoring
- Interactive execution graphs (D3.js)
- Search/filtering

**Phase 3 (Advanced):**
- Investigation workspace (collaborative)
- Artifact annotations
- Custom dashboards

---

**Status:** Workspace routing plan complete  
**Next:** ADAPTER_LAYER_PLAN.md
