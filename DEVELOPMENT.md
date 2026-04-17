# Vienna OS — Development Guide

Quick start for developers contributing to Vienna OS.

## Prerequisites

- Node.js 22+ (LTS)
- npm 9+
- Docker (optional, for local Postgres)

## Quick Start

```bash
# Clone
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai

# Install dependencies
npm install

# Option 1: Docker (recommended)
cp .env.example .env.local
docker compose up

# Option 2: Manual
# Set up a PostgreSQL database and update DATABASE_URL in your env
```

## Project Structure

```
regulator.ai/
├── apps/
│   ├── console/
│   │   └── client/              # React SPA (Vienna Console UI)
│   ├── console-proxy/           # Vercel serverless API (production backend)
│   │   ├── api/v1/              # 37 API endpoints (tenant-isolated)
│   │   ├── database/client.js   # Shared Neon connection pool
│   │   └── public/              # Built console SPA assets
│   └── marketing/               # Next.js marketing site (regulator.ai)
├── services/
│   └── vienna-lib/              # Vienna Core governance engine
├── packages/
│   ├── cli/                     # Vienna CLI
│   └── python-sdk/              # Python SDK
├── examples/                    # Integration examples (5-min quickstart, AutoGen, CrewAI, etc.)
├── database/
│   └── migrations/              # SQL migration files
├── docs/                        # Documentation
└── docker-compose.yml           # Local dev environment
```

## Architecture

**Production (Vercel + Neon):**
- `apps/marketing/` → regulator.ai (Next.js on Vercel)
- `apps/console-proxy/` → console.regulator.ai (Vercel serverless functions + static SPA)
- Database: Neon PostgreSQL (pooled connection via PgBouncer)

**Local development (Docker):**
- `docker compose up` starts PostgreSQL + backend + frontend
- Backend: http://localhost:3100
- Frontend: http://localhost:5173
- Database: localhost:5432

## Console Client Development

```bash
cd apps/console/client
npm run dev
# Opens at http://localhost:5173
```

The console client is a React SPA that talks to `apps/console-proxy/api/v1/` endpoints.

## Marketing Site Development

```bash
cd apps/marketing
npm run dev
# Opens at http://localhost:3000
```

## API Development

API routes live in `apps/console-proxy/api/v1/`. Each file is a Vercel serverless function.

```bash
# Run locally (requires Vercel CLI)
cd apps/console-proxy
vercel dev
```

Key patterns:
- All endpoints use `requireAuth` from `_auth.js` for JWT/API key validation
- All queries are tenant-isolated via `tenant_id`
- Database access via `database/client.js` (shared Neon pool, max 20 connections)

## Testing

```bash
# Core library tests
node --test services/vienna-lib/test/*.test.js

# SDK tests
cd packages/python-sdk && pytest
```

## SDKs

```bash
# Node.js
npm install vienna-os

# Python
pip install vienna-os

# CLI
npx vienna-os init
```

## Deployment

All deployments happen via git push to `main`:
- **regulator.ai** — auto-deploys via Vercel (Next.js)
- **console.regulator.ai** — auto-deploys via Vercel (serverless + static)

No manual deploy steps required.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string (pooled) |
| `JWT_SECRET` | Secret for JWT token signing |
| `STRIPE_SECRET_KEY` | Stripe billing (live) |
| `RESEND_API_KEY` | Transactional email |
| `SENTRY_DSN` | Error tracking |
