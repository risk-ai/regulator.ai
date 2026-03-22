# Vienna Operator Shell — Product Definition

**What it is:** A Vienna-native localhost web application that replaces OpenClaw as the primary operator UI.

**What it is not:** A generic dashboard, monitoring tool, or chatbot interface.

---

## Core Product Vision

The Vienna Operator Shell is a **custom OpenClaw for Vienna** — a tailored, cleaner, more functional interface specifically designed around your operational workflows.

**Primary goal:** Become the thing you open by default, eliminating the need to launch OpenClaw separately for normal operation.

**Secondary goal:** Make Vienna operations feel intentional, calm, and efficient rather than generic or cluttered.

---

## Product Positioning

### Vienna Operator Shell **is:**

- ✅ OpenClaw UI replacement tailored for Vienna
- ✅ Primary human-facing interface for Vienna operations
- ✅ Single unified website for all workflows
- ✅ Native Vienna chat + command surface
- ✅ Integrated domain workspaces (trading, fitness, classwork, files)
- ✅ Operator control room / personal AI OS

### Vienna Operator Shell **is not:**

- ❌ Generic admin dashboard
- ❌ Raw developer debugging tool
- ❌ Generic chatbot wrapper
- ❌ Second execution authority
- ❌ Replacement for Vienna Core governance

---

## OpenClaw Relationship

**Before Phase 8:**
```
Operator → OpenClaw UI → Vienna (via OpenClaw sessions)
```

**After Phase 8:**
```
Operator → Vienna Operator Shell → Vienna Core directly
```

**OpenClaw status:** May continue as internal subsystem, runtime surface, or adapter context, but operator does not need to open it separately.

**Key insight:** Shell replaces OpenClaw **frontend**, not Vienna Core **authority**.

---

## Authority Constraint (Hard)

Even though the website replaces OpenClaw as the UI, it **must not** create any bypass path.

**All side effects route through:**
```
Operator Shell
  → Console API
  → Vienna Core
  → Truth → Plan → Approval → Warrant → Envelope
  → Executor
  → Adapters
  → External systems
```

**Shell never:**
- Calls adapters directly
- Mutates queues directly
- Issues warrants directly
- Executes shell commands directly
- Bypasses executor
- Creates console-local mutation logic

---

## Product Shape: Three Layers

### 1. Daily Operator Shell (Primary Layer)

**Default landing page:** Dashboard (`/`)

**Purpose:** Daily operational control and Vienna interaction.

**Components:**
- **Vienna chat panel** (persistent, primary interaction)
- Global command input
- Top status bar
- Active objectives summary
- Recent executions timeline
- Decision inbox
- Dead letters queue
- Recent events feed
- Quick actions

**Usage pattern:** This is where operators spend 80% of their time.

**Feel:** Control room, personal AI OS, operator workbench.

---

### 2. Domain Workspaces (Focused Layer)

**Pages:**
- `/trading` — Trading operations workspace
- `/fitness` — Fitness planning workspace
- `/classwork` — Academic planning workspace
- `/files` — File management + artifact tracking

**Purpose:** Tailored workflow surfaces for specific operational domains.

**Design principle:** These should feel like **first-class surfaces inside Vienna**, not bolted-on add-ons.

**Integration:** Each workspace includes:
- Domain-specific status
- Domain-filtered objectives
- Domain-relevant commands
- Vienna chat context (understands current workspace)

**Usage pattern:** Switch to workspace when focusing on that domain, but chat still accessible.

---

### 3. Governance & Debugging (Inspection Layer)

**Pages:**
- `/objectives` — Objectives browser + detail
- `/agents` — Agent registry + reasoning outputs
- `/replay` — Event timeline explorer
- `/system` — Health, integrity, configuration

**Purpose:** Operational internals for inspection, debugging, recovery, and control.

**Usage pattern:** Occasional deep dives, incident investigation, system health checks.

**Feel:** Technical, detailed, audit-focused.

---

## Native Vienna Chat (Hard Requirement)

**Definition:** First-class conversational interface directly in the shell.

**Goal:** Primary way to communicate with Vienna, eliminating need to open OpenClaw separately.

**Constraint:** Preserves Vienna Core as sole authority for side effects.

---

### Chat Capabilities

**Informational queries:**
```
What is currently blocked?
Show me today's trading activity
What's on my classwork schedule tonight?
```

**System inspection:**
```
Explain why objective obj_442 failed
Show the causal chain for obj_441
What files are linked to this objective?
```

**Reasoning requests:**
```
Analyze this assignment and suggest a study plan
Review this trading strategy for risks
Explain what happened during the last integrity check
```

**Directive submission:**
```
Organize these files by project
Generate my classwork plan for tonight
Pause trading until tomorrow
```

**Control commands:**
```
Retry dead letter env_201
Cancel objective obj_442
Resume execution
```

**Approval workflows:**
```
[System presents T2 action requiring approval]
User: approved, proceed
[Vienna executes via governed pipeline]
```

---

### Chat Interaction Model

**Message classification:**

