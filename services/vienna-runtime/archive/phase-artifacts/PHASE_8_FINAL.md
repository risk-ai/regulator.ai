# Vienna Operator Shell — Phase 8 Final Definition

**Date:** March 11, 2026  
**Status:** Ready for implementation

---

## Product Vision

**Vienna Operator Shell** is a Vienna-native localhost web application that replaces OpenClaw as the primary operator UI.

**Core principle:**
> **Shell replaces OpenClaw as the UI, but never replaces Vienna Core as the authority.**

---

## What Changed (Final Refinement)

### Before
- Phase 8 was "operator console"
- Monitoring dashboard
- Secondary to OpenClaw

### After
- Phase 8 is "Vienna Operator Shell"
- **OpenClaw UI replacement**
- **Primary operator interface**
- **Native Vienna chat** as first-class feature
- Tailored to specific workflows (trading, fitness, classwork, files)
- Cleaner, calmer, more intentional UX

---

## Key Features

### 1. Native Vienna Chat (Hard Requirement)

**Definition:** First-class conversational interface directly in the shell.

**Location:** Persistent panel on dashboard (right column), collapsible on all pages.

**Capabilities:**
- Informational queries ("What's blocked?")
- System inspection ("Explain why obj_442 failed")
- Reasoning requests ("Analyze this assignment")
- Directive submission ("Organize these files by project")
- Control commands ("Pause execution")
- Approval workflows (T2 actions)

**Message classification:**
1. Informational → Vienna answers directly
2. Reasoning → Spawns reasoning session
3. Directive → Shows preview, requires confirmation
4. Command → Executes immediately (or confirms if destructive)
5. Approval → Shows approval prompt (T2 actions)

**Authority constraint:** All side effects route through Vienna Core governance.

---

### 2. Global Layout System

**Persistent chrome (every page):**
- Top status bar (system health, executor, queue, trading guard)
- Left navigation (dashboard, domains, system)
- Inspection drawer (right side, collapsible)
- Vienna chat (dashboard default, accessible from all pages)

---

### 3. Domain Workspaces

**Tailored pages:**
- `/trading` — Trading operations (guard state, strategies, orders)
- `/fitness` — Fitness planning (plans, logs, recommendations)
- `/classwork` — Academic planning (assignments, deadlines, study plans)
- `/files` — File management (upload, browse, organize, link to objectives)

**Design principle:** First-class surfaces inside Vienna, not bolted-on add-ons.

---

### 4. Governance & Debugging

**System pages:**
- `/objectives` — Objectives browser + detail
- `/agents` — Agent registry + reasoning outputs
- `/replay` — Event timeline explorer
- `/system` — Health, integrity, configuration

---

### 5. Files as First-Class Artifacts

**Upload flow:**
```
1. User uploads file
2. Vienna creates ingestion objective
3. Processing envelope executes (analyze, extract, organize)
4. File metadata updated
5. UI shows results
```

**Features:**
- Bidirectional objective linking
- Tagging and metadata
- Processing status tracking
- Folder organization

---

## Architecture

