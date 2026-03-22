# Phase 8 Kickoff Plan

**Date:** 2026-03-11 20:41 EDT  
**First Workstream:** 8A Real-Time Execution Dashboard  
**Timeline:** 2 weeks  

---

## Quick Start: Week 1 Day 1

**Goal:** Real-time execution visibility operational by end of Week 2

**Today's tasks:**

1. **Design event schema** (30 min)
2. **Set up WebSocket server** (2 hrs)
3. **Wire up first event emitter** (1 hr)
4. **Build basic dashboard component** (2 hrs)
5. **Connect frontend to WebSocket** (1 hr)

---

## Task 1: Design Event Schema

**File:** `console/server/src/events/execution-events.ts`

```typescript
export interface ExecutionEvent {
  timestamp: string;
  event_type: 
    | 'objective:queued'
    | 'objective:completed'
    | 'envelope:executing'
    | 'envelope:completed'
    | 'envelope:failed';
  data: Record<string, unknown>;
}

export interface ObjectiveQueuedEvent {
  objective_id: string;
  command: string;
  attachments: string[];
  envelopes_count: number;
}

export interface EnvelopeExecutingEvent {
  envelope_id: string;
  objective_id: string;
  action_type: string;
  target?: string;
  step: number;
  total_steps: number;
}

export interface EnvelopeCompletedEvent {
  envelope_id: string;
  objective_id: string;
  result: string;
  artifacts?: string[];
  duration_ms: number;
}

export interface EnvelopeFailedEvent {
  envelope_id: string;
  objective_id: string;
  error: string;
  reason: string;
}
```

**Deliverable:** Type definitions for all execution events

---

## Task 2: Set Up WebSocket Server

**Option A: Socket.IO (recommended)**

```bash
cd console/server
npm install socket.io
```

**File:** `console/server/src/services/socketService.ts`

```typescript
import { Server as SocketServer } from 'socket.io';
import type { Server } from 'http';

export class SocketService {
  private io: SocketServer;

  constructor(httpServer: Server) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
      path: '/socket.io',
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  emit(event: string, data: unknown) {
    this.io.emit(event, data);
  }
}

// Singleton
let socketService: SocketService | null = null;

export function initSocketService(httpServer: Server): SocketService {
  socketService = new SocketService(httpServer);
  return socketService;
}

export function getSocketService(): SocketService {
  if (!socketService) {
    throw new Error('SocketService not initialized');
  }
  return socketService;
}
```

**Wire into server:**

```typescript
// console/server/src/app.ts
import { initSocketService } from './services/socketService.js';

const server = app.listen(PORT, () => {
  console.log(`Vienna Console Server running on port ${PORT}`);
});

initSocketService(server);
```

**Deliverable:** WebSocket server running, clients can connect

---

## Task 3: Wire Up First Event Emitter

**File:** `console/server/src/services/viennaRuntime.ts`

```typescript
import { getSocketService } from './socketService.js';

// Inside submitCommand method, after queueing envelopes:
const socketService = getSocketService();
socketService.emit('objective:queued', {
  objective_id,
  command: type,
  attachments: attachments || [],
  envelopes_count: envelopes.length,
  timestamp: new Date().toISOString(),
});
```

**Deliverable:** Objective submission emits real-time event

---

## Task 4: Build Basic Dashboard Component

**File:** `console/client/src/pages/ExecutionDashboard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface ActiveObjective {
  objective_id: string;
  command: string;
  attachments: string[];
  envelopes_count: number;
  timestamp: string;
}

export function ExecutionDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeObjectives, setActiveObjectives] = useState<ActiveObjective[]>([]);

  useEffect(() => {
    const newSocket = io({
      path: '/socket.io',
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to Vienna execution stream');
    });

    newSocket.on('objective:queued', (data: ActiveObjective) => {
      setActiveObjectives(prev => [data, ...prev].slice(0, 20));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <div className="execution-dashboard">
      <h1>Vienna Execution Dashboard</h1>
      
      <section className="active-objectives">
        <h2>Recent Objectives</h2>
        {activeObjectives.length === 0 ? (
          <p>No active objectives</p>
        ) : (
          <ul>
            {activeObjectives.map(obj => (
              <li key={obj.objective_id}>
                <strong>{obj.command}</strong>
                <span>{obj.envelopes_count} envelopes</span>
                <span>{new Date(obj.timestamp).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

**Add route:**

```typescript
// console/client/src/App.tsx
import { ExecutionDashboard } from './pages/ExecutionDashboard';

