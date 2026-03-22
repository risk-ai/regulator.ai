# Vienna Operator Shell — Phase 8 Architecture

**Goal:** Single unified website for operating Vienna across all domains.

**Constraint:** UI is control surface, not execution authority. All side effects route through Vienna Core governance.

---

## System Architecture

```
┌─────────────────────────────────────────┐
│   Browser (Vienna Operator Shell)      │
│   http://localhost:3000                 │
└─────────────────────────────────────────┘
                 ↓ REST + SSE
┌─────────────────────────────────────────┐
│   Vienna Console Server                 │
│   Express API + SSE Stream              │
└─────────────────────────────────────────┘
                 ↓ Service Layer
┌─────────────────────────────────────────┐
│   Vienna Core Runtime                   │
│   Truth → Plan → Warrant → Executor     │
└─────────────────────────────────────────┘
                 ↓ Adapters
┌─────────────────────────────────────────┐
│   External Systems                      │
│   Files, Trading, APIs, Database        │
└─────────────────────────────────────────┘
```

**Authority flow:**
```
Operator action → Vienna directive → Vienna Core → Executor → Adapters → System
```

**Never:**
```
Operator action → Direct system mutation ❌
```

---

## Global Layout System

Every page shares the same chrome:

```
┌────────────────────────────────────────────────────────────┐
│  Top Status Bar                                             │
│  [Health] [Executor] [Queue] [Objectives] [Trading Guard]  │
└────────────────────────────────────────────────────────────┘
┌──────┬──────────────────────────────────┬─────────────────┐
│      │                                  │                 │
│ Left │       Main Workspace             │   Inspection    │
│ Nav  │                                  │   Drawer        │
│      │                                  │   (collapsible) │
│      │                                  │                 │
│      │                                  │                 │
└──────┴──────────────────────────────────┴─────────────────┘
┌────────────────────────────────────────────────────────────┐
│  Global Command Bar                                         │
│  > Vienna, show why obj_442 is blocked                     │
└────────────────────────────────────────────────────────────┘
```

---

## Global Components

### Top Status Bar

**Always visible, every page.**

Displays:
- System health state (healthy/degraded/critical)
- Executor state (running/paused/recovering)
- Queue depth (N envelopes)
- Active objectives (N executing)
- Dead letters (N pending review)
- Trading guard state (active/override/disabled)
- Integrity status (ok/warnings/violations)

**Data source:** `GET /api/v1/status` + SSE `system.status.updated`

**Interactions:**
- Click system health → opens health detail modal
- Click executor state → opens execution control panel
- Click trading guard → opens trading guard status

---

### Left Navigation

**Persistent sidebar.**

Sections:

```
Dashboard
────────────
Trading
Fitness
Classwork
────────────
Files
────────────
Objectives
Agents
Replay
────────────
System
```

**Icons + labels** for each section.

**Active state** highlights current page.

---

### Inspection Drawer

**Right-side collapsible panel.**

Opens when:
- User clicks on objective card
- User clicks on envelope
- User clicks on agent
- User clicks on replay event

**Tabs:**
- Summary
- Envelopes
- Replay
- Warrants
- Risk
- Causal Chain

**State:** Managed in Zustand store (`selectedObjectiveId`, `selectedEnvelopeId`, `drawerOpen`)

---

### Global Command Bar

**Bottom-anchored command interface.**

**Two modes:**

#### 1. Command mode (default)
```
> pause execution
> retry dead letter env_201
> show objective obj_442
```

**Structured parsing → API calls**

#### 2. Conversation mode (opt-in)
```
Vienna > Explain why obj_442 is blocked
Vienna > Generate my classwork plan for tonight
Vienna > Ingest these files and organize them
```

**Natural language → Vienna reasoning session**

**Implementation:**
- Text input with autocomplete
- Command history (↑/↓ arrows)
- Structured command parser
- Fallback to `POST /api/v1/directives` for unrecognized commands

**Commands become Vienna directives**, not direct UI actions.

---

## Route Map