Every message is classified as:
1. **Informational query** → Vienna answers directly
2. **Reasoning request** → Vienna spawns reasoning session
3. **Structured directive** → Converted to Vienna directive, preview shown
4. **Control command** → Mapped to API action, confirmation if needed
5. **Approval-required action** → Approval UI presented, governed execution on confirm

**Response types:**

- **Direct answer** (for queries)
- **Reasoning output** (for analysis requests)
- **Directive preview** (for actions with side effects)
- **Approval prompt** (for T1/T2 actions)
- **Execution summary** (after work launches)
- **Links to artifacts** (objectives, envelopes, replay records)

---

### Chat UI Requirements

**Persistent chat panel on dashboard:**
- Right side of dashboard (or left if inspection drawer on right)
- Collapsible but visible by default
- Streaming responses
- Message history scrolls
- Classification badges on messages (query/reasoning/directive/command/approval)

**Optional full-page chat route:**
- `/chat` — dedicated chat interface
- Larger message area
- Full history visible
- Better for extended reasoning sessions

**Message features:**
- Markdown support
- Code blocks
- Links to objectives/envelopes/files
- Inline action buttons (approve/cancel/retry)
- Copy message button
- Message timestamps

**Streaming:**
- Real-time response streaming (SSE or WebSocket)
- Typing indicator
- Partial message display as it arrives

---

### Chat Architecture

**Endpoints:**

```
POST   /api/v1/chat/message
GET    /api/v1/chat/history
GET    /api/v1/chat/stream (SSE)
DELETE /api/v1/chat/clear
```

**Message flow:**

```
1. User types message
2. POST /api/v1/chat/message { message, context }
3. Server classifies message type
4. If informational:
   → Vienna answers directly
   → Stream response
5. If directive:
   → Generate directive preview
   → Show preview UI
   → User confirms
   → POST /api/v1/directives
   → Vienna creates objective
   → Return execution summary
6. If approval-required:
   → Generate approval prompt
   → Show approval UI
   → User approves/rejects
   → Vienna executes if approved
   → Return result
```

**Context awareness:**

Chat should understand:
- Current page (dashboard/trading/fitness/classwork/files)
- Selected objective/envelope/file
- Active domain workspace
- Recent commands

Example:
```
[User on /trading page]
User: What's the current guard state?
Vienna: Trading guard is active. Autonomous day 2/7. v1_baseline live.

[User on /files page, file selected]
User: What objectives reference this file?
Vienna: This file is referenced by 2 objectives:
  • obj_class_301 (Generate study outline)
  • obj_class_305 (Extract key cases)
```

---

### Chat vs Command Bar

**Chat panel (conversational):**
- Natural language
- Multi-turn reasoning
- Explains decisions
- Suggests actions
- Longer responses

**Command bar (structured):**
- Fast path for known commands
- Autocomplete
- Command history (↑/↓)
- Terse output

Both should coexist. Power users may prefer command bar for speed, but chat is the primary interface for most operations.

---

## Files as First-Class Artifacts

**Location:** `/files` workspace

**Capabilities:**

- **Upload files** → triggers Vienna ingestion objective
- **Browse files** → folder tree + list view
- **Organize/tag** → metadata management
- **Link to objectives** → bidirectional linking
- **View processing status** → pending/processing/complete/failed
- **Track derived artifacts** → show outputs from processing

**File upload flow:**

```
1. User uploads file via /files page
2. POST /api/v1/files/upload
3. Console creates Vienna directive: "Ingest and process [filename]"
4. Vienna creates objective
5. Processing envelope executes:
   - Analyzes file type
   - Extracts metadata
   - Suggests folder/tags
   - Links to relevant objectives
   - Generates derived artifacts
6. File metadata updated
7. SSE emits file.processed
8. UI shows results
```

**Integration with chat:**

```
User: Analyze this PDF and suggest a study plan
Vienna: I'll ingest the file and create a study plan.
[Creates file processing objective + study plan objective]
Vienna: File processed. Study plan created. See objective obj_class_401.
```

---

## Design Principles

### 1. Cleaner than OpenClaw

- Less clutter
- Stronger visual hierarchy
- More intentional layout
- Better use of whitespace
- Focused content areas

### 2. Operator-Focused

- Designed for daily operational use
- Not for developers or admins
- Tailored to your specific workflows
- Surfaces most-used actions prominently

### 3. Calmer Interface

- Avoid overwhelming data dumps
- Progressive disclosure (show more on demand)
- Clear status indicators
- Predictable navigation

### 4. Unified Experience

- One website, one assistant, one command surface
- Consistent layout across pages
- Persistent chat + status bar
- Smooth transitions between workspaces

### 5. Intentional Workflows

- Domain workspaces designed for specific tasks
- Actions clearly labeled
- Approval workflows explicit
- Execution feedback clear

### 6. Vienna-Native Concepts

- Objectives, directives, warrants as first-class
- Replay and audit trail integrated
- Risk tiers visible
- Trading guard prominent
- Envelope execution visible

### 7. Not Generic

- Avoid generic admin dashboard feel
- Avoid raw developer tooling aesthetic
- Avoid chatbot wrapper look
- Feels like a **control room**, not a form

