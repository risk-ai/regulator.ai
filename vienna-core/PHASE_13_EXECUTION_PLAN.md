# Phase 13 — Dashboard Workspace Integration

**Status:** Execution ready  
**Goal:** Investigation workspace UI with incident-aware architecture  
**Time estimate:** 12-16 hours

---

## Scope

**Five-panel investigation workspace:**

1. Investigation Index (list view)
2. Investigation Detail (header + notes + related entities)
3. Artifact Browser (grouped by type, preview/download)
4. Trace Timeline Panel (intent → execution → outcome)
5. Related Entities Panel (objectives, intents, cross-links)

**Design constraint:** Build incident-aware architecture (Phase 14 preparation)

**Core UX principle:** Three questions answerable in <10 seconds:
1. What happened?
2. Why was action allowed?
3. What is the current state now?

---

## Information Architecture

**UI hierarchy (incident-aware):**

```
[Future: Incident Container]
├── Investigations
│   ├── Objectives
│   ├── Intents
│   ├── Traces
│   └── Artifacts
├── Timeline
└── Related Entities
```

**Route structure (reserves incident slot):**

```
/workspace                           # Investigation index
/workspace/investigations/:id        # Investigation detail
/incidents/:id                       # Reserved for Phase 14
```

**Shared panels (entity-agnostic):**
- Timeline panel: works with investigation OR incident root
- Artifact browser: works with investigation OR incident root
- Related entities: works with investigation OR incident root

---

## Phase 13a: Backend API Gaps (2-3 hours)

### Investigation APIs

```typescript
GET    /api/v1/investigations
POST   /api/v1/investigations
GET    /api/v1/investigations/:id
PATCH  /api/v1/investigations/:id
DELETE /api/v1/investigations/:id
```

**Response schema:**

```typescript
interface Investigation {
  investigation_id: string;
  name: string;
  description?: string;
  status: 'open' | 'investigating' | 'resolved' | 'archived';
  created_at: string;
  resolved_at?: string;
  created_by: string;
  
  // Relationships
  objective_id?: string;
  objective_ids: string[];
  intent_ids: string[];
  artifact_ids: string[];
}
```

### Artifact APIs

```typescript
GET    /api/v1/artifacts
GET    /api/v1/artifacts/:id
POST   /api/v1/artifacts
GET    /api/v1/artifacts/:id/content
```

**Response schema:**

```typescript
interface Artifact {
  artifact_id: string;
  artifact_type: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  created_by: string;
  
  // Context
  investigation_id?: string;
  intent_id?: string;
  execution_id?: string;
  objective_id?: string;
  incident_id?: string;
}
```

### Trace APIs (reuse existing from Phase 11.5)

```typescript
GET    /api/v1/intents/:intent_id/graph
GET    /api/v1/intents/:intent_id/timeline
GET    /api/v1/intents/:intent_id/explanation
```

### Related Entities API

```typescript
GET    /api/v1/investigations/:id/related
```

**Response schema:**

```typescript
interface RelatedEntities {
  investigation_id: string;
  objectives: Objective[];
  intents: Intent[];
  artifacts: Artifact[];
  traces: IntentTrace[];
}
```

---

## Phase 13b: React Components (9-13 hours)

### 1. Investigation Index (3 hours)

**Component:** `InvestigationIndex.tsx`