### Primary Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Primary operator control page |
| `/trading` | Trading Workspace | Trading operations, strategies, risk |
| `/fitness` | Fitness Workspace | Fitness plans, routines, logs |
| `/classwork` | Classwork Workspace | Assignments, deadlines, study plans |
| `/files` | Files Workspace | File browser, uploads, artifacts |
| `/objectives` | Objectives Page | All objectives, execution traces |
| `/objectives/:id` | Objective Detail | Single objective deep dive |
| `/agents` | Agents Page | Agent registry, reasoning outputs |
| `/agents/:id` | Agent Detail | Single agent status, history |
| `/replay` | Replay Explorer | Event timeline, audit trail |
| `/replay/:objectiveId` | Objective Replay | Replay filtered to objective |
| `/system` | System Page | Health, integrity, configuration |

---

## Page Specifications

### 1. Dashboard (`/`)

**Purpose:** Primary operator control page.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Active Objectives (top 5)              │
│  [obj_441] Updating config              │
│  [obj_442] BLOCKED: recursion depth     │
├─────────────────────────────────────────┤
│  Decisions Needing Attention            │
│  • Dead letter env_201 (retry?)         │
│  • Recursion blocked obj_442 (cancel?)  │
├─────────────────────────────────────────┤
│  Recent Events                          │
│  13:41 — obj_441 started                │
│  13:40 — env_201 failed (3rd attempt)   │
└─────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/dashboard`
- SSE all event types

**Actions:**
- Click objective → opens inspection drawer
- Click decision → opens action modal
- Click event → opens replay detail

---

### 2. Trading Workspace (`/trading`)

**Purpose:** Trading operations monitoring and control.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Trading Guard Status                   │
│  ✓ Active | Autonomous Day 2/7          │
├─────────────────────────────────────────┤
│  Active Strategies                      │
│  • NBA Kalshi v1_baseline (live)        │
│  • NBA Kalshi v2 (shadow)               │
├─────────────────────────────────────────┤
│  Today's Activity                       │
│  Trades: 1 | Notional: $1.24 | P&L: $0  │
├─────────────────────────────────────────┤
│  Trading Objectives                     │
│  [obj_trading_441] Schedule sync        │
│  [obj_trading_442] Live order placement │
└─────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/trading/status` (new endpoint)
- `GET /api/v1/objectives?domain=trading`
- SSE `trading.*` events (new)

**Actions:**
- Adjust risk limits (via Vienna directive)
- Pause trading (via Vienna directive)
- Review orders (inspection drawer)

**Important:** All trading actions route through Vienna Core, never direct API calls.

---

### 3. Fitness Workspace (`/fitness`)

**Purpose:** Fitness planning and tracking.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Today's Plan                           │
│  • Morning: 30min cardio                │
│  • Evening: Upper body strength         │
├─────────────────────────────────────────┤
│  Weekly Progress                        │
│  Mon ✓ | Tue ✓ | Wed — | Thu — | ...   │
├─────────────────────────────────────────┤
│  Active Objectives                      │
│  [obj_fitness_101] Generate week plan   │
└─────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/fitness/plans` (new endpoint)
- `GET /api/v1/objectives?domain=fitness`

**Actions:**
- Request new plan (via Vienna directive)
- Log workout (creates Vienna objective)
- Adjust routine (via Vienna directive)

---

### 4. Classwork Workspace (`/classwork`)

**Purpose:** Academic planning and tracking.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Upcoming Deadlines                     │
│  • Civ Pro memo (due Mar 15)            │
│  • Tax reading (due Mar 12)             │
├─────────────────────────────────────────┤
│  Today's Study Plan                     │
│  6:00 PM — Civ Pro outline (2h)         │
│  8:00 PM — Tax cases review (1h)        │
├─────────────────────────────────────────┤
│  Active Objectives                      │
│  [obj_class_201] Generate tonight plan  │
└─────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/classwork/assignments` (new endpoint)
- `GET /api/v1/classwork/plans` (new endpoint)
- `GET /api/v1/objectives?domain=classwork`

**Actions:**
- Request study plan (via Vienna directive)
- Add assignment (creates Vienna objective)
- Mark complete (updates Vienna state)

---

### 5. Files Workspace (`/files`)

**Purpose:** File management, uploads, artifact tracking.

**Files as first-class Vienna artifacts.**

**Layout:**

