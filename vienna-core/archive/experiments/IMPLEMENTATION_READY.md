# Vienna Operator Shell — Implementation Ready

**Date:** March 11, 2026  
**Status:** ✅ Architecture complete, ready for Week 1 implementation

---

## What We Built (Architecture Phase)

**10 comprehensive documents** defining Vienna Operator Shell as autonomous OpenClaw replacement:

### Core Architecture (67KB total)

1. **PRODUCT_DEFINITION.md** (15KB) — Product vision, OpenClaw replacement framing
2. **OPERATOR_SHELL_ARCHITECTURE.md** (25KB) — Full system architecture, 11 pages, 5 stages
3. **CHAT_ARCHITECTURE.md** (20KB) — Native chat with 6 message types
4. **PROVIDER_ARCHITECTURE.md** (18KB) — Model provider abstraction + Anthropic integration
5. **UX_PRINCIPLES.md** (16KB) — Design guidelines (cleaner than OpenClaw)

### Implementation Guides (44KB total)

6. **API_CONTRACT_EXTENDED.md** (18KB) — 30+ endpoints, domain workspaces
7. **STAGE_1_IMPLEMENTATION.md** (21KB) — Week 1 detailed guide with code examples
8. **STAGE_1_CHECKLIST.md** (9KB) — Day-by-day implementation checklist

### Summaries (34KB total)

9. **PHASE_8_AUTONOMOUS.md** (12KB) — Autonomous architecture summary
10. **PHASE_8_FINAL.md** (11KB) — Complete Phase 8 definition
11. **PHASE_8_SUMMARY.md** (11KB) — High-level overview

**Total:** 111KB of architecture documentation

---

## Key Architectural Decisions

### 1. OpenClaw UI Replacement (Not Just Console)

**Before:** Operator console for monitoring

**After:** **Primary operator UI** that replaces OpenClaw for daily use

**Result:** Single website at `http://localhost:3000` becomes default operator interface

---

### 2. Native Vienna Chat (First-Class Feature)

**Location:** Persistent panel on dashboard (right column)

**Capabilities:**
- Informational queries ("What's blocked?")
- System inspection ("Explain why obj_442 failed")
- Reasoning requests ("Analyze this assignment")
- Directive submission ("Organize these files by project")
- Control commands ("Pause execution")
- Approval workflows (T2 actions)
- **Recovery directives ("Vienna, OpenClaw appears down. Restore connectivity.")**

**Message types:** 6 (informational, reasoning, directive, command, approval, recovery)

---

### 3. Model Provider Abstraction (Critical Improvement)

**Problem:** OpenClaw was hidden single point of failure

**Solution:** Provider abstraction layer with direct Anthropic integration

**Architecture:**
```
Chat → Provider Manager → Anthropic | OpenClaw | Local
```

**Failover:**
```
Anthropic (primary) → OpenClaw (fallback) → Simple keyword classification (fallback)
```

**Result:** Vienna autonomous, no longer depends on OpenClaw for LLM access

---

### 4. Service Recovery + Self-Healing

**Capability:** Vienna can detect service failures and create recovery objectives

**Example flow:**
```
User: "Vienna, OpenClaw appears down. Restore connectivity."
→ Message classified as 'recovery'
→ Vienna creates recovery objective
→ Executor runs service adapter (restart OpenClaw)
→ Service restored
→ Vienna reports: "✓ OpenClaw gateway restored successfully."
```

**Constraint:** Recovery still governed (objective → executor → adapter)

---

### 5. Domain Workspaces (Tailored UI)

**Pages:**
- `/trading` — Trading operations
- `/fitness` — Fitness planning
- `/classwork` — Academic planning
- `/files` — File management + artifact tracking

**Design:** First-class surfaces inside Vienna, not bolted-on add-ons

---

## Stage 1 Scope (Week 1)

**Deliverables:**

1. ✅ Provider abstraction layer (`ModelProvider` interface)
2. ✅ Anthropic provider (direct Claude API integration)
3. ✅ Provider manager (health checking + failover)
4. ✅ Chat backend (6 message types, recovery directive)
5. ✅ Chat frontend (ChatPanel component with provider badge)
6. ✅ Global layout (status bar, nav, drawer)
7. ✅ Dashboard (2-column: objectives + chat)
8. ✅ SSE integration (real-time updates)
9. ✅ Provider health endpoint (`/api/v1/providers`)