**Features:**
- List view (open/investigating/resolved)
- Status badges (color-coded)
- Timestamps (created, resolved)
- Related entity counts (objectives, intents, artifacts)
- Quick actions (open, archive)
- Filters (status, date range)
- Search (title, description)

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Investigations                    [+ New]       │
├─────────────────────────────────────────────────┤
│ [Filters: All | Open | Investigating | Resolved]│
├─────────────────────────────────────────────────┤
│ ● Gateway failure cascade        🟡 INVESTIGATING│
│   3 objectives • 5 intents • 12 artifacts       │
│   Created 2026-03-14 17:30                      │
├─────────────────────────────────────────────────┤
│ ● Provider timeout incident      🟢 RESOLVED    │
│   1 objective • 2 intents • 4 artifacts         │
│   Resolved 2026-03-14 15:45                     │
└─────────────────────────────────────────────────┘
```

---

### 2. Investigation Detail (4 hours)

**Component:** `InvestigationDetail.tsx`

**Features:**
- Header (title, status, severity, timestamps)
- Description/notes editor (markdown support)
- Related entities summary
- Action buttons (resolve, archive, add artifact, link objective)
- Status transition workflow

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Gateway failure cascade           🟡 INVESTIGATING│
│ Created 2026-03-14 17:30 by Conductor           │
├─────────────────────────────────────────────────┤
│ Description                                     │
│ [Markdown editor with preview]                  │
│                                                 │
│ Gateway became unresponsive at 17:28. Three     │
│ restart attempts executed. Verification         │
│ confirmed recovery at 17:32.                    │
├─────────────────────────────────────────────────┤
│ Related Entities                                │
│ • 3 Objectives                                  │
│ • 5 Intents                                     │
│ • 12 Artifacts                                  │
├─────────────────────────────────────────────────┤
│ [Resolve] [Archive] [Add Artifact] [Link Entity]│
└─────────────────────────────────────────────────┘
```

---

### 3. Artifact Browser (3 hours)

**Component:** `ArtifactBrowser.tsx`

**Features:**
- Grouped by type (trace, execution, incident, investigation)
- File type icons
- Preview (text/markdown/JSON)
- Download
- Metadata (size, created, creator)
- Link to investigation/objective/intent

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Artifacts (12)                    [Group by: Type]│
├─────────────────────────────────────────────────┤
│ 📊 Traces (3)                                   │
│   intent_trace_20260314_001.json    4.2 KB     │
│   execution_graph_20260314_001.json 2.8 KB     │
│                                                 │
│ 📄 Execution Logs (5)                           │
│   stdout_20260314_173028.log        1.1 KB     │
│   stderr_20260314_173028.log        0.3 KB     │
│                                                 │
│ 📝 Investigation Notes (2)                      │
│   initial_findings.md               2.4 KB     │
│   root_cause_analysis.md            3.1 KB     │
└─────────────────────────────────────────────────┘
```

---

### 4. Trace Timeline Panel (4 hours)

**Component:** `TraceTimeline.tsx`

**Features:**
- Intent → Plan → Policy → Execution → Verification → Outcome
- Event timeline (chronological, expandable)
- Execution graph (nodes + edges, interactive)
- Decision explanations (policy decisions, warrant chain)
- Status badges (approved, denied, failed, completed)

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Execution Timeline                              │
├─────────────────────────────────────────────────┤
│ ● 17:28:14 Intent received: restart gateway     │
│   ├─ 17:28:15 Intent classified (T1)            │
│   ├─ 17:28:16 Plan created (plan_001)           │
│   ├─ 17:28:17 Policy evaluated (approved)       │
│   ├─ 17:28:18 Approval granted                  │
│   ├─ 17:28:19 Warrant issued (wrn_001)          │
│   ├─ 17:28:20 Execution started                 │
│   ├─ 17:28:32 Execution completed               │
│   ├─ 17:28:33 Verification started              │
│   ├─ 17:28:45 Verification completed (success)  │
│   └─ 17:28:46 Workflow outcome: OBJECTIVE_ACHIEVED│
├─────────────────────────────────────────────────┤
│ Execution Graph                                 │
│ [Interactive node-edge diagram]                 │
└─────────────────────────────────────────────────┘
```

---

### 5. Related Entities Panel (2 hours)

**Component:** `RelatedEntities.tsx`