```
┌────────────────┬────────────────────────┐
│  Folders       │  File List             │
│                │                        │
│  📁 Classwork  │  memo_draft.docx       │
│  📁 Trading    │  [Linked: obj_301]     │
│  📁 Fitness    │                        │
│  📁 Inbox      │  tax_cases.pdf         │
│                │  [Processing...]       │
└────────────────┴────────────────────────┘
```

**Features:**
- File upload (triggers Vienna ingestion objective)
- File browser (folder tree + list)
- Tagging and metadata
- Objective linking (show which objectives reference file)
- Processing status (pending/processing/complete)

**Data sources:**
- `GET /api/v1/files` (new endpoint)
- `POST /api/v1/files/upload` (new endpoint)
- `GET /api/v1/files/:fileId` (new endpoint)
- `GET /api/v1/files/:fileId/objectives` (new endpoint)

**File upload flow:**
```
1. User uploads file via UI
2. POST /api/v1/files/upload
3. Server creates Vienna directive: "Ingest and process [filename]"
4. Vienna creates objective
5. Processing envelope executes
6. File metadata updated with results
7. SSE emits file.processed
8. UI updates
```

**File artifact model:**

```typescript
interface FileArtifact {
  file_id: string;
  filename: string;
  upload_date: string;
  size_bytes: number;
  mime_type: string;
  
  storage_path: string;
  folder: string;
  tags: string[];
  
  processing_state: 'pending' | 'processing' | 'complete' | 'failed';
  processing_objective_id?: string;
  
  linked_objectives: string[];
  metadata: Record<string, unknown>;
  
  uploaded_by: string;
}
```

---

### 6. Objectives Page (`/objectives`)

**Purpose:** View all Vienna objectives.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Filters: [All] [Executing] [Blocked]  │
├─────────────────────────────────────────┤
│  [obj_441] Updating config rollout      │
│  Status: Executing | T1 | 3 envelopes   │
│                                         │
│  [obj_442] BLOCKED                      │
│  Reason: Recursion depth exceeded       │
│  Actions: [Cancel] [Retry] [Inspect]    │
└─────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/objectives`
- SSE `objective.*` events

**Filters:**
- Status (pending/executing/blocked/completed/failed)
- Risk tier (T0/T1/T2)
- Domain (trading/fitness/classwork/system)
- Date range

**Actions:**
- Click objective → opens inspection drawer
- Cancel objective → `POST /api/v1/objectives/:id/cancel`
- Retry failed envelope → `POST /api/v1/deadletters/:id/requeue`

---

### 7. Objective Detail (`/objectives/:id`)

**Purpose:** Deep dive into single objective.

**Tabs:**

1. **Summary**
   - Title, description, status
   - Risk tier, trigger
   - Progress (N/M envelopes complete)
   - Current step

2. **Envelopes**
   - All envelopes for objective
   - State, depth, attempts
   - Actions (retry, cancel)

3. **Causal Chain**
   - Tree visualization
   - Parent/child relationships
   - Depth highlighting

4. **Replay**
   - Event timeline
   - All events for objective
   - Filterable by event type

5. **Warrant**
   - Warrant summary
   - Truth snapshot binding
   - Approval status
   - Trading guard verdict

6. **Risk**
   - Risk tier justification
   - Trading impact assessment
   - Preconditions checked
   - Rollback plan

**Data sources:**
- `GET /api/v1/objectives/:id`
- `GET /api/v1/objectives/:id/envelopes`
- `GET /api/v1/objectives/:id/causal-chain`
- `GET /api/v1/objectives/:id/warrant`
- `GET /api/v1/replay?objective_id=:id`

---

### 8. Agents Page (`/agents`)

**Purpose:** Agent registry and status.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Talleyrand (Strategy)                  │
│  Status: Available | Haiku              │
│  Tasks: 42 complete | 2 failed          │
│                                         │
│  Metternich (Governance)                │
│  Status: Busy (obj_442) | Sonnet        │
│  Tasks: 18 complete | 0 failed          │
│                                         │
│  Castlereagh (Operations)               │
│  Status: Available | Haiku              │
│  Tasks: 104 complete | 3 failed         │
└─────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/agents`
- SSE `agent.*` events (new)