// Inside Routes
<Route path="/execution" element={<ExecutionDashboard />} />
```

**Add navigation:**

```typescript
// console/client/src/components/layout/TopStatusBar.tsx
<nav>
  <Link to="/">Dashboard</Link>
  <Link to="/files">Files</Link>
  <Link to="/execution">Execution</Link>
</nav>
```

**Deliverable:** Real-time dashboard page showing recent objectives

---

## Task 5: Install Socket.IO Client

```bash
cd console/client
npm install socket.io-client
```

**Deliverable:** Frontend can connect to WebSocket server

---

## Validation

**End of Day 1 checklist:**

1. [ ] Event schema defined (`execution-events.ts`)
2. [ ] Socket.IO server running (connects without error)
3. [ ] First event emitter wired (`objective:queued`)
4. [ ] Dashboard component created
5. [ ] Frontend connected to WebSocket
6. [ ] Can see objectives appear in real-time when submitted

**Test:**
1. Open `http://100.120.116.10:5174/execution`
2. Open another tab: `http://100.120.116.10:5174/files`
3. Submit a command in Files Workspace
4. Verify objective appears instantly in Execution Dashboard

---

## Week 1 Remaining Work

**Day 2-3: Envelope execution events**
- Emit `envelope:executing` when action starts
- Emit `envelope:completed` on success
- Emit `envelope:failed` on error
- Update dashboard to show envelope progress

**Day 4-5: Completion tracking**
- Track objective completion (all envelopes done)
- Show success/failure status
- Display output artifacts
- Add "last 24 hours" filter

**Week 1 deliverable:** Real-time visibility for objectives + envelopes

---

## Week 2 Work

**Day 1-2: Polish dashboard UI**
- Better styling (status colors, icons)
- Progress bars for multi-envelope objectives
- Click objective → jump to visualizer
- Auto-scroll to latest activity

**Day 3-4: Performance optimization**
- Throttle high-frequency events
- Limit displayed items (pagination/virtualization)
- Disconnect socket when page not visible
- Reconnection on disconnect

**Day 5: Integration testing**
- Submit 10 concurrent objectives
- Verify all events captured
- No memory leaks during 1hr test
- Graceful fallback if WebSocket fails

**Week 2 deliverable:** Production-ready real-time execution dashboard

---

## Decision Points

### Socket.IO vs Native WebSocket?

**Recommendation:** Socket.IO

**Why:**
- Auto-reconnection built-in
- Room support (for multi-operator later)
- Event-based API (cleaner than raw messages)
- Good TypeScript support
- Battle-tested at scale

**Alternative:** Native WebSocket if bundle size critical

---

### Where to store active objectives state?

**Option A:** In-memory only (simplest)
**Option B:** Redis (for multi-instance)
**Option C:** Database table (for persistence)

**Recommendation for Phase 8:** Option A (in-memory)

**Why:**
- Simpler to implement
- Fast
- Dashboard shows recent activity, not historical
- Historical data available via audit logs

**Future:** Move to Redis when horizontal scaling needed

---

### Polling fallback?

**Yes, recommended**

If WebSocket fails to connect, fall back to polling `/api/v1/execution/recent` every 5s

Detect via:
```typescript
socket.on('connect_error', () => {
  console.warn('WebSocket failed, falling back to polling');
  startPolling();
});
```

---

## Next Steps After Week 2

Once 8A (Real-Time Dashboard) is complete:

**Week 3:** Start 8B (Intervention Controls)
- Add pause/cancel/retry buttons to dashboard
- Implement backend command endpoints
- Wire up actions to WebSocket events

**Week 4:** Start 8C (System Health Monitor)
- Build health check aggregator
- Add status bar component
- Wire up to health endpoint

Continue through 8D → 8E → 8F → 8G per main plan.

---

## Resources

**Socket.IO docs:** https://socket.io/docs/v4/  
**React WebSocket patterns:** https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API  
**Vienna Core codebase:** `/home/maxlawai/.openclaw/workspace/vienna-core/`  

---

**Phase 8A Status:** 🔨 READY TO START  
**Expected completion:** 2026-03-25 (2 weeks)  
**First task:** Design event schema (30 min)  

---

**Start now. Real-time visibility is the foundation for all Phase 8 control plane features.**
