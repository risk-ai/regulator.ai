# Local Development Workflow

## Overview

This project consists of two services:

1. **Next.js Product Shell** — User-facing web application (port 3000)
2. **Vienna Runtime** — Backend service for Vienna OS state/execution (port 3001)

Both services must run concurrently for full workspace functionality.

---

## Prerequisites

- Node.js 18+ (tested on v22.22.0)
- npm 8+
- SQLite (bundled via better-sqlite3, no separate install needed)

---

## Initial Setup

### 1. Install Root Dependencies

```bash
cd /path/to/regulator.ai
npm install
```

### 2. Install Vienna Runtime Dependencies

```bash
cd services/vienna-runtime
npm install
```

### 3. Configure Environment Variables

**Product Shell** (root `.env.local`):

```bash
# Vienna Runtime URL for server-side proxy
VIENNA_RUNTIME_URL=http://localhost:3001

# Next.js public URL (for client-side)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Vienna Runtime** (`services/vienna-runtime/.env`):

```bash
# Port for runtime service
PORT=3001

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3000

# Node environment
NODE_ENV=development
```

---

## Running the Services

### Option 1: Run Both Services Separately

**Terminal 1 — Vienna Runtime:**

```bash
cd services/vienna-runtime
npm run dev
```

**Expected output:**
```
[Vienna DB] Initialized SQLite database at .../data/vienna.db
[Vienna Bootstrap] Seeding development data...
[Vienna Bootstrap] Seeded:
  - 2 investigations
  - 2 incidents
  - 2 artifacts
  - 1 investigation-incident link
Vienna Runtime listening on port 3001
```

**Terminal 2 — Product Shell:**

```bash
cd /path/to/regulator.ai
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - ready in XXXms
```

### Option 2: Docker Compose (Future)

**Not yet implemented.** Will be added in Stage 5+.

---

## Verification

### 1. Vienna Runtime Health Check

```bash
curl http://localhost:3001/health
```

**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-14T...",
  "backend": "sqlite",
  "artifacts": "filesystem"
}
```

### 2. Runtime API Check

```bash
curl http://localhost:3001/api/investigations
```

**Expected:** JSON response with 2 seeded investigations.

### 3. Next.js Proxy Check

```bash
curl http://localhost:3000/api/workspace/investigations
```

**Expected:** Same JSON response (proxied through Next.js).

### 4. Workspace UI Check

Open in browser:
```
http://localhost:3000/workspace
```

**Expected:** Workspace dashboard loads, shows investigations and incidents.

---

## Database and Artifacts

### SQLite Database

**Location:** `services/vienna-runtime/data/vienna.db`

**Auto-created on first boot.**

**Inspect database:**
```bash
cd services/vienna-runtime/data
sqlite3 vienna.db

sqlite> .tables
sqlite> .schema investigations
sqlite> SELECT * FROM investigations;
sqlite> .quit
```

**Reset database:**
```bash
cd services/vienna-runtime
rm data/vienna.db
npm run dev  # Recreates DB and re-seeds
```

### Artifact Storage

**Location:** `services/vienna-runtime/data/artifacts/`

**Auto-created on first artifact write.**

Artifacts are stored as files named by their artifact ID.

**List artifacts:**
```bash
ls -lh services/vienna-runtime/data/artifacts/
```

---

## Common Issues

### Issue: Port 3000 or 3001 already in use

**Solution:**
```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

Or change port in `.env` files.

### Issue: Vienna Runtime not seeding data

**Cause:** Database already exists with data.

**Solution:** Reset database:
```bash
rm services/vienna-runtime/data/vienna.db
npm run dev
```

### Issue: Next.js cannot connect to Vienna Runtime

**Check:**
1. Vienna Runtime is running on port 3001
2. `.env.local` has correct `VIENNA_RUNTIME_URL=http://localhost:3001`
3. CORS is configured correctly in runtime

**Test runtime directly:**
```bash
curl http://localhost:3001/health
```

### Issue: TypeScript errors in IDE

**Solution:** Restart TypeScript server:
- VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
- Or run: `npm run build` to check for real errors

### Issue: Database locked error

**Cause:** Another process has the SQLite DB open.

**Solution:**
```bash
# Close all connections
cd services/vienna-runtime
rm data/vienna.db
npm run dev
```

---

## Rebuild and Clean

### Full Clean Rebuild

```bash
# Clean root
rm -rf node_modules .next
npm install

# Clean runtime
cd services/vienna-runtime
rm -rf node_modules dist data
npm install
```

### Clear Next.js Cache

```bash
rm -rf .next
npm run dev
```

---

## Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| Product Shell | http://localhost:3000 | Next.js application |
| Workspace | http://localhost:3000/workspace | Vienna workspace UI |
| Vienna Runtime | http://localhost:3001 | Backend API (direct) |
| Runtime Health | http://localhost:3001/health | Health check endpoint |
| Shell Proxy API | http://localhost:3000/api/workspace/* | Proxied runtime API |

---

## Data Persistence

**SQLite database persists across runtime restarts.**

**To verify persistence:**
```bash
# Start runtime, create incident via API
curl -X POST http://localhost:3001/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","severity":"medium","status":"open"}'

# Stop runtime (Ctrl+C)
# Restart runtime
npm run dev

# Verify incident still exists
curl http://localhost:3001/api/incidents
```

---

## Next Steps

After verifying local setup:

1. **Stage 5:** Preview deployment validation
2. **Stage 6:** Production backend (Neon Postgres)
3. **Stage 7:** Auth enforcement on proxy routes
4. **Stage 8:** S3/Vercel Blob artifact storage

---

## Troubleshooting

**Can't start services:**
- Check Node.js version: `node --version` (should be 18+)
- Check npm version: `npm --version`
- Ensure no other services on ports 3000/3001

**Database issues:**
- Reset DB: `rm services/vienna-runtime/data/vienna.db`
- Check SQLite installation: `which sqlite3`

**Proxy issues:**
- Confirm runtime is accessible: `curl http://localhost:3001/health`
- Check `.env.local` has correct `VIENNA_RUNTIME_URL`
- Restart both services

**For further help:**
- Check `STAGE_4_BACKEND_INTEGRATION_COMPLETE.md`
- Check `services/vienna-runtime/STATE_BACKEND.md`
- Check `services/vienna-runtime/ARTIFACT_STORAGE.md`
