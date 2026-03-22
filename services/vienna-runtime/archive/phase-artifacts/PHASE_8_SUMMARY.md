# Vienna Operator Shell — Phase 8 Complete Scope

**Vision:** Single unified website for operating Vienna across all domains.

**Constraint:** UI is control surface, not execution authority. All side effects route through Vienna Core governance.

---

## What Changed

**Before:** Phase 8 was a monitoring dashboard.

**Now:** Phase 8 is the **Vienna Operator Shell** — primary human interface to the entire Vienna system.

**Why:** Operators need a single place to interact with Vienna across trading, fitness, classwork, files, and system operations.

---

## Architecture Summary

```
Browser (Vienna Operator Shell)
  ↓ REST + SSE
Console Server (Express)
  ↓ Service Layer
Vienna Core Runtime
  ↓ Executor Pipeline
Adapters
  ↓
External Systems
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

## What the Operator Can Do

### Global Navigation

Single website at `http://localhost:3000` with:

- **Dashboard** — primary control page
- **Trading** — trading operations workspace
- **Fitness** — fitness planning workspace
- **Classwork** — academic planning workspace
- **Files** — file management + artifact tracking
- **Objectives** — Vienna objectives browser
- **Agents** — agent registry + reasoning
- **Replay** — event timeline explorer
- **System** — health, integrity, configuration

---

### Global Layout

Every page shares:

- **Top Status Bar** — system health, executor, queue, trading guard, integrity
- **Left Navigation** — domain + system sections
- **Main Workspace** — page-specific content
- **Inspection Drawer** — deep-dive detail panel (collapsible)
- **Global Command Bar** — Vienna conversation + structured commands

---

### Command Interface

**Two modes:**

1. **Structured commands** (fast path)
   ```
   pause execution
   show objective obj_442
   retry envelope env_201
   ```

2. **Vienna conversation** (natural language)
   ```
   Vienna, explain why obj_442 is blocked
   Vienna, generate my classwork plan for tonight
   Vienna, ingest these files and organize them
   ```

All commands become **Vienna directives**, not direct UI actions.

---

### Domain Workspaces

#### Trading (`/trading`)
- Trading guard state + autonomous window
- Active strategies (live/shadow/paused)
- Orders and positions
- Trading objectives
- Risk controls

**Actions:** Adjust constraints, pause trading, rebalance (all via Vienna directives)

---

#### Fitness (`/fitness`)
- Today's plan
- Weekly progress
- Generated recommendations
- Active objectives

**Actions:** Request plan, log workout, adjust routine (all via Vienna directives)

---

#### Classwork (`/classwork`)
- Upcoming deadlines
- Today's study plan
- Assignment tracking
- Active objectives

**Actions:** Request study plan, add assignment, mark complete (all via Vienna directives)

---

#### Files (`/files`)
- File browser (folder tree + list)
- File upload (triggers Vienna ingestion)
- Tagging and metadata
- Objective linking
- Processing status

**Upload flow:**
```
1. User uploads file
2. Vienna creates ingestion objective
3. Processing envelope executes (analyze, extract, organize)
4. File metadata updated
5. UI shows results
```

---

### System Pages

#### Objectives (`/objectives`)
- All Vienna objectives
- Filters (status, risk tier, domain)
- Objective detail view (tabs: summary, envelopes, causal chain, replay, warrant, risk)

---

#### Agents (`/agents`)
- Agent registry
- Status + budgets
- Recent tasks
- Reasoning outputs

**Actions:** Request reasoning (rate limited: 5 req/min)

---

#### Replay (`/replay`)
- Event timeline
- Filters (type, objective, envelope, date, actor)
- Event detail expansion

---

#### System (`/system`)
- Health status
- Integrity checks
- Configuration
- Safety controls (pause/resume, emergency override)

---

## File Artifact System

**Files become first-class Vienna artifacts.**

**Storage:** `~/.openclaw/workspace/files/`

**Metadata:**
- File ID, filename, upload date
- Size, MIME type
- Folder (inbox/classwork/trading/fitness)
- Tags
- Processing state (pending/processing/complete/failed)
- Linked objectives
- Processing results (document type, extracted text, suggested folder/tags)

**Processing types:**
- Documents (PDF, DOCX) → extract text, identify type, suggest folder
- Data files (CSV, JSON) → analyze schema, suggest domain
- Images (PNG, JPG) → extract metadata, OCR if needed
- Archives (ZIP, TAR) → list contents, offer batch processing

**Bidirectional linking:**
- File → shows linked objectives
- Objective → shows referenced files

---

## API Extensions

### New Endpoints (30+)

**Trading:**
- `GET /api/v1/trading/status`
- `GET /api/v1/trading/strategies`
- `GET /api/v1/trading/orders`
- `GET /api/v1/trading/positions`

**Fitness:**
- `GET /api/v1/fitness/plans`
- `POST /api/v1/fitness/plans`
- `GET /api/v1/fitness/logs`
- `POST /api/v1/fitness/logs`

**Classwork:**
- `GET /api/v1/classwork/assignments`
- `POST /api/v1/classwork/assignments`
- `GET /api/v1/classwork/plans`
- `POST /api/v1/classwork/plans`

**Files:**
- `GET /api/v1/files`
- `POST /api/v1/files/upload`
- `GET /api/v1/files/:fileId`
- `PUT /api/v1/files/:fileId`
- `DELETE /api/v1/files/:fileId`
- `GET /api/v1/files/:fileId/objectives`
- `POST /api/v1/files/:fileId/process`

**Commands:**
- `POST /api/v1/commands/parse`
- `POST /api/v1/commands/execute`