---

## User Flow: Typical Day

### Morning

1. Open `http://localhost:3000` (Vienna Operator Shell)
2. Dashboard loads, shows:
   - Trading guard: active, day 2/7
   - 3 active objectives
   - 1 decision needs attention (dead letter)
   - Recent events: 2 trades placed overnight
3. Check Vienna chat:
   ```
   User: Show me overnight trading activity
   Vienna: 2 trades placed. 1 filled ($1.24 notional). 1 pending. P&L: $0.
   ```
4. Navigate to `/trading` workspace
5. Review strategy status
6. Return to dashboard

---

### Afternoon

1. Navigate to `/classwork` workspace
2. See upcoming deadline: Civ Pro memo (due Mar 15)
3. Chat with Vienna:
   ```
   User: Generate a study plan for tonight focusing on Civ Pro
   Vienna: I'll create a plan. Estimated 2 hours. See objective obj_class_401.
   ```
4. Objective created, processing
5. Few minutes later, plan ready
6. Review generated plan in `/classwork`

---

### Evening

1. Navigate to `/files` workspace
2. Upload PDF: "tax_cases.pdf"
3. Vienna chat:
   ```
   Vienna: File uploaded. Processing... 
   Vienna: Document type: legal cases. Suggested folder: classwork. 
   Vienna: Linked to assignment: Tax reading (due Mar 12).
   ```
4. File organized automatically

---

### Late Night

1. Dashboard shows dead letter: env_201 failed (3 attempts)
2. Click decision card
3. Inspection drawer opens with envelope detail
4. Vienna chat:
   ```
   User: Why did env_201 fail?
   Vienna: API timeout. Network issue. Safe to retry.
   ```
5. Click "Retry" button
6. Envelope requeued
7. Dashboard updates

---

## Implementation Priority

### Phase 1: Foundation + Chat (Week 1)

**Deliverables:**
- Global layout (status bar, nav)
- Dashboard page with **native Vienna chat panel**
- Chat backend (`POST /chat/message`, `GET /chat/stream`)
- Message classification
- Basic directive preview
- SSE integration

**Success criteria:** Can chat with Vienna in shell, issue commands, see execution summaries.

---

### Phase 2: System Operations (Week 2)

**Deliverables:**
- Objectives page + detail
- Inspection drawer
- Decision inbox
- Dead letter management
- Pause/resume controls
- Chat integration with objectives (link messages to objectives)

---

### Phase 3: Domain Workspaces (Week 3)

**Deliverables:**
- `/trading` workspace
- `/fitness` workspace
- `/classwork` workspace
- Domain-specific endpoints
- Chat context awareness (understands current workspace)

---

### Phase 4: Files System (Week 4)

**Deliverables:**
- `/files` workspace
- File upload + Vienna ingestion
- File browser
- Metadata + tagging
- Objective linking
- Chat integration with files (upload via chat, query files)

---

### Phase 5: Advanced Features (Week 5)

**Deliverables:**
- `/agents` page
- `/replay` explorer
- `/system` page
- Full-page chat route (`/chat`)
- Multi-turn reasoning sessions
- Approval workflows in chat

---

## Success Metrics

**Operator adoption:**
- [ ] Vienna Operator Shell becomes default UI (not OpenClaw)
- [ ] 80%+ of interactions happen through shell
- [ ] Chat becomes primary Vienna interface

**Workflow efficiency:**
- [ ] Domain workspaces reduce context switching
- [ ] File uploads create objectives automatically
- [ ] Chat eliminates need for manual command composition

**System reliability:**
- [ ] All actions route through Vienna Core (no bypass)
- [ ] Restart preserves state
- [ ] SSE keeps UI in sync

**UX quality:**
- [ ] Interface feels cleaner than OpenClaw
- [ ] Navigation is intuitive
- [ ] Operators prefer shell to terminal

---

## Architectural Invariant

**Governing principle:**

> **Vienna Operator Shell replaces OpenClaw as the UI, but never replaces Vienna Core as the authority.**

Every feature, every endpoint, every chat message classification must respect this boundary.

---

## OpenClaw Migration

**Short term:** Both OpenClaw and Vienna Operator Shell coexist

**Medium term:** Operators primarily use shell, OpenClaw rarely needed

**Long term:** Vienna Operator Shell is the only interface operators use

**Migration path:**
1. Build shell with feature parity
2. Add shell-specific features (domain workspaces, native chat)
3. Operators naturally migrate to shell
4. OpenClaw becomes background infrastructure

**No breaking changes to OpenClaw required.** Shell simply becomes a better interface.

---

## Next Steps

1. **Review product definition** (this document)
2. **Review chat architecture** (CHAT_ARCHITECTURE.md)
3. **Review UX principles** (UX_PRINCIPLES.md)
4. **Implement Stage 1 with chat** (revised STAGE_1_IMPLEMENTATION.md)
5. **Test dashboard + chat end-to-end**
6. **Iterate based on daily use**

---

**Vienna Operator Shell: Your custom OpenClaw, designed for the way you work.**
