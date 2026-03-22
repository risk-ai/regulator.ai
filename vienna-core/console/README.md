# Vienna Console - Phase 8

Operator control surface for Vienna Core.

## Architecture

```
Browser (localhost:5173)
  ↓
Console Client (React + TypeScript + Vite)
  ↓
Console Server (Express)
  ↓
Vienna Core Runtime
  ↓
Executor → Validator → Adapters → System
```

## Components

### 1. Backend API Contract (`server/src/types/api.ts`)

Complete TypeScript DTOs for all API endpoints and SSE events.

**Key types:**
- System status, objectives, envelopes, decisions, dead letters
- Warrants, agents, replay events
- Operator action requests/responses
- SSE event payloads

### 2. Express Console Server (`server/src/`)

Thin HTTP wrapper around Vienna Core.

**Structure:**
```
src/
├── app.ts              # Express app setup
├── server.ts           # Entry point
├── services/
│   └── viennaRuntime.ts    # Vienna Core binding layer
├── routes/
│   ├── status.ts
│   ├── dashboard.ts
│   ├── objectives.ts
│   ├── execution.ts
│   ├── decisions.ts
│   ├── deadletters.ts
│   ├── agents.ts
│   ├── replay.ts
│   ├── directives.ts
│   └── stream.ts
├── sse/
│   └── eventStream.ts      # SSE infrastructure
└── types/
    └── api.ts              # Shared types
```

**Routes:**
- `GET /api/v1/status` — Top-bar system status
- `GET /api/v1/dashboard` — Bootstrap entire dashboard
- `GET /api/v1/objectives` — List/detail/envelopes/causal-chain/warrant
- `GET /api/v1/execution` — Active/queue/blocked/metrics/health/integrity
- `POST /api/v1/execution/pause|resume` — Control execution
- `POST /api/v1/execution/emergency-override` — Trading guard override
- `GET /api/v1/decisions` — Operator inbox
- `GET /api/v1/deadletters` — Dead letter queue
- `POST /api/v1/deadletters/:id/requeue|cancel` — Dead letter actions
- `GET /api/v1/agents` — Agent registry
- `POST /api/v1/agents/:id/reason` — Request agent reasoning (rate limited)
- `POST /api/v1/directives` — Submit directive to Vienna
- `GET /api/v1/stream` — SSE real-time updates

**SSE events:**
```
system.status.updated
objective.{created|updated|completed}
execution.{started|completed|failed|blocked}
decision.{created|resolved}
deadletter.{created|resolved}
health.updated
integrity.updated
alert.created
replay.appended
```

### 3. Frontend API Client (`client/src/api/`)

Typed fetch wrappers and SSE hook.

**Files:**
- `client.ts` — Base API client with error handling
- `types.ts` — Shared types (mirrors backend contract)
- `dashboard.ts` — Dashboard bootstrap
- `objectives.ts` — Objectives CRUD
- `execution.ts` — Execution control
- `agents.ts` — Agent coordination
- `directives.ts` — Directive submission
- `deadletters.ts` — Dead letter management
- `decisions.ts` — Decision inbox
- `stream.ts` — SSE hook (`useViennaStream`)

**Usage example:**

```typescript
import { dashboardApi, useViennaStream } from '@vienna/console-client/api';

// Bootstrap dashboard
const dashboard = await dashboardApi.bootstrap();

// Subscribe to real-time updates
useViennaStream({
  onEvent: (event) => {
    if (event.type === 'objective.updated') {
      // Update local state
    }
  },
  onConnect: () => console.log('Stream connected'),
  reconnect: true,
});
```

## Installation

### Backend Server

```bash
cd console/server
npm install
npm run dev          # Development mode (tsx watch)
npm run build        # Production build
npm start            # Run production build
```

Server runs on `http://localhost:3100`

### Frontend Client

```bash
cd console/client
npm install
npm run dev          # Development mode (vite)
npm run build        # Production build
npm run preview      # Preview production build
```

Client runs on `http://localhost:5173`

## Environment Variables

### Server (`.env`)

```bash
PORT=3100
HOST=localhost
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Client (`.env`)

```bash
VITE_API_BASE=http://localhost:3100/api/v1
```

## Vienna Core Integration

**TODO:** Wire Vienna Core runtime to `ViennaRuntimeService`

Current state: All service methods throw `Not implemented` and include TODO comments showing required Vienna Core calls.

**Required bindings:**
- `QueuedExecutor` instance
- `TruthService` instance
- `WarrantService` instance
- `TradingGuard` instance
- Replay log access
- Agent registry access

**Next steps:**
1. Import Vienna Core modules into `viennaRuntime.ts`
2. Inject runtime instances via constructor
3. Implement each method by calling Vienna Core APIs
4. Emit SSE events via `eventStream.publish()` when Vienna Core state changes

## Authority Boundary Enforcement

**Console server never:**
- Calls adapters directly
- Bypasses executor
- Issues warrants directly
- Modifies queue without Vienna Core authorization

**All mutations route through:**
```
Console → ViennaRuntimeService → Vienna Core → Executor → Validator → Adapters
```

## Safety Features

### Rate Limiting

**Agent reasoning endpoint:** 5 requests per minute per operator

### Emergency Override

**Route:** `POST /api/v1/execution/emergency-override`

**Constraints:**
- Max 60 minutes duration
- Requires Metternich approval ID
- Trading guard bypass only
- Full audit trail
- Auto-expiration

**Governance:** Never bypasses warrant/executor/adapter boundaries

### Warrant Visibility

**Route:** `GET /api/v1/objectives/:id/warrant`

Shows:
- Warrant state, issuance, expiry
- Truth snapshot binding
- Trading guard consultation
- Approval status

## Trading Protection

**Status bar shows:**
- Trading guard state (active/override/disabled)
- Emergency override expiration
- NBA autonomous window (day X/7, expiration)

**Critical:** Emergency override only affects trading guard preflight checks. All other enforcement remains active.

## Testing

### Backend

```bash
cd server
npm run type-check
curl http://localhost:3100/health
curl http://localhost:3100/api/v1/status
```

### Frontend

```bash
cd client
npm run type-check
npm run dev
```

Visit `http://localhost:5173`

### SSE Stream

```bash
curl -N http://localhost:3100/api/v1/stream
```

Should see heartbeat events.

## Build Priority

### Phase 8 v1 MVP (Week 1)

**Backend:**
- Status endpoint
- Dashboard bootstrap
- Objectives list
- Active execution
- SSE stream

**Frontend:**
- App shell
- Top status bar
- Objectives panel
- Active execution panel
- SSE integration

### Phase 8 v2 (Week 2)

**Backend:**
- Pause/resume routes
- Health/integrity routes
- Decisions aggregation

**Frontend:**
- Safety controls
- Health/integrity panel
- Decision inbox

### Phase 8 v3 (Week 3)

**Backend:**
- Objective detail routes
- Replay routes
- Dead letter actions

**Frontend:**
- Inspection drawer
- Replay timeline
- Dead letter management

### Phase 8 v4 (Week 4)

**Backend:**
- Agent routes
- Directive submission
- Emergency override

**Frontend:**
- Command bar
- Agent registry
- Emergency override UI

## Reference

**Phase 7.2 RFC:** `PHASE_7.2_RFC.md` (enforcement architecture)  
**Warrant Policy:** `VIENNA_WARRANT_POLICY.md`  
**Vienna Core:** `lib/` (executor, validator, adapters)  
**Routing:** `subagents/ROUTING.md`