**Conversations:**
- `POST /api/v1/conversations/start`
- `POST /api/v1/conversations/:id/message`

**System:**
- `GET /api/v1/system/config`
- `PUT /api/v1/system/config`

**Agent Detail:**
- `GET /api/v1/agents/:id/tasks`
- `GET /api/v1/agents/:id/reasoning`

---

### New SSE Events (14+)

**Trading:**
- `trading.guard.updated`
- `trading.order.placed`
- `trading.order.filled`
- `trading.strategy.updated`

**Fitness:**
- `fitness.plan.created`
- `fitness.log.added`

**Classwork:**
- `classwork.assignment.created`
- `classwork.plan.generated`

**Files:**
- `file.uploaded`
- `file.processing`
- `file.processed`

**Agents:**
- `agent.task.started`
- `agent.task.completed`

---

## Implementation Stages

### Stage 1: Operator Shell Foundation (Week 1)
- ✅ Global layout (status bar, nav, drawer, command bar)
- ✅ Dashboard page
- ✅ SSE integration
- ✅ Dashboard bootstrap endpoint
- ✅ Basic command parser

**Status:** Ready to implement

---

### Stage 2: System Operations (Week 2)
- Objectives page + detail
- Execution inspection
- Decision inbox
- Dead letter management
- Pause/resume controls

---

### Stage 3: Domain Workspaces (Week 3)
- Trading workspace + endpoints
- Fitness workspace + endpoints
- Classwork workspace + endpoints
- Domain-filtered objectives

---

### Stage 4: Files System (Week 4)
- Files page
- File upload + Vienna ingestion
- File browser (folders + list)
- File metadata + tagging
- Objective linking
- Processing status tracking

---

### Stage 5: Advanced Features (Week 5)
- Agents page + detail
- Replay explorer
- Vienna conversation mode
- Emergency override UI
- System configuration page

---

## Governance Enforcement

**UI must never:**
- Import adapter modules
- Mutate queue directly
- Issue warrants directly
- Execute shell commands directly
- Bypass executor
- Bypass Vienna Core
- Synthesize events Vienna Core doesn't recognize

**UI must always:**
- Route actions through Vienna Core
- Use Vienna directives for side effects
- Treat SSE as projection only
- Derive state from Vienna Core + replay
- Respect warrant requirements
- Respect trading guard
- Emit audit trail for operator actions

---

## Technology Stack

**Frontend:**
- React 18 + TypeScript
- React Router v6
- Zustand (state management)
- Tailwind CSS
- Vite

**Backend:**
- Express + TypeScript
- SSE (Server-Sent Events)
- Node.js 18+
- SQLite (file metadata)
- Local filesystem (file storage)

---

## Key Documents

1. **OPERATOR_SHELL_ARCHITECTURE.md** — Full architecture + page specs + layout system
2. **API_CONTRACT_EXTENDED.md** — Complete API contract with all new endpoints
3. **STAGE_1_IMPLEMENTATION.md** — Week 1 implementation guide (ready to code)
4. **IMPLEMENTATION_SUMMARY.md** — Original Phase 8 skeleton status

---

## Success Criteria

Phase 8 is complete when:

- [ ] Operator can interact with Vienna through single website
- [ ] All domain workspaces functional (trading, fitness, classwork)
- [ ] File upload creates Vienna objectives and processes files
- [ ] Command interface accepts structured commands + Vienna conversation
- [ ] All actions route through Vienna Core (no direct mutations)
- [ ] SSE keeps UI in sync with Vienna state
- [ ] Restart preserves state consistency
- [ ] Emergency override follows governance rules
- [ ] Files link to objectives bidirectionally
- [ ] Agents page shows reasoning outputs
- [ ] Replay explorer shows full event timeline

---

## Immediate Next Steps

1. **Read Stage 1 Implementation Guide** (`STAGE_1_IMPLEMENTATION.md`)
2. **Wire Vienna Core to ViennaRuntimeService** (implement `bootstrapDashboard()`)
3. **Build global layout components** (AppShell, TopStatusBar, LeftNav, CommandBar)
4. **Build dashboard page** (objectives, decisions, stats)
5. **Test end-to-end** (dashboard loads, SSE updates, command bar works)

Once Stage 1 validates, proceed to Stage 2.

---

## Architecture Validation

**Authority boundary preserved:**
```
✅ Console → ViennaRuntimeService → Vienna Core → Executor → Adapters
❌ Console → Direct adapter mutation
```

**Trading protection maintained:**
- Trading guard state visible in status bar
- Emergency override governed (requires Metternich approval)
- Autonomous window displayed

**Warrant visibility:**
- Every objective shows warrant summary
- Truth binding, approval status, trading guard verdict displayed

**Phase 7.2 compliant:**
- Agents cannot invoke console routes
- Console cannot bypass executor
- All mutations require Vienna Core authorization
- Emergency override only bypasses trading guard preflight (not executor/warrant/adapter)

---

## Questions?

**Clarifications needed:**
1. Should Vienna Core expose domain-specific services (TradingService, FitnessService) or should console derive domain state from objectives + replay?
2. Should files be stored in Vienna Core or console-local filesystem with metadata only?
3. Should conversation mode create real agent sessions or use Vienna's command routing?

**Recommendations:**
1. Domain state should derive from Vienna Core (no console-local synthesis)
2. Files stored locally, metadata in SQLite, processing through Vienna objectives
3. Conversation mode routes through Vienna's directive system, not direct agent spawning

---

**Phase 8 scope expansion complete. Ready for Stage 1 implementation.**