**Actions:**
- Click agent → opens agent detail page
- Request reasoning → modal with prompt input

---

### 9. Agent Detail (`/agents/:id`)

**Purpose:** Single agent status and history.

**Tabs:**

1. **Summary**
   - Agent name, role, model
   - Availability status
   - Current assignment
   - Budget usage

2. **Recent Tasks**
   - Last 20 tasks
   - Objective links
   - Completion status
   - Duration

3. **Reasoning Outputs**
   - Recent structured outputs
   - Proposals generated
   - Approval outcomes

**Data sources:**
- `GET /api/v1/agents/:id`
- `GET /api/v1/agents/:id/tasks` (new endpoint)
- `GET /api/v1/agents/:id/reasoning` (new endpoint)

**Actions:**
- Request reasoning → `POST /api/v1/agents/:id/reason`

---

### 10. Replay Explorer (`/replay`)

**Purpose:** Event timeline and audit trail.

**Layout:**

```
┌─────────────────────────────────────────┐
│  Filters: [All Events] [Last 24h]      │
│  Event Type: [All] ▼                    │
├─────────────────────────────────────────┤
│  15:41:03 — execution.started           │
│  Envelope: env_501 | Objective: obj_441 │
│                                         │
│  15:40:58 — warrant.issued              │
│  Warrant: wrt_442 | Objective: obj_441  │
│                                         │
│  15:40:55 — objective.created           │
│  Objective: obj_441 | Directive: dir_91 │
└─────────────────────────────────────────┘
```

**Data sources:**
- `GET /api/v1/replay`
- SSE `replay.appended`

**Filters:**
- Event type
- Objective ID
- Envelope ID
- Date range
- Actor (agent/operator/system)

**Actions:**
- Click event → expands event detail
- Click objective link → opens objective drawer
- Click envelope link → opens envelope detail

---

### 11. System Page (`/system`)

**Purpose:** System health, integrity, configuration.

**Sections:**

1. **Health Status**
   - System state
   - Queue health
   - Replay log writable
   - Adapters responsive
   - Stalled executions

2. **Integrity Checks**
   - Warrant binding (pass/fail/warning)
   - Truth freshness (pass/fail/warning)
   - Envelope ancestry (pass/fail/warning)
   - Replay completeness (pass/fail/warning)

3. **Configuration**
   - Risk tier policies
   - Budget limits
   - Rate limits
   - Trading constraints

4. **Safety Controls**
   - Pause execution
   - Resume execution
   - Run integrity check
   - Emergency override (governed)

**Data sources:**
- `GET /api/v1/execution/health`
- `GET /api/v1/execution/integrity`
- `GET /api/v1/system/config` (new endpoint)

**Actions:**
- Pause/resume → `POST /api/v1/execution/pause|resume`
- Run integrity check → `POST /api/v1/execution/integrity-check`
- Emergency override → governed modal flow

---

## API Extensions

### New Endpoints Required

#### Domain Endpoints

```
GET  /api/v1/trading/status
GET  /api/v1/trading/strategies
GET  /api/v1/trading/orders
GET  /api/v1/trading/positions

GET  /api/v1/fitness/plans
POST /api/v1/fitness/plans
GET  /api/v1/fitness/logs
POST /api/v1/fitness/logs

GET  /api/v1/classwork/assignments
POST /api/v1/classwork/assignments
GET  /api/v1/classwork/plans
POST /api/v1/classwork/plans
```

#### File Endpoints

```
GET    /api/v1/files
POST   /api/v1/files/upload
GET    /api/v1/files/:fileId
PUT    /api/v1/files/:fileId
DELETE /api/v1/files/:fileId
GET    /api/v1/files/:fileId/objectives
POST   /api/v1/files/:fileId/process
```

#### Agent Endpoints

```
GET  /api/v1/agents/:id/tasks
GET  /api/v1/agents/:id/reasoning
```

#### System Endpoints

```
GET  /api/v1/system/config
PUT  /api/v1/system/config
```

#### Command/Directive Endpoints

```
POST /api/v1/commands/parse
POST /api/v1/commands/execute
POST /api/v1/conversations/start
POST /api/v1/conversations/:id/message
```

### New SSE Events