**Success criteria:**

- [ ] Chat works with Anthropic provider
- [ ] Failover tested (Anthropic down → OpenClaw fallback)
- [ ] All 6 message types classified correctly
- [ ] Commands execute (pause/resume)
- [ ] Provider metadata visible in UI
- [ ] All actions route through Vienna Core

---

## Implementation Timeline

### Week 1: Foundation + Chat + Providers

**Day 1-2:** Provider abstraction + Anthropic integration  
**Day 3-4:** Chat backend + recovery directive  
**Day 5:** Global layout + dashboard

---

### Week 2: System Operations

- Objectives page + detail
- Execution inspection
- Decision inbox
- Dead letter management
- OpenClaw service monitoring
- `/system/services` page

---

### Week 3: Domain Workspaces

- `/trading` workspace
- `/fitness` workspace
- `/classwork` workspace
- Domain-specific endpoints
- Chat context awareness

---

### Week 4: Files System

- `/files` workspace
- File upload + Vienna ingestion
- File browser (folders + list)
- Metadata + tagging
- Objective linking

---

### Week 5: Advanced Features

- `/agents` page
- `/replay` explorer
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
- Node.js 18+
- SSE (Server-Sent Events)
- SQLite (chat history + file metadata)

**Providers:**
- Anthropic SDK (`@anthropic-ai/sdk`)
- OpenClaw Gateway (fallback)

---

## Configuration

**Environment variables:**

```bash
# Anthropic provider
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219

# OpenClaw provider (fallback)
OPENCLAW_GATEWAY_URL=http://localhost:18789

# Provider settings
MODEL_PROVIDER_PRIMARY=anthropic
MODEL_PROVIDER_FALLBACK=anthropic,openclaw

# Vienna Core
VIENNA_WORKSPACE=/home/maxlawai/.openclaw/workspace

# Console server
PORT=3000
CORS_ORIGIN=http://localhost:3000
```

---

## File Structure

```
vienna-core/
├── lib/
│   └── providers/
│       ├── index.ts
│       ├── types.ts
│       ├── manager.ts
│       ├── anthropic/
│       │   ├── index.ts
│       │   └── client.ts
│       └── openclaw/
│           ├── index.ts
│           └── client.ts (stub)
└── console/
    ├── server/
    │   └── src/
    │       ├── routes/
    │       │   ├── chat.ts
    │       │   ├── providers.ts
    │       │   └── ... (others)
    │       └── services/
    │           ├── chatService.ts
    │           └── viennaRuntime.ts
    └── client/
        └── src/
            ├── components/
            │   ├── layout/
            │   │   ├── AppShell.tsx
            │   │   ├── TopStatusBar.tsx
            │   │   ├── LeftNav.tsx
            │   │   └── InspectionDrawer.tsx
            │   └── chat/
            │       ├── ChatPanel.tsx
            │       └── ChatMessage.tsx
            ├── pages/
            │   └── DashboardPage.tsx
            └── api/
                ├── chat.ts
                └── providers.ts
```

---

## API Endpoints Summary

### Core (Existing)

```
GET  /api/v1/status
GET  /api/v1/dashboard
GET  /api/v1/objectives
GET  /api/v1/execution/*
POST /api/v1/execution/pause
POST /api/v1/execution/resume
GET  /api/v1/stream (SSE)
```

### Chat (New — Stage 1)

```
POST /api/v1/chat/message
GET  /api/v1/chat/history
```

### Providers (New — Stage 1)

```
GET  /api/v1/providers
POST /api/v1/providers/test
```

### Services (Week 2)

```
GET  /api/v1/system/services
POST /api/v1/system/services/:service/restart
```

### Domains (Week 3)

```
GET  /api/v1/trading/*
GET  /api/v1/fitness/*
GET  /api/v1/classwork/*
```

### Files (Week 4)

```
GET    /api/v1/files
POST   /api/v1/files/upload
GET    /api/v1/files/:fileId
PUT    /api/v1/files/:fileId
DELETE /api/v1/files/:fileId
```

---

## Governance Enforcement

**UI must never:**
- Import adapter modules
- Mutate queues directly
- Issue warrants directly
- Execute shell commands directly
- Bypass executor
- Create console-local mutation logic

