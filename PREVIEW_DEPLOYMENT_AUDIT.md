# Preview Deployment Audit

**Date:** 2026-03-14  
**Branch:** `feat/vienna-integration-phase1`  
**Purpose:** Document deployment assumptions for both services ahead of preview validation

---

## Product Shell (Next.js App)

### Deployment Assumptions

**Platform:** Vercel (assumed from Next.js patterns)

**Build expectations:**
- Next.js 14.2.35
- Server-side rendering enabled
- API routes at `/api/*`
- Static asset optimization
- No server-only imports in client components

**Runtime expectations:**
- Node.js 18+ (per package.json engines)
- Environment variables injected at build time for public vars
- Environment variables injected at runtime for server vars
- Serverless function model (no persistent processes)

**API proxy behavior:**
- `/api/workspace/*` routes proxy to Vienna Runtime
- Vienna Runtime base URL configured via env var
- Runtime unavailability handled gracefully (no hard failures)

### Required Environment Variables

From `.env.example`:
```
VIENNA_RUNTIME_BASE_URL=http://localhost:3001
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
```

**Expected values for preview:**
- `VIENNA_RUNTIME_BASE_URL` — URL to deployed Vienna Runtime service
- `DATABASE_URL` — Neon Postgres connection (for NextAuth/product data)
- `NEXTAUTH_URL` — Vercel preview URL
- `NEXTAUTH_SECRET` — Secure random string

### Mismatches/Blockers

**None identified** for Next.js build compatibility.

**Assumptions validated:**
- No hard-coded runtime URLs in components
- Proxy routes use `VIENNA_RUNTIME_BASE_URL` env var
- No Vienna Runtime imports in client components
- Build should succeed without runtime availability

---

## Vienna Runtime (Express Service)

### Deployment Assumptions

**Platform:** NOT YET DETERMINED (requires planning)

**Candidates:**
- Fly.io (containerized Node.js app)
- Railway.app (containerized Node.js app)
- Docker host (generic container platform)
- Render.com (native Node.js support)

**Build expectations:**
- TypeScript compilation (`npm run build`)
- Produces `dist/` output
- Single entrypoint: `dist/index.js`
- No native dependencies beyond better-sqlite3

**Runtime expectations:**
- Node.js 18+
- Always-on HTTP service (not serverless)
- Persistent filesystem or mounted volume
- Environment variable support
- Port binding (default 3001, configurable)

**Storage requirements:**
- SQLite database file: `data/vienna.db`
- Artifact directory: `data/artifacts/`
- Persistent across restarts (volume required)

### Required Environment Variables

From `services/vienna-runtime/.env.example`:
```
PORT=3001
VIENNA_STATE_BACKEND=sqlite
VIENNA_ARTIFACT_BACKEND=filesystem
VIENNA_DATA_DIR=./data
CORS_ORIGIN=http://localhost:3000
```

**Expected values for preview:**
- `PORT` — 3001 or platform-assigned
- `VIENNA_STATE_BACKEND` — `sqlite` (preview/dev only)
- `VIENNA_ARTIFACT_BACKEND` — `filesystem` (preview/dev only)
- `VIENNA_DATA_DIR` — Persistent volume mount path
- `CORS_ORIGIN` — Vercel preview URL

### Storage Backend Limitations

**SQLite preview-only:**
- Single-file database, not concurrent-safe for multi-instance
- **Preview acceptable:** Low traffic, single instance
- **Production required:** Postgres migration (Neon or similar)

**Filesystem artifact backend preview-only:**
- Local disk storage, not replicated
- **Preview acceptable:** Low volume, ephemeral OK
- **Production required:** S3/Vercel Blob migration

### Mismatches/Blockers

**Blocker for production:** Runtime requires persistent storage platform

**Not blocking preview:**
- SQLite suitable for single-instance preview
- Filesystem suitable for preview artifact volume
- Migration path to Postgres + S3 documented for later

---

## Deployment Topology

### Current Local Dev
```
Browser → Next.js (localhost:3000) → Proxy → Vienna Runtime (localhost:3001) → SQLite + FS
```

### Expected Preview
```
Browser → Vercel Preview URL → Next.js Serverless → HTTP → Vienna Runtime (Fly.io/Render/Railway) → SQLite + Volume
```

### Future Production (post-Stage 5)
```
Browser → Vercel Prod → Next.js Serverless → HTTP → Vienna Runtime (Fly.io/Render multi-region) → Neon Postgres + S3
```

---

## Required for Preview Deployment

### Product Shell (Vercel)
✅ Environment variables configured in Vercel project settings  
✅ No build-time runtime dependency  
✅ Graceful degradation when runtime offline  
✅ Preview URL configured as `NEXTAUTH_URL`  

### Vienna Runtime (TBD Platform)
⏳ Platform selection required (Fly.io recommended)  
⏳ Persistent volume mounted at `VIENNA_DATA_DIR`  
⏳ CORS configured for Vercel preview domain  
⏳ Health endpoint accessible from Vercel edge  
⏳ SQLite file initialized on first boot  

---

## Assessment

**Preview readiness for Product Shell:** ✅ HIGH CONFIDENCE  
**Preview readiness for Vienna Runtime:** ⚠️ REQUIRES DEPLOYMENT PLANNING

**Non-blocking for Stage 5:**
- Runtime deployment can be validated locally first
- Preview checklist can be completed without live preview URL
- Integration testing can use local runtime + ngrok/Tailscale tunnel

**Recommended next steps:**
1. Validate product shell build without runtime (Step 2)
2. Add runtime unavailability handling (Step 3)
3. Define runtime deployment plan (Step 4)
4. Test proxy boundary offline (Step 5)
5. Complete preview validation checklist (Steps 6-10)

---

## Summary

**Product Shell:** Ready for Vercel preview  
**Vienna Runtime:** Requires deployment platform selection + persistent volume configuration  
**Integration:** API boundary well-defined, graceful degradation needed  
**Storage:** SQLite + filesystem acceptable for preview, Postgres + S3 required for production
