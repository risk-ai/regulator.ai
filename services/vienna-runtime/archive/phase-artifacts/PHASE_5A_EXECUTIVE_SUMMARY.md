# Phase 5A Executive Summary

**Date:** 2026-03-11  
**Author:** Talleyrand (Strategy & Planning)  
**Status:** Planning Complete, Awaiting Approval

---

## Overview

Phase 5A adds **live runtime observability** via Server-Sent Events (SSE), enabling real-time dashboard updates without polling. Foundation for Phase 5B-E timeline/statistics views.

**Core deliverable:** Envelope lifecycle + objective progress events flowing from Vienna Core → Console UI in <300ms.

---

## Key Decisions

### 1. Architecture: SSE (Not WebSocket)

**Chosen:** Server-Sent Events  
**Rationale:**
- One-way traffic (server → client) sufficient for Phase 5A observability
- Simpler than WebSocket (HTTP-based, native browser support)
- Already implemented in `console/server/src/sse/eventStream.ts`
- Auto-reconnect built-in
- Easy debugging (`curl -N`)

**WebSocket deferred:** Only needed if Phase 8 requires bidirectional real-time control (e.g., streaming agent output).

---

### 2. Event Categories

**Envelope Lifecycle (6 events):**
- `execution.started` — Envelope begins
- `execution.completed` — Success
- `execution.failed` — Failure (includes retry info)
- `execution.retried` — After backoff
- `execution.timeout` — Exceeded timeout (Phase 4A integration)
- `execution.blocked` — Precondition failed

**Objective Progress (4 events):**
- `objective.created` — New objective
- `objective.progress.updated` — Envelope count/status change
- `objective.completed` — All envelopes resolved
- `objective.failed` — Critical failure or cancellation

**Alerts (3 events - foundation for Phase 5C):**
- `alert.queue.depth` — Queue exceeds threshold
- `alert.execution.stall` — Approaching timeout (>50%)
- `alert.failure.rate` — Failure rate exceeds threshold

---

### 3. Emission Points

**QueuedExecutor (`lib/execution/queued-executor.js`):**
- Emit 5 execution events (started, completed, failed, timeout, retried)
- Non-blocking emit (no impact on execution latency)
- Fire-and-forget (failures logged, runtime continues)

**ObjectiveTracker (`lib/core/objective-tracker.js` - verify exists):**
- Emit 4 objective events
- Trigger on envelope state changes
- Aggregate counts (active, completed, blocked, dead letter)

**ExecutionMetrics (`lib/execution/execution-metrics.js`):**
- Emit 2 alert events (stall, failure rate)
- Threshold-based (configurable)

**QueueManager (location TBD):**
- Emit 1 alert event (queue depth)
- Warning at threshold, critical at 2x threshold

---

### 4. Frontend Consumption

**React Hook:** `useViennaStream()`

```typescript
useViennaStream({
  onEvent: (event) => {
    switch (event.type) {
      case 'objective.progress.updated':
        // Update local state
        break;
      case 'execution.completed':
        // Remove from active list
        break;
      case 'alert.queue.depth':
        // Show notification
        break;
    }
  },
  reconnect: true
});
```

**Key features:**
- Auto-reconnect on disconnect
- Event-driven state updates (no polling)
- Type-safe with TypeScript DTOs

---

## Implementation Timeline

**Week 1:** Core event emission  
- Wire SSE events to QueuedExecutor  
- Test event arrival in browser  
- **Validation:** Events arrive <100ms

**Week 2:** Objective progress  
- ObjectiveTracker integration  
- Dashboard real-time updates  
- **Validation:** Objective status updates <200ms

**Week 3:** Alert events  
- Queue depth, stall, failure rate alerts  
- Toast notifications in UI  
- **Validation:** Alerts fire at thresholds

**Week 4:** Validation & hardening  
- Load testing (100 concurrent executions)  
- Reconnection testing  
- Documentation  
- **Validation:** All acceptance criteria met

---

## Success Criteria (Phase 5A Complete)

### Functional
✅ All envelope lifecycle events emitted  
✅ All objective progress events emitted  
✅ Alert events emitted  
✅ Events arrive via SSE  
✅ Dashboard updates in real-time (no polling)

### Performance
✅ Event emission latency <100ms  
✅ Event delivery latency <200ms  
✅ No event loss under normal load (<100 concurrent executions)

### Reliability
✅ SSE failures don't crash runtime  
✅ Client auto-reconnects within 5s  
✅ No memory leaks (24hr soak test)

### Integration
✅ Events truthful to runtime state  
✅ Event schema matches TypeScript DTOs  
✅ Backward compatible with REST API  
✅ ReplayLog still persists (SSE is additive)

---

## Risk Mitigation

**Event loss during disconnect:**  
- Short-term: Poll `/api/v1/dashboard` on reconnect  
- Long-term: Add `?since=<timestamp>` for event replay (Phase 5B)

**SSE emission slowing runtime:**  
- Non-blocking emit (`setImmediate()`)  
- Fire-and-forget (no await in critical path)  
- Circuit breaker after 10 failures

**Memory leaks:**  
- Client cleanup on disconnect  
- Connection limit (100 max)  
- 24hr soak test validation

**Schema drift:**  
- Shared `types/api.ts` (single source of truth)  
- Versioned events (`v1`)  
- New fields optional (backward compatible)

---

## Out of Scope (Deferred)

**Phase 5B:** Timeline visualization  
**Phase 5C:** Statistics/charts  
**Phase 5D:** Filtering/search  
**Phase 5E:** Alerting rules  
**Phase 8:** Control-plane (pause/resume, live cancellation)

**Rationale:** Phase 5A is the **foundation**. Later phases build on this event stream.

---

## Questions for Approval

1. **ObjectiveTracker location:** Does `lib/core/objective-tracker.js` exist? If not, where is objective state managed?

2. **Queue depth threshold:** What's acceptable before alert? (Proposed: 100 warning, 200 critical)

3. **Failure rate threshold:** What triggers alert? (Proposed: 5%)

4. **SSE client limit:** Max concurrent browsers? (Proposed: 100)

5. **Timeline:** 4 weeks acceptable, or compress to 3?

---

## Deliverables

- [ ] `PHASE_5A_COMPLETION_REPORT.md` — Final validation results  
- [ ] `docs/EVENT_SCHEMA.md` — Event reference  
- [ ] `docs/SSE_INTEGRATION.md` — Developer integration guide  
- [ ] Updated `console/README.md` — Phase 5A status  

---

## Next Action

**Await approval from Vienna (Max).**  

Once approved, begin Week 1 implementation:
1. Extend SSE event types in `types/api.ts`
2. Wire `ViennaEventStream` to Vienna Core
3. Emit execution lifecycle events from `queued-executor.js`
4. Test event arrival in browser console

---

**Full plan:** `PHASE_5A_EVENT_STREAM_PLAN.md` (44KB, complete specification)

**Status:** ✅ Ready for review
