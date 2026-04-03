# Vienna OS Console

**Operator Dashboard & Governance Control Plane**

The Vienna Console is the primary interface for monitoring, approving, and investigating Vienna OS governed operations.

---

## Architecture

**Deployment Model:** Server + Client architecture

```
┌─────────────────┐
│  Console Client │  (React + Vite)
│  Port: 5173     │  Static assets
└────────┬────────┘
         │ HTTP/SSE
         ▼
┌─────────────────┐
│ Console Server  │  (Express + Node)
│ Port: 3100      │  API + Auth
└────────┬────────┘
         │ Direct
         ▼
┌─────────────────┐
│  Vienna Core    │  (State Graph + Executor)
│  SQLite/Neon    │  Governance engine
└─────────────────┘
```

**Technology Stack:**
- **Frontend:** React 18, TypeScript, Vite, Zustand (state), date-fns
- **Backend:** Express, Node 22, SQLite/Neon Postgres
- **Real-time:** Server-Sent Events (SSE)
- **Styling:** CSS variables + mobile-responsive overrides

---

## Quick Start

### Development Mode

```bash
# Start backend server
cd ~/regulator.ai/apps/console/server
npm run dev

# Start frontend (separate terminal)
cd ~/regulator.ai/apps/console/client
npm run dev

# Open browser
open http://localhost:5173
```

### Production Build

```bash
# Build client
cd ~/regulator.ai/apps/console/client
npm run build  # Output: dist/ (492 KB bundle)

# Start server (serves client static files)
cd ~/regulator.ai/apps/console/server
npm start

# Access console
curl http://localhost:3100/health
```

---

## Features

### Dashboard
- **System Health:** Executor status, queue depth, DLQ count
- **Real-time Stats:** Active envelopes, objectives, pending approvals
- **SSE Updates:** Live push notifications for state changes

### Approvals Workflow
- **Pending Queue:** T1/T2 actions awaiting operator authorization
- **History:** Past approvals with analytics (total, approved, denied, avg response time)
- **Quick Actions:** Approve/deny with reason, expire tracking

### Objectives Management
- **Active Objectives:** Managed execution units from State Graph
- **Reconciliation Status:** Current/desired state tracking
- **Priority Sorting:** High-priority objectives surfaced

### Execution Trace
- **Timeline View:** Chronological execution events
- **Governance Reasoning:** Why Vienna allowed/denied actions
- **Graph Preview:** Execution dependencies and flow
- **Linked Entities:** Intent, execution, objective, artifact IDs

### Fleet Management
- **Agent Registry:** Active agents, last-seen timestamps
- **Health Monitoring:** Agent availability, trust scores
- **Action History:** Per-agent execution statistics

### Policies
- **Policy Explorer:** Active governance policies
- **Rule Evaluation:** Policy match history
- **Suggestions:** Policy recommendations from State Graph

### History & Audit
- **Execution Ledger:** Complete audit trail
- **Attestations:** Tamper-proof execution records
- **Cost Tracking:** Per-execution cost breakdown

---

## API Endpoints

### System
- `GET /api/v1/health` — Health check
- `GET /api/v1/status` — System status
- `GET /api/v1/dashboard` — Dashboard bootstrap data

### Approvals
- `GET /api/v1/approvals` — List approvals (filter: status, tier, limit)
- `GET /api/v1/approvals/:id` — Get approval details
- `POST /api/v1/approvals/:id/approve` — Approve action
- `POST /api/v1/approvals/:id/deny` — Deny action

### Objectives
- `GET /api/v1/objectives` — List managed objectives
- `GET /api/v1/objectives/:id` — Get objective details

### Execution
- `POST /api/v1/execution/pause` — Pause executor
- `POST /api/v1/execution/resume` — Resume executor

### Real-time
- `GET /api/v1/events` — SSE event stream

---

## Configuration

### Environment Variables

```bash
# Server
PORT=3100
NODE_ENV=production
VIENNA_CORE_PATH=../../services/vienna-lib

# Database
DATABASE_URL=postgres://user:pass@host/db  # OR
SQLITE_PATH=~/.openclaw/workspace/vienna-core/state/state.db

# Auth
SESSION_SECRET=your-secret-here
AUTH_REQUIRED=true

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://console.regulator.ai
```

### Client Configuration

```typescript
// apps/console/client/src/config.ts
export const config = {
  apiUrl: process.env.VITE_API_URL || 'http://localhost:3100',
  sseUrl: process.env.VITE_SSE_URL || 'http://localhost:3100/api/v1/events',
  authRequired: process.env.VITE_AUTH_REQUIRED === 'true',
  sentryDSN: process.env.VITE_SENTRY_DSN,
};
```

---

## Development

### Project Structure