```
trading.guard.updated
trading.order.placed
trading.order.filled
trading.strategy.updated

fitness.plan.created
fitness.log.added

classwork.assignment.created
classwork.plan.generated

file.uploaded
file.processing
file.processed
file.failed

agent.task.started
agent.task.completed
```

---

## File Artifact System

### Storage Model

**Files stored in:** `~/.openclaw/workspace/files/`

**Structure:**
```
files/
├── storage/
│   ├── inbox/
│   ├── classwork/
│   ├── trading/
│   └── fitness/
├── metadata/
│   └── files.db (SQLite)
└── processing/
    └── temp/
```

### File Upload Flow

```
1. User uploads file via /files page
2. POST /api/v1/files/upload
3. Server saves to storage/inbox/
4. Server creates FileArtifact record
5. Server creates Vienna directive: "Process file [filename]"
6. Vienna creates objective
7. Processing envelope executes:
   - Analyzes file type
   - Extracts metadata
   - Suggests folder
   - Generates tags
   - Links to relevant objectives
8. File metadata updated
9. SSE emits file.processed
10. UI updates
```

### File Processing Types

**Document (PDF, DOCX):**
- Extract text
- Identify document type (assignment, memo, case)
- Suggest classwork folder
- Link to relevant assignments

**Data file (CSV, JSON):**
- Analyze schema
- Suggest trading or fitness data
- Offer import to database

**Image (PNG, JPG):**
- Extract metadata
- OCR if needed
- Suggest categorization

**Archive (ZIP, TAR):**
- List contents
- Offer batch processing

### File Linking

Files can link to:
- Objectives (file used in execution)
- Assignments (classwork documents)
- Trading strategies (data files)
- Fitness logs (workout images)

**Bidirectional:**
- File → shows linked objectives
- Objective → shows referenced files

---

## Command Interface

### Command Parser

**Structured commands:**

```
pause execution
resume execution
show objective <id>
retry envelope <id>
cancel objective <id>
inspect agent <name>
```

**Parser flow:**
```
Input text
  → Tokenize
  → Match command pattern
  → Extract parameters
  → Validate
  → Route to API endpoint
```

### Vienna Conversation Mode

**Natural language directives:**

```
"Vienna, explain why obj_442 is blocked"
  → POST /api/v1/agents/vienna/reason
  → Returns reasoning output
  → Displays in command result panel

"Vienna, generate my classwork plan for tonight"
  → POST /api/v1/directives
  → Creates objective
  → UI shows objective created + link

"Vienna, ingest these files and organize them"
  → POST /api/v1/directives with file references
  → Creates batch processing objective
  → Files linked to objective
```

### Command Autocomplete

Suggestions based on:
- Command history
- Current page context
- Available objectives
- Active agents

---

## Implementation Stages

### Stage 1: Operator Shell Foundation (Week 1)

**Goal:** Global layout + dashboard + SSE

**Deliverables:**
- [x] Global layout components (status bar, nav, drawer, command bar)
- [x] Dashboard page
- [x] SSE integration
- [x] Dashboard bootstrap endpoint
- [x] Basic command parser (structured commands only)

**Validation:**
- Dashboard loads state from `/api/v1/dashboard`
- SSE updates UI in real time
- Navigation works
- Status bar shows live data
- Command bar accepts basic commands

---

### Stage 2: System Operations (Week 2)

**Goal:** Objectives, execution, decisions

**Deliverables:**
- [x] Objectives page
- [x] Objective detail page
- [x] Execution inspection drawer
- [x] Decision inbox
- [x] Dead letter management
- [x] Pause/resume controls

**Validation:**
- Objectives list shows all objectives
- Objective detail shows envelopes + causal chain + replay
- Pause/resume works end-to-end
- Dead letter requeue works
- Decisions inbox shows actionable items

---

### Stage 3: Domain Workspaces (Week 3)

**Goal:** Trading, fitness, classwork pages

**Deliverables:**
- [x] Trading workspace
- [x] Fitness workspace
- [x] Classwork workspace
- [x] Domain-specific API endpoints
- [x] Domain-filtered objectives

**Validation:**
- Trading workspace shows guard state + strategies
- Fitness workspace shows plans + logs
- Classwork workspace shows assignments + deadlines
- All domain actions create Vienna directives