```
Browser (Vienna Operator Shell)
  ↓ REST + SSE
Console Server (Express)
  ↓ Service Layer (ViennaRuntimeService)
Vienna Core Runtime
  ↓ Truth → Plan → Warrant → Envelope
  ↓ Executor
  ↓ Adapters
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

## Implementation Stages

### Stage 1: Operator Shell Foundation (Week 1) ✅ READY

**Deliverables:**
- Global layout (status bar, nav, drawer)
- Dashboard page
- SSE integration
- **Native Vienna chat panel** (primary new feature)
- Message classification
- Informational queries
- Control commands (pause/resume)

**Success:** Can chat with Vienna in shell, issue commands, see execution summaries.

---

### Stage 2: System Operations (Week 2)

**Deliverables:**
- Objectives page + detail
- Execution inspection
- Decision inbox
- Dead letter management
- Pause/resume controls
- Chat integration with objectives

---

### Stage 3: Domain Workspaces (Week 3)

**Deliverables:**
- `/trading` workspace
- `/fitness` workspace
- `/classwork` workspace
- Domain-specific endpoints
- Chat context awareness (understands current workspace)

---

### Stage 4: Files System (Week 4)

**Deliverables:**
- `/files` workspace
- File upload + Vienna ingestion
- File browser (folders + list)
- Metadata + tagging
- Objective linking
- Chat integration with files

---

### Stage 5: Advanced Features (Week 5)

**Deliverables:**
- `/agents` page
- `/replay` explorer
- `/system` page
- Full-page chat route (`/chat`)
- Multi-turn reasoning sessions
- Approval workflows in chat
- Directive preview modal
- Emergency override UI

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
- SQLite (chat history + file metadata)
- Local filesystem (file storage)

---

## API Summary

### Core Endpoints (Existing)

```
GET  /api/v1/status
GET  /api/v1/dashboard
GET  /api/v1/objectives
GET  /api/v1/execution/*
POST /api/v1/execution/pause
POST /api/v1/execution/resume
GET  /api/v1/stream (SSE)
```

### Chat Endpoints (New — Stage 1)

```
POST /api/v1/chat/message
GET  /api/v1/chat/history
```

### Domain Endpoints (Stage 3)

```
GET  /api/v1/trading/*
GET  /api/v1/fitness/*
GET  /api/v1/classwork/*
```

### File Endpoints (Stage 4)

```
GET    /api/v1/files
POST   /api/v1/files/upload
GET    /api/v1/files/:fileId
PUT    /api/v1/files/:fileId
DELETE /api/v1/files/:fileId
```

---

## UX Principles

### 1. Cleaner than OpenClaw
- Stronger visual hierarchy
- Progressive disclosure
- Better whitespace
- Focused content areas

### 2. Operator-Focused
- Designed for daily use
- Tailored to specific workflows
- Most-used actions prominent

### 3. Calmer Interface
- Avoid overwhelming data dumps
- Subtle status indicators
- Purposeful color use
- Clear but calm error states

### 4. Unified Experience
- One website, consistent patterns
- Persistent chat + status bar
- Smooth transitions

### 5. Intentional Workflows
- Actions clearly labeled
- Obvious outcomes
- Reversible when possible
- Explicit risk levels

### 6. Vienna-Native Concepts
- Objectives, directives, warrants as first-class
- Risk tiers visible
- Trading guard prominent
- Replay integrated

### 7. Not Generic
- Custom, purposeful design
- Control room aesthetic
- Not admin dashboard template

---

## OpenClaw Migration Path

**Short term:** Both coexist

**Medium term:** Operators primarily use shell

**Long term:** Shell is the only interface operators use

**Migration:**
1. Build shell with feature parity
2. Add shell-specific features (chat, domain workspaces)
3. Operators naturally migrate
4. OpenClaw becomes background infrastructure

**No breaking changes required.** Shell simply becomes a better interface.

---

## Success Metrics

### Operator Adoption
- [ ] Vienna Operator Shell becomes default UI (not OpenClaw)
- [ ] 80%+ of interactions through shell
- [ ] Chat becomes primary Vienna interface
- [ ] OpenClaw rarely opened

### Workflow Efficiency
- [ ] Domain workspaces reduce context switching
- [ ] File uploads create objectives automatically
- [ ] Chat eliminates manual command composition

### System Reliability
- [ ] All actions route through Vienna Core
- [ ] Restart preserves state
- [ ] SSE keeps UI in sync
- [ ] No bypass paths

### UX Quality
- [ ] Interface feels cleaner than OpenClaw
- [ ] Navigation intuitive
- [ ] Operators prefer shell to terminal
- [ ] Daily use feels natural

---

## Governance Enforcement

**UI must never:**
- Import adapter modules
- Mutate queues directly
- Issue warrants directly
- Execute shell commands directly
- Bypass executor
- Synthesize events Vienna Core doesn't recognize

**UI must always:**
- Route actions through Vienna Core
- Use Vienna directives for side effects
- Treat SSE as projection only
- Derive state from Vienna Core + replay
- Respect warrant requirements
- Respect trading guard
- Emit audit trail

---

## Key Documents

### Product & Architecture
- **PRODUCT_DEFINITION.md** — Complete product vision
- **OPERATOR_SHELL_ARCHITECTURE.md** — Full system architecture
- **CHAT_ARCHITECTURE.md** — Native Vienna chat design
- **UX_PRINCIPLES.md** — Design guidelines

### API & Implementation
- **API_CONTRACT_EXTENDED.md** — Complete API contract (30+ endpoints)
- **STAGE_1_IMPLEMENTATION.md** — Week 1 guide (READY TO CODE)
- **IMPLEMENTATION_SUMMARY.md** — Original Phase 8 skeleton status

### Reference
- **README.md** — Original Phase 8 docs
- **PHASE_8_SUMMARY.md** — High-level overview

---

## Immediate Next Steps

### Week 1 (Stage 1)

**Priority: Get chat working**

1. **Backend:**
   - Wire Vienna Core to `ViennaRuntimeService.bootstrapDashboard()`
   - Implement `/api/v1/chat/message` endpoint
   - Implement message classification
   - Implement informational query handler
   - Implement command handler (pause/resume)

2. **Frontend:**
   - Build global layout (AppShell, TopStatusBar, LeftNav)
   - Build dashboard page
   - Build ChatPanel component
   - Integrate SSE stream
   - Test end-to-end

3. **Validation:**
   - Dashboard loads from single HTTP request
   - Chat panel visible on dashboard
   - Messages classify correctly
   - Commands execute (pause/resume)
   - All actions route through Vienna Core

---

## Critical Reminders

### Authority Boundary (Hard)

**Governing principle:**
> **Vienna Operator Shell replaces OpenClaw as the UI, but never replaces Vienna Core as the authority.**

Every feature must respect this boundary.

### Chat is Primary Interface

Chat is not a "nice-to-have" or "later feature."

**Chat is the primary way operators interact with Vienna.**

Stage 1 must include functional chat, even if limited vocabulary.

### OpenClaw Replacement Framing

This is not "just a dashboard."

This is **the thing operators open by default** instead of OpenClaw.

Design accordingly:
- Make it feel tailored to your workflows
- Make it cleaner than OpenClaw
- Make it the obvious choice

---

## Questions Resolved

### Q: Should chat be Stage 1 or later?
**A:** Stage 1. Chat is a hard requirement for the product vision.

### Q: How much chat functionality in Stage 1?
**A:** Basic but functional:
- Message classification
- Informational queries
- Control commands (pause/resume)
- Command execution audit trail

### Q: Should we build command bar too?
**A:** No. Chat replaces command bar as primary interface. Command bar can be added later for power users, but chat is the focus.

### Q: Is this still a "console"?
**A:** No. It's an **Operator Shell** — Vienna's native UI, not a monitoring console.

### Q: Does OpenClaw need to be removed?
**A:** No. It can stay as background infrastructure. Operators just won't need to open it.

---

## Final Validation Questions

Before starting implementation, verify:

- [ ] Is the product vision clear? (OpenClaw replacement, not dashboard)
- [ ] Is chat architecture defined? (Classification, handling, UI)
- [ ] Is Stage 1 scope clear? (Layout + dashboard + SSE + **chat**)
- [ ] Is authority boundary clear? (Shell is UI, not authority)
- [ ] Are UX principles clear? (Cleaner, calmer, operator-focused)
- [ ] Is implementation guide ready? (Stage 1 document ready to code)

**If all yes → proceed to Stage 1 implementation.**

---

**Vienna Operator Shell: Your custom OpenClaw, designed for the way you work.**

**Status: Ready for Week 1 implementation.**