```
apps/console/
├── client/              # React frontend
│   ├── src/
│   │   ├── api/         # API client functions
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components
│   │   ├── store/       # Zustand state stores
│   │   ├── styles/      # CSS (including mobile.css)
│   │   └── main.tsx     # Entry point
│   ├── package.json
│   └── vite.config.ts
│
└── server/              # Express backend
    ├── src/
    │   ├── routes/      # API route handlers
    │   ├── services/    # Business logic (ViennaRuntimeService)
    │   ├── types/       # TypeScript types
    │   └── app.ts       # Express app
    ├── package.json
    └── tsconfig.json
```

### Adding New Pages

1. Create page component in `client/src/pages/YourPage.tsx`
2. Add route in `client/src/App.tsx`
3. Add navigation link in `client/src/components/layout/Sidebar.tsx`

### Adding New API Endpoints

1. Create route in `server/src/routes/yourRoute.ts`
2. Register in `server/src/app.ts`
3. Add API client function in `client/src/api/yourApi.ts`
4. Call from component

---

## Mobile Responsive

**Breakpoints:**
- **Mobile:** ≤768px (single column, full-screen modals, 44px touch targets)
- **Tablet:** 769px-1024px (2-column grid)
- **Desktop:** ≥1025px (multi-column layouts)

**Mobile optimizations:**
- iOS zoom prevention (16px input font-size)
- Touch targets (min 44px)
- Horizontal scroll tabs
- Sticky page headers
- Active state animations

**File:** `client/src/styles/mobile.css`

---

## Real-Time Updates (SSE)

**Event Types:**
- `system.status` — System health changed
- `objective.created/updated/completed` — Objective lifecycle
- `approval.created/approved/denied` — Approval workflow
- `execution.started/completed/failed` — Execution events
- `provider.health` — External provider status
- `service.health` — Service health changed

**Client Hook:**
```typescript
import { useViennaStream } from './hooks/useViennaStream';

function MyComponent() {
  useViennaStream(); // Automatically connects + handles events
  
  const sseConnected = useDashboardStore((state) => state.sseConnected);
  const objectives = useDashboardStore((state) => state.objectives);
  
  return <div>{sseConnected ? 'Live' : 'Disconnected'}</div>;
}
```

---

## Authentication

**Current:** Session-based auth with cookie persistence

**Future:** API key authentication for programmatic access

**Session Management:**
```typescript
// Check auth status
const isAuthed = useAuthStore((state) => state.isAuthenticated);
const operator = useAuthStore((state) => state.operator);

// Login
await authApi.login(username, password);

// Logout
await authApi.logout();
```

---

## Testing

### Unit Tests
```bash
cd apps/console/client
npm test
```

### Integration Tests
```bash
cd apps/console/server
npm test
```

### E2E Tests
```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test
```

---

## Deployment

### Production (Vercel)

```bash
# 1. Deploy to Vercel
vercel --prod

# 2. Check deployment status
vercel ls

# 3. Verify
curl http://localhost:3100/health
```

### Docker

```dockerfile
# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY apps/console/client/package*.json ./client/
RUN cd client && npm ci
COPY apps/console/client ./client
RUN cd client && npm run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
COPY apps/console/server/package*.json ./
RUN npm ci --only=production
COPY apps/console/server ./
COPY --from=build /app/client/dist ./client/dist
EXPOSE 3100
CMD ["node", "src/server.js"]
```

---

## Performance

**Metrics:**
- **Bundle size:** 492 KB (gzipped)
- **Initial load:** <2s on 3G
- **API latency:** p95 <100ms (localhost), p95 <500ms (remote)
- **SSE reconnect:** <3s on connection loss

**Optimization:**
- Lazy loading for heavy components
- Code splitting by route
- Debounced search inputs
- Virtualized lists (when >100 items)
- Cached API responses (5s TTL)

---

## Troubleshooting

### Console won't load

**Symptom:** White screen or "Cannot GET /"

**Fix:**
```bash
# Check server is running
curl http://localhost:3100/health

# Check client build exists
ls ~/regulator.ai/apps/console/client/dist/

# Rebuild if missing
cd ~/regulator.ai/apps/console/client && npm run build
```

---

### SSE disconnects frequently

**Symptom:** `sseConnected: false` in dashboard

**Fix:**
```bash
# Check SSE endpoint
curl -N http://localhost:3100/api/v1/events

# Check firewall/proxy timeout settings
# SSE requires long-lived connections (30s+ keepalive)
```

---

### Approvals not loading

**Symptom:** "No approvals" when approvals exist

**Fix:**
```bash
# Check approval_requirements table
sqlite3 ~/.openclaw/workspace/vienna-core/state/state.db \
  "SELECT * FROM approval_requirements LIMIT 5;"

# Check API endpoint
curl -H "Cookie: session=..." http://localhost:3100/api/v1/approvals
```

---

## References

- **Architecture:** `VIENNA_OS_OVERVIEW.md`
- **Canonical Flow:** `CANONICAL_EXECUTION_PATH.md`
- **Load Testing:** `LOAD_TESTING.md`
- **Certification:** `PRODUCTION_CERTIFICATION.md`

**For questions:** Check documentation or escalate to Max/Metternich.