**Features:**
- Objectives linked to investigation
- Intents linked to investigation
- Artifacts linked to investigation
- Cross-links between entities
- Investigation graph preview (nodes + edges)

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Related Entities                                │
├─────────────────────────────────────────────────┤
│ Objectives (3)                                  │
│   ○ maintain_gateway_health                     │
│   ○ restore_gateway_connectivity                │
│   ○ verify_gateway_stability                    │
├─────────────────────────────────────────────────┤
│ Intents (5)                                     │
│   → restart_service (T1, approved)              │
│   → verify_health (T0, completed)               │
│   → check_logs (T0, completed)                  │
├─────────────────────────────────────────────────┤
│ Artifacts (12)                                  │
│   📊 3 traces                                   │
│   📄 5 execution logs                           │
│   📝 2 investigation notes                      │
│   📋 2 incident reports                         │
└─────────────────────────────────────────────────┘
```

---

## Navigation Integration

**Top-level nav (add "Workspace" tab):**

```tsx
<Tabs>
  <Tab label="Now" />
  <Tab label="Runtime" />
  <Tab label="Workspace" />  {/* NEW */}
  <Tab label="Files" />
</Tabs>
```

**Workspace routes:**

```tsx
<Route path="/workspace" element={<InvestigationIndex />} />
<Route path="/workspace/investigations/:id" element={<InvestigationDetail />} />
```

---

## State Management

**React Query hooks:**

```typescript
// Investigations
useInvestigations({ status, limit })
useInvestigation(investigation_id)
useCreateInvestigation()
useUpdateInvestigation()

// Artifacts
useArtifacts({ investigation_id, artifact_type, limit })
useArtifact(artifact_id)
useArtifactContent(artifact_id)

// Traces (reuse from Phase 11)
useIntentGraph(intent_id)
useIntentTimeline(intent_id)

// Related entities
useRelatedEntities(investigation_id)
```

---

## Design System

**Colors (semantic states):**

```typescript
const statusColors = {
  open: 'blue',
  investigating: 'yellow',
  resolved: 'green',
  archived: 'gray'
};

const severityColors = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  critical: 'red'
};
```

**Typography:**
- Headings: Inter semibold
- Body: Inter regular
- Code: JetBrains Mono

**Spacing:** 8px-based scale (8, 16, 24, 32, 48)

---

## Implementation Order

**Priority order (highest value first):**

1. **Investigation Index** (3 hours)
   - Operators see what investigations exist
   - Quick status overview

2. **Investigation Detail** (4 hours)
   - Operators can view/edit investigation details
   - Primary workspace entry point

3. **Artifact Browser** (3 hours)
   - Operators can access evidence
   - Download/preview capabilities

4. **Trace Timeline** (4 hours)
   - Operators understand what happened
   - Policy/warrant chain visible

5. **Related Entities** (2 hours)
   - Operators see investigation context
   - Cross-links between entities

**Total:** 16 hours (upper estimate)

---

## Testing Strategy

**Component tests:**
- Each component renders without crashing
- Empty states render correctly
- Data loading states work
- Error states display helpful messages

**Integration tests:**
- Navigation between views works
- API calls trigger correctly
- State updates propagate
- Actions (resolve, archive) execute

**E2E scenarios:**
1. Create investigation
2. Add artifact
3. View trace timeline
4. Resolve investigation
5. Archive investigation

---

## Exit Criteria

**Phase 13 complete when:**
- ✅ 5 components operational
- ✅ API endpoints integrated
- ✅ Navigation working
- ✅ Empty states render correctly
- ✅ Three operator questions answerable in <10 seconds
- ✅ Incident-aware architecture (routes, panels, hierarchy)
- ✅ Component tests passing
- ✅ Manual E2E validation complete

---

## Phase 14 Preparation

**What Phase 13 sets up:**

1. **Route structure** — `/incidents/:id` reserved
2. **Shared panels** — Timeline/artifacts work with any root entity
3. **Entity-agnostic components** — No hard-coded investigation assumptions
4. **Related entities API** — Already supports incident aggregation pattern

**Transition path:**

```
Phase 13: Investigation-centric UI (incident-ready)
Phase 14: Add incident routes + shell
Result: Incident becomes top-level, investigations nest beneath
```

---

## Status

**Current:** Execution plan complete  
**Next:** Begin Phase 13a (Backend API implementation)  
**Blocked by:** None