---

### Stage 4: Files System (Week 4)

**Goal:** File uploads, artifacts, processing

**Deliverables:**
- [x] Files page
- [x] File upload with Vienna ingestion
- [x] File browser (folders + list)
- [x] File metadata and tagging
- [x] Objective linking
- [x] Processing status tracking

**Validation:**
- File upload creates Vienna objective
- Processing completes and updates metadata
- Files link to objectives bidirectionally
- File browser shows organized structure

---

### Stage 5: Advanced Features (Week 5)

**Goal:** Agents, replay, conversation interface

**Deliverables:**
- [x] Agents page
- [x] Agent detail page
- [x] Replay explorer
- [x] Vienna conversation mode in command bar
- [x] Emergency override UI
- [x] System configuration page

**Validation:**
- Agents page shows status + budgets
- Agent reasoning requests work (rate limited)
- Replay explorer shows full event timeline
- Conversation mode creates directives
- Emergency override follows governance rules

---

## Enforcement Checklist

**UI must never:**
- [ ] Import adapter modules
- [ ] Mutate queue directly
- [ ] Issue warrants directly
- [ ] Execute shell commands directly
- [ ] Bypass executor
- [ ] Bypass Vienna Core
- [ ] Synthesize events Vienna Core doesn't recognize

**UI must always:**
- [x] Route actions through Vienna Core
- [x] Use Vienna directives for side effects
- [x] Treat SSE as projection only
- [x] Derive state from Vienna Core + replay
- [x] Respect warrant requirements
- [x] Respect trading guard
- [x] Emit audit trail for operator actions

---

## Technology Stack

### Frontend

- **Framework:** React 18
- **Routing:** React Router v6
- **State:** Zustand
- **Styling:** Tailwind CSS
- **Data fetching:** Custom API client (already implemented)
- **Real-time:** SSE via `useViennaStream` hook
- **Build:** Vite

### Backend

- **Framework:** Express
- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Real-time:** SSE via EventSource
- **File storage:** Local filesystem + SQLite metadata
- **Vienna binding:** ViennaRuntimeService

---

## File Structure

```
vienna-core/
└── console/
    ├── server/
    │   └── src/
    │       ├── routes/
    │       │   ├── trading.ts (new)
    │       │   ├── fitness.ts (new)
    │       │   ├── classwork.ts (new)
    │       │   ├── files.ts (new)
    │       │   ├── commands.ts (new)
    │       │   └── system.ts (new)
    │       └── services/
    │           ├── fileArtifacts.ts (new)
    │           ├── commandParser.ts (new)
    │           └── conversationService.ts (new)
    └── client/
        └── src/
            ├── pages/
            │   ├── DashboardPage.tsx
            │   ├── TradingPage.tsx (new)
            │   ├── FitnessPage.tsx (new)
            │   ├── ClassworkPage.tsx (new)
            │   ├── FilesPage.tsx (new)
            │   ├── ObjectivesPage.tsx
            │   ├── ObjectiveDetailPage.tsx
            │   ├── AgentsPage.tsx
            │   ├── AgentDetailPage.tsx
            │   ├── ReplayPage.tsx
            │   └── SystemPage.tsx (new)
            ├── components/
            │   ├── layout/
            │   │   ├── AppShell.tsx
            │   │   ├── TopStatusBar.tsx
            │   │   ├── LeftNav.tsx
            │   │   ├── InspectionDrawer.tsx
            │   │   └── CommandBar.tsx (new)
            │   ├── trading/ (new)
            │   ├── fitness/ (new)
            │   ├── classwork/ (new)
            │   └── files/ (new)
            └── api/
                ├── trading.ts (new)
                ├── fitness.ts (new)
                ├── classwork.ts (new)
                ├── files.ts (new)
                └── commands.ts (new)
```

---

## Next Action

**Immediate priority:** Update backend API contract with new endpoints.

Then implement Stage 1 (Operator Shell Foundation) with:
1. Global layout system
2. Dashboard page wired to Vienna Core
3. SSE integration
4. Basic command bar

Once Stage 1 validates, proceed to Stage 2 (System Operations).

**All domain workspaces and file system can build on this foundation.**
