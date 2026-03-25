# Vienna OS Monorepo

Governed AI execution layer for autonomous AI systems.

**Production Endpoint:** https://vienna-os.fly.dev

## Structure

```
apps/
  marketing/        NextJS marketing site (regulator.ai)
  console/          
    client/         Vite + React console UI
    server/         Express backend (Node 22)
services/
  vienna-lib/       Vienna Core governance engine
```

## Deployment

- **Marketing:** Vercel (`regulator.ai`)
- **Console (Monolithic):** Fly.io (`vienna-os.fly.dev`)
  - Frontend + Backend unified deployment
  - Single deployment surface (no CORS complexity)
  - Better latency (no CDN → API hop)
  - Unified auth (same-origin cookies)

## Local Development

### Marketing Site
```bash
cd apps/marketing
npm install
npm run dev
# Visit http://localhost:3000
```

### Console (Backend + Frontend)
```bash
# Backend (includes frontend static serving)
cd apps/console/server
npm install
npm run dev

# Frontend development (separate terminal, optional)
cd apps/console/client
npm install
npm run dev
```

**Console endpoints:**
- Frontend: `http://localhost:5174` (dev) or `http://localhost:3100` (prod)
- API: `http://localhost:3100/api/v1/*`
- Agent Intent: `POST http://localhost:3100/api/v1/agent/intent`

## Configuration

```bash
# Backend (.env in apps/console/server/)
VIENNA_OPERATOR_PASSWORD=<secure-password>
VIENNA_OPERATOR_NAME=vienna
VIENNA_SESSION_SECRET=<openssl rand -hex 32>
ANTHROPIC_API_KEY=<your-key>
CORS_ORIGIN=http://localhost:5174,http://localhost:3100
```

## Production

**Image:** `registry.fly.io/vienna-os:deployment-*`  
**Deploy:** `flyctl deploy --app vienna-os`  
**Status:** 111/111 tests passing, Phase 28 operational

**Architecture:**
- Intent Gateway (11 agent actions)
- Multi-tenant identity + quotas
- T1/T2 operator approval workflow
- State Graph (SQLite)
- Audit trail + learning system
