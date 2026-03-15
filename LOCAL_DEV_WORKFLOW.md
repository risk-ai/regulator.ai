# Local Development Workflow — regulator.ai + Vienna Runtime

**Purpose:** Run Next.js product shell + Vienna runtime service together for local development

---

## Prerequisites

- Node.js 18+ installed
- npm installed
- Git cloned repository
- Environment files configured

---

## Quick Start (Concurrent)

**Easiest method:** Run both services from root with npm scripts

### 1. Install Dependencies

```bash
# Root (Next.js)
npm install

# Vienna Runtime
cd services/vienna-runtime
npm install
cd ../..
```

### 2. Configure Environment

**Root `.env.local`:**

```bash
# Copy template
cp .env.example .env.local

# Edit and add:
VIENNA_RUNTIME_BASE_URL=http://localhost:4001
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

**Vienna Runtime `.env`:**

```bash
cd services/vienna-runtime
cp .env.example .env

# Default values should work:
PORT=4001
VIENNA_STATE_BACKEND=memory
VIENNA_ARTIFACT_BACKEND=filesystem
VIENNA_DATA_DIR=./data
CORS_ORIGINS=http://localhost:3000
```

### 3. Run Both Services

**Option A: Manual (two terminals)**

Terminal 1 (Next.js):
```bash
npm run dev
```

Terminal 2 (Vienna Runtime):
```bash
cd services/vienna-runtime
npm run dev
```

**Option B: Docker Compose**

```bash
docker-compose up
```

---

## Port Layout

| Service | Port | URL |
|---------|------|-----|
| Next.js Product Shell | 3000 | http://localhost:3000 |
| Vienna Runtime | 4001 | http://localhost:4001 |
| Vienna Health Check | 4001 | http://localhost:4001/health |

---

## Verification

### 1. Check Vienna Runtime

```bash
curl http://localhost:4001/health
```

Expected response:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 123,
  "components": {
    "state_graph": {
      "status": "healthy",
      "type": "memory"
    },
    "artifact_storage": {
      "status": "healthy",
      "disk_usage": "N/A (dev mode)"
    }
  }
}
```

### 2. Check Product Shell

Open http://localhost:3000 in browser

- Landing page should load
- `/workspace` route should exist (may show empty state if not yet implemented)

### 3. Check API Proxy

```bash
# Via Next.js proxy (if implemented)
curl http://localhost:3000/api/workspace/investigations

# Direct to Vienna Runtime
curl http://localhost:4001/api/investigations
```

Expected response:

```json
{
  "investigations": [
    {
      "id": "inv_20260314_001",
      "name": "Gateway Failure 2026-03-14",
      ...
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

---

## Development Workflow

### Making Changes

**Next.js changes:**
- Edit files in `src/`
- Hot reload automatic
- Refresh browser

**Vienna Runtime changes:**
- Edit files in `services/vienna-runtime/src/`
- Service auto-restarts (via tsx watch)
- Refresh browser/retry API calls

### Testing API Integration

1. Make change in Vienna Runtime
2. Service restarts automatically
3. Test endpoint: `curl http://localhost:4001/api/...`
4. Test via proxy: `curl http://localhost:3000/api/workspace/...`
5. Verify in UI

---

## Environment Variables

### Next.js (.env.local)

Required:
- `VIENNA_RUNTIME_BASE_URL` — Vienna runtime base URL (http://localhost:4001)
- `DATABASE_URL` — Neon Postgres connection string
- `NEXTAUTH_SECRET` — Auth secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` — Next.js URL (http://localhost:3000)

Optional:
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth secret

### Vienna Runtime (.env)

Required:
- `PORT` — Service port (default: 4001)
- `CORS_ORIGINS` — Allowed origins (http://localhost:3000)

Optional (defaults work for dev):
- `VIENNA_STATE_BACKEND` — State storage (memory | sqlite | postgres)
- `VIENNA_ARTIFACT_BACKEND` — Artifact storage (filesystem | s3 | vercel-blob)
- `VIENNA_DATA_DIR` — Data directory (./data)
- `LOG_LEVEL` — Logging verbosity (info | debug)

---

## Troubleshooting

### Port 4001 already in use

```bash
# Find process
lsof -i :4001  # Mac/Linux
netstat -ano | findstr :4001  # Windows

# Kill it or use different port
cd services/vienna-runtime
PORT=4002 npm run dev
# Then update VIENNA_RUNTIME_BASE_URL in Next.js .env.local
```

### CORS errors in browser

Check `CORS_ORIGINS` in Vienna Runtime `.env`:

```bash
CORS_ORIGINS=http://localhost:3000
```

Restart Vienna Runtime after changing.

### API proxy 500 errors

1. Check Vienna Runtime is running: `curl http://localhost:4001/health`
2. Check `VIENNA_RUNTIME_BASE_URL` in Next.js `.env.local`
3. Check browser console for exact error
4. Check Next.js terminal for proxy error logs

### Database connection errors

Vienna Runtime Stage 3 uses **in-memory data** (no database required).

Next.js still needs `DATABASE_URL` for Drizzle ORM, but workspace routes don't use it yet.

---

## Data Flow

```
Browser
  ↓ HTTP GET /workspace/investigations
Next.js (localhost:3000)
  ↓ API Route: /api/workspace/investigations
  ↓ HTTP proxy to Vienna Runtime
Vienna Runtime (localhost:4001)
  ↓ Route: GET /api/investigations
  ↓ Return mock data from dev-data.ts
Browser (renders investigation list)
```

---

## Development Scripts

### Next.js

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
npm run typecheck # TypeScript check
```

### Vienna Runtime

```bash
cd services/vienna-runtime
npm run dev       # Start dev server (auto-restart)
npm run build     # TypeScript compile
npm start         # Run compiled code
npm run typecheck # TypeScript check
```

---

## Recommended Development Flow

1. **Start both services** (Option A: two terminals)
2. **Open browser** to http://localhost:3000
3. **Make changes** in either service
4. **Verify in browser** or with curl
5. **Commit when working**

---

## Next Steps After Stage 3

**Stage 4 will add:**
- Real State Graph persistence (SQLite/Postgres)
- Artifact filesystem storage
- Database adapters
- Policy integration
- Execution engine

**For now (Stage 3):**
- Vienna Runtime serves mock data
- Next.js workspace routes proxy to Vienna
- No database writes needed
- Focus on UI structure and API contract

---

**Status:** Development workflow ready for Stage 3  
**Last Updated:** 2026-03-14
