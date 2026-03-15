# Vienna Runtime Service

**Purpose:** Governance execution layer for Vienna OS

This is the backend service that handles:
- Investigation management
- Incident tracking
- Artifact storage
- Trace timelines
- Governance enforcement
- Objective evaluation (future)
- Background reconciliation (future)

The Vienna Runtime is designed to run as a standalone service separate from the Next.js product shell.

---

## Quick Start

### Development

```bash
cd services/vienna-runtime
npm install
npm run dev
```

Server will start on http://localhost:4001

### Production Build

```bash
npm run build
npm start
```

---

## Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key variables:

- `PORT` — HTTP server port (default: 4001)
- `VIENNA_STATE_BACKEND` — State storage (memory | sqlite | postgres)
- `VIENNA_ARTIFACT_BACKEND` — Artifact storage (filesystem | s3 | vercel-blob)
- `VIENNA_DATA_DIR` — Data directory for filesystem backend
- `CORS_ORIGINS` — Allowed origins (comma-separated)

---

## Routes

### Health Check

```
GET /health
```

Returns service health status.

### Investigations

```
GET /api/investigations
GET /api/investigations/:id
```

Query parameters for list:
- `status` (optional): filter by status
- `limit` (optional, default 50): max results
- `offset` (optional, default 0): pagination offset

### Incidents

```
GET /api/incidents
GET /api/incidents/:id
POST /api/incidents
```

Query parameters for list:
- `status` (optional): filter by status
- `severity` (optional): filter by severity
- `limit` (optional)
- `offset` (optional)

### Artifacts

```
GET /api/artifacts
GET /api/artifacts/:id
```

Query parameters for list:
- `artifact_type` (optional): filter by type
- `investigation_id` (optional): filter by investigation
- `limit` (optional)
- `offset` (optional)

### Traces

```
GET /api/traces/:id
GET /api/traces/:id/timeline
```

Returns trace details and execution timeline.

---

## Architecture

### Adapter System

The runtime uses adapters to abstract storage and execution:

**Database Adapter** — State storage (memory/SQLite/Postgres)  
**Storage Adapter** — Artifact storage (filesystem/S3/Vercel Blob)  
**Policy Adapter** — Policy sync with product shell  
**Execution Adapter** — External command execution  

Adapters are pluggable and configured via environment variables.

### Current State (Stage 3)

- **State Backend:** In-memory (mock data)
- **Artifact Backend:** Stub responses
- **Governance:** Not yet implemented
- **Background Services:** Not yet implemented

Stage 3 focus is on scaffolding and API structure. Real persistence and governance logic will be implemented in Stage 4.

---

## Development Data

When `VIENNA_STATE_BACKEND=memory`, the service uses mock data from `src/lib/dev-data.ts`:

- 2 sample investigations
- 2 sample incidents
- 2 sample artifacts
- 1 sample trace timeline

This allows the product shell to integrate against stable data without requiring database setup.

---

## Dependencies

**Runtime:**
- `express` — HTTP server
- `cors` — Cross-origin support
- `dotenv` — Environment configuration

**Development:**
- `tsx` — TypeScript execution (dev mode)
- `typescript` — Type checking
- `@types/*` — TypeScript definitions

---

## Testing

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

---

## Integration with Product Shell

The Next.js product shell proxies requests to Vienna Runtime:

```
Next.js (localhost:3000)
  ↓ HTTP proxy
Vienna Runtime (localhost:4001)
```

Product shell API routes forward to Vienna Runtime base URL configured via `VIENNA_RUNTIME_BASE_URL` environment variable.

See `src/app/api/workspace/*` in the product shell for proxy implementations.

---

## Future Phases

**Stage 4 (Backend Integration):**
- Real State Graph persistence (SQLite/Postgres)
- Artifact filesystem storage
- Policy evaluation engine
- Execution engine integration

**Stage 5 (Background Services):**
- Objective evaluation loop
- Execution timeout watchdog
- Reconciliation control plane
- Circuit breakers

**Stage 6 (Production Hardening):**
- Authentication/authorization
- Rate limiting
- Audit logging
- Monitoring integration

---

## Port Layout

Default port assignments:

- Next.js Product Shell: **3000**
- Vienna Runtime: **4001**
- Database (if local): **5432**

---

## Deployment

**Development:** Local Node.js process (`npm run dev`)  
**Production:** Docker container OR Fly.io app  

See root `docker-compose.yml` for local multi-service orchestration.

---

**Status:** Stage 3 scaffold complete  
**Next:** Stage 4 backend integration
