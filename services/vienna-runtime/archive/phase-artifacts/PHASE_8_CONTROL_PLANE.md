# Phase 8: Control Plane Evolution

**Date:** 2026-03-11 20:41 EDT  
**Status:** 🔨 PLANNING  
**Prerequisite:** Phase 2 Complete ✅  

---

## Vision

Vienna Phase 8 transforms the operator shell from **file editor with commands** into a **full-spectrum control plane** for governed AI execution.

**Core principle:** Operator maintains situational awareness and intervention authority over all Vienna activities.

---

## Current State

**What exists (Phase 2 baseline):**
- ✅ Files Workspace (browse, edit, upload)
- ✅ Command Bar (attach files, submit objectives)
- ✅ Envelope Visualizer (lineage tree, basic status)
- ✅ Authentication (password-protected access)
- ✅ Backend execution (planner → envelopes → actions)

**What's missing:**
- ❌ Real-time execution visibility (what's running NOW)
- ❌ System health dashboard
- ❌ Active objective monitoring
- ❌ Intervention controls (pause/cancel/retry)
- ❌ Agent activity tracking (Talleyrand/Metternich/Castlereagh visibility)
- ❌ Audit trail browser
- ❌ Cost/usage tracking
- ❌ Multi-session orchestration view

---

## Phase 8 Scope

### 8A: Real-Time Execution Dashboard

**Goal:** Operator sees what Vienna is doing RIGHT NOW

**Features:**
- Active objectives panel (queued, executing, completed today)
- Live envelope status (3/5 complete, current step)
- Agent activity feed (which agent, what task, model used)
- Recent completions log (last 10 objectives)
- Error/warning alerts (failed envelopes, blocked tasks)

**UI location:** New top-level page `/execution`

**Data source:** WebSocket from Vienna Core (execution events)

---

### 8B: Intervention Controls

**Goal:** Operator can pause, cancel, retry, or override Vienna decisions

**Features:**
- Pause button (halt new envelope execution, finish current)
- Cancel objective (stop all child envelopes)
- Retry failed envelope (resubmit with same parameters)
- Override gate (T2 approval UI for blocked objectives)
- Emergency stop (kill all execution, mark for review)

**UI location:** Execution dashboard + visualizer context menu

**Backend:** Command API endpoints (pause/cancel/retry/override)

---

### 8C: System Health Monitor

**Goal:** Operator knows Vienna runtime health at a glance

**Features:**
- Services status (Vienna Core, Planner, Executor, Agents)
- Queue depth (pending objectives, envelope backlog)
- Resource usage (CPU, memory, disk, API rate limits)
- Trading guard status (autonomous window, limits, blockers)
- Cron job health (last run, next scheduled, failures)
- OpenClaw gateway connectivity

**UI location:** Header status bar + dedicated `/health` page

**Data source:** Polling `/api/v1/system/health` endpoint

---

### 8D: Agent Orchestration View

**Goal:** Operator sees which agents are active and what they're doing

**Features:**
- Agent session list (Talleyrand, Metternich, Castlereagh, Hardenberg, Alexander)
- Current task per agent (if active)
- Recent completions per agent
- Cost breakdown per agent (model usage, token counts)
- Delegation chain visualization (Vienna → Talleyrand → subtask)

**UI location:** New top-level page `/agents`

**Data source:** `sessions_list` + enhanced metadata from spawns

---

### 8E: Audit Trail Browser

**Goal:** Operator can inspect historical decisions and execution

**Features:**
- Objective search (by date, command type, status, attachments)
- Envelope timeline (step-by-step execution with timestamps)
- Warrant browser (view issued warrants, approvals, conditions)
- Truth snapshot viewer (what sources informed decision)
- Verification results (what was checked, pass/fail)

**UI location:** New top-level page `/audit`

**Data source:** Backend audit log queries (structured JSON logs)

---

### 8F: Cost & Usage Tracking

**Goal:** Operator understands Vienna resource consumption

**Features:**
- Daily cost breakdown (by model, by agent, by objective type)
- Token usage graphs (input/output over time)
- Model distribution (% Haiku vs Sonnet vs Opus)
- Efficiency metrics (cost per objective, tokens per envelope)
- Budget alerts (approaching limits, overage warnings)

**UI location:** New top-level page `/usage`

**Data source:** Cost tracking service (log aggregation + OpenRouter API)

---

### 8G: Command Palette

**Goal:** Fast keyboard-driven operator actions

**Features:**
- Quick command launcher (Cmd+K / Ctrl+K)
- Jump to file, objective, agent, envelope
- Execute common actions (refresh, pause, cancel)
- Search audit logs
- Open health dashboard, usage stats

**UI location:** Overlay modal, accessible from any page

**Implementation:** React portal + keyboard shortcuts

---

## Implementation Order

**Recommended sequence (6-8 weeks):**

### Week 1-2: Real-Time Execution Dashboard (8A)
- Backend: WebSocket server for execution events
- Frontend: Active objectives panel, live envelope status
- Integration: Planner/Executor emit events on state changes
- **Deliverable:** Operator sees what's executing in real-time

### Week 3: Intervention Controls (8B)
- Backend: Command API (pause/cancel/retry/override)
- Frontend: Action buttons in execution dashboard + visualizer
- Safety: Warrant checks, audit trail for interventions
- **Deliverable:** Operator can stop/retry failed work

### Week 4: System Health Monitor (8C)
- Backend: Health check aggregator endpoint
- Frontend: Status bar + dedicated health page
- Monitoring: Services, queue depth, resource usage, trading guard
- **Deliverable:** Operator knows Vienna is healthy (or not)

### Week 5: Agent Orchestration View (8D)
- Backend: Enhanced session metadata from spawns
- Frontend: Agent activity page, delegation trees
- Cost tracking: Per-agent model usage
- **Deliverable:** Operator sees which agents are working

### Week 6: Audit Trail Browser (8E)
- Backend: Audit log query API (filter by date/status/type)
- Frontend: Search UI, timeline viewer, warrant browser
- **Deliverable:** Operator can investigate past decisions

### Week 7: Cost & Usage Tracking (8F)
- Backend: Cost aggregation service
- Frontend: Usage dashboard, graphs, budget alerts
- **Deliverable:** Operator understands resource consumption

### Week 8: Command Palette (8G)
- Frontend: Keyboard shortcut overlay, quick actions
- Integration: Wire up all previous features
- **Deliverable:** Fast operator navigation and control

---

## Architecture Decisions

### Real-Time Communication

**Problem:** Polling is inefficient for real-time updates

**Solution:** WebSocket connection for execution events

**Design:**
```typescript
// Backend emits
socket.emit('objective:queued', { objective_id, command, attachments })
socket.emit('envelope:executing', { envelope_id, action_type, target })
socket.emit('envelope:completed', { envelope_id, result, artifacts })
socket.emit('envelope:failed', { envelope_id, error, reason })

// Frontend subscribes
socket.on('objective:queued', updateActiveObjectives)
socket.on('envelope:executing', updateEnvelopeStatus)
socket.on('envelope:completed', refreshVisualizerAndFileTree)
socket.on('envelope:failed', showErrorAlert)
```

**Fallback:** Polling for clients that can't maintain WebSocket

---

### Command Authority

**Problem:** Some interventions are destructive (cancel, override)

**Solution:** Warrant-based approval for T2 interventions

**Design:**
```typescript
// Cancel objective (T0 - immediate)
POST /api/v1/execution/cancel
{ objective_id: "obj_xyz" }

// Override T2 gate (requires warrant)
POST /api/v1/execution/override
{
  objective_id: "obj_xyz",
  warrant_id: "warrant_abc",
  justification: "Emergency production fix"
}
```

**Audit:** All interventions logged with timestamp, operator, justification

---

### Health Check Aggregation

**Problem:** Multiple health sources (services, jobs, trading guard, OpenClaw)

**Solution:** Single `/api/v1/system/health` endpoint that polls all sources

**Design:**
```typescript
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  services: {
    vienna_core: { status, uptime, last_heartbeat },
    planner: { status, response_time },
    executor: { status, queue_depth },
    agents: { active_sessions, available_models }
  };
  trading: {
    autonomous_window: 'active' | 'paused',
    limits: { daily_notional, trades_remaining },
    blockers: string[]
  };
  cron: {
    last_run: { job_name, timestamp, status },
    failures_24h: number
  };
  gateway: {
    connected: boolean,
    tailscale: 'up' | 'down'
  };
}
```

**Refresh:** Frontend polls every 10s, faster if degraded/critical

---

### Agent Session Tracking

**Problem:** Vienna spawns agents but doesn't track them centrally

**Solution:** Session registry updated on spawn/complete/kill

**Design:**
```typescript
// On agent spawn
sessionRegistry.register({
  agent_id: 'talleyrand',
  session_id: 'xyz',
  task: 'Plan NBA trading strategy',
  model: 'sonnet',
  spawned_at: timestamp,
  spawned_by: 'vienna',
  status: 'active'
});

// On completion
sessionRegistry.complete(session_id, { result, cost, duration });

// Frontend queries
GET /api/v1/agents/sessions?active=true
GET /api/v1/agents/sessions?agent_id=talleyrand&limit=10
```

---

## Non-Goals (Explicit Deferrals)

**Phase 8 does NOT include:**
- Multi-operator collaboration (chat, shared cursors)
- Advanced code editing (LSP, autocomplete, refactoring)
- Git integration (commit, branch, merge from UI)
- Custom workflow builder (drag-drop envelope graphs)
- Mobile/responsive UI (desktop-first for now)
- Embedded terminal (use external terminal for now)
- LLM-backed summarization quality (still placeholder)

**Rationale:** Focus on **operator control and visibility** before expanding UI capabilities

---

## Success Criteria

Phase 8 is complete when:

1. ✅ Operator can see all active objectives and envelopes in real-time
2. ✅ Operator can pause, cancel, or retry any objective
3. ✅ Operator sees system health status at a glance
4. ✅ Operator knows which agents are active and what they're doing
5. ✅ Operator can search and inspect historical execution
6. ✅ Operator understands Vienna's cost and resource usage
7. ✅ Operator can navigate quickly via keyboard shortcuts
8. ✅ No regressions in Phase 2 functionality
9. ✅ Documentation updated with control plane guide

---

## Risk Assessment

**Low Risk:**
- Real-time dashboard (read-only, additive)
- Health monitoring (polling, no state changes)
- Audit trail browser (read-only queries)
- Cost tracking (aggregation, no writes)
- Command palette (UI overlay, no backend)

**Medium Risk:**
- Intervention controls (state mutations, need safety checks)
- Agent session tracking (new registry, coordination required)
- WebSocket implementation (new protocol, fallback needed)

**High Risk:**
- Override mechanism (bypasses governance, needs strict audit)

**Mitigation:**
- Feature flags for risky features
- Warrant requirements for T2 interventions
- Rollback plan: disable controls, fall back to CLI
- Comprehensive audit logging for all operator actions

---

## Dependencies

**Backend:**
- WebSocket server (Socket.IO or native)
- Health check aggregator
- Agent session registry
- Audit log query service
- Cost tracking aggregation

**Frontend:**
- React Context for WebSocket connection
- Chart library for usage graphs (recharts or victory)
- Keyboard shortcut library (react-hotkeys-hook)
- Modal/overlay components (headless UI or radix)

**Infrastructure:**
- None (builds on existing Vienna Core)

---

## Timeline

**Estimated duration:** 6-8 weeks  
**Parallel work:** Some workstreams can overlap (e.g., 8C + 8D)  
**Blockers:** None identified  

**Milestone targets:**
- Week 2 end: Real-time visibility working
- Week 4 end: Operator can intervene in execution
- Week 6 end: Full audit and agent tracking
- Week 8 end: Complete control plane operational

---

## Validation Plan

### Unit Tests
- WebSocket event handlers
- Health check aggregation logic
- Intervention command validation
- Audit log queries

### Integration Tests
- End-to-end objective execution with real-time updates
- Cancel/retry flows
- Agent spawn → registry → completion
- Cost tracking accuracy

### Manual Tests
- Submit objective → watch dashboard update in real-time
- Cancel mid-execution → verify cleanup
- Pause Vienna → queue backs up → resume → queue drains
- Agent activity view matches actual sessions
- Audit trail matches execution logs

### Acceptance Criteria
- Operator can monitor 5 concurrent objectives without lag
- Intervention controls respond within 500ms
- Health dashboard updates every 10s reliably
- No memory leaks during 24hr session
- All Phase 2 validation tests still pass

---

## Next Steps

1. Review and approve Phase 8 scope
2. Choose first workstream (recommended: 8A Real-Time Dashboard)
3. Design WebSocket event schema
4. Implement backend event emitters in Planner/Executor
5. Build frontend dashboard components
6. Wire up real-time updates
7. Deploy and validate

---

**Phase 8 Status:** 🔨 PLANNING  
**Ready to begin on approval**  
**Estimated completion:** 2026-05-06 (6-8 weeks from kickoff)  

---

**Phase 8 transforms Vienna into a production-grade control plane.**