**UI must always:**
- Route actions through Vienna Core
- Use Vienna directives for side effects
- Treat SSE as projection only
- Derive state from Vienna Core + replay
- Respect warrant requirements
- Respect trading guard
- Emit audit trail

**Governing principle:**
> **Vienna Operator Shell replaces OpenClaw as the UI, but never replaces Vienna Core as the authority.**

---

## Quick Start (Day 1)

### 1. Set up environment

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
export MODEL_PROVIDER_PRIMARY=anthropic
```

---

### 2. Create provider structure

```bash
cd vienna-core
mkdir -p lib/providers/anthropic
mkdir -p lib/providers/openclaw
```

---

### 3. Install dependencies

```bash
npm install @anthropic-ai/sdk
```

---

### 4. Implement provider interface

Copy from `PROVIDER_ARCHITECTURE.md`:
- `ModelProvider` interface
- `ProviderManager` class
- `AnthropicProvider` class

---

### 5. Test Anthropic connection

```typescript
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const status = await provider.getStatus();
console.log(status); // { name: 'anthropic', healthy: true, ... }
```

---

## Critical Tests (End of Week 1)

### Chat Functional
- [ ] Type "What's blocked?" → Get response
- [ ] Type "pause execution" → Execution pauses
- [ ] Type "resume execution" → Execution resumes
- [ ] Type "Vienna, restart OpenClaw" → Recovery directive recognized

### Provider Abstraction
- [ ] Anthropic primary, responds correctly
- [ ] Provider metadata in responses
- [ ] Health check works

### Failover (Critical)
- [ ] Stop Anthropic → fallback to OpenClaw (or keyword classification)
- [ ] All unavailable → graceful degradation
- [ ] Commands still work without LLM

### Authority Boundary
- [ ] All commands route through Vienna Core
- [ ] No direct mutations from chat
- [ ] Audit trail for all actions
- [ ] Warrants still required for T1/T2

### UI
- [ ] Dashboard loads on `http://localhost:3000`
- [ ] Status bar shows live data
- [ ] Chat panel visible on dashboard
- [ ] Provider badge shows on messages
- [ ] SSE updates UI in real time

---

## Success Metrics

### Week 1 Complete When:
- [ ] Chat works with Anthropic
- [ ] Failover tested and working
- [ ] Provider health visible
- [ ] All 6 message types classified
- [ ] Commands execute correctly
- [ ] Dashboard renders correctly
- [ ] No console errors
- [ ] All actions governed

---

## Document Index

### Start Here

1. **IMPLEMENTATION_READY.md** (this file) — Quick reference
2. **STAGE_1_CHECKLIST.md** — Day-by-day checklist
3. **STAGE_1_IMPLEMENTATION.md** — Detailed guide with code

### Architecture

4. **PRODUCT_DEFINITION.md** — Product vision
5. **PROVIDER_ARCHITECTURE.md** — Provider system design
6. **CHAT_ARCHITECTURE.md** — Chat system design
7. **OPERATOR_SHELL_ARCHITECTURE.md** — Full system architecture
8. **UX_PRINCIPLES.md** — Design guidelines

### Reference

9. **API_CONTRACT_EXTENDED.md** — Complete API reference
10. **PHASE_8_AUTONOMOUS.md** — Autonomous architecture summary
11. **PHASE_8_FINAL.md** — Complete Phase 8 definition

---

## Help & Troubleshooting

### Anthropic API not working?

```bash
# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "ping"}]
  }'
```

---

### Provider manager not finding providers?

Check registration:
```typescript
console.log(providerManager.providers.size); // Should be > 0
const status = await providerManager.getAllStatuses();
console.log(status); // Should show registered providers
```

---

### Chat not responding?

1. Check provider health: `GET /api/v1/providers`
2. Check Vienna Core logs
3. Check console server logs
4. Verify environment variables set

---

## Final Checklist

**Before starting implementation:**

- [ ] All 11 architecture documents reviewed
- [ ] Product vision clear (OpenClaw replacement)
- [ ] Provider abstraction understood
- [ ] Stage 1 scope clear (chat + providers)
- [ ] Environment variables set
- [ ] Anthropic API key obtained
- [ ] Development environment ready

**Ready to implement when all checked.**

---

**Vienna Operator Shell: Autonomous AI operating environment.**

**Architecture phase complete. Week 1 implementation starts now.**
