# Fly.io Deploy Checklist — Vienna OS Console

**Last updated:** 2026-03-26 23:30 EDT
**Status:** DB ready, awaiting `fly deploy` from NUC

## ✅ Done (Aiden)

1. **Neon DB migrations** — All 8 migrations applied to `regulator` schema
   - Tables: 25 tables including tenants, users, api_keys, policy_rules, agent_registry, etc.
   - Indexes: 17 performance indexes created
   - Test data: Sample tenant + usage events seeded
   - Schema: `regulator` (set via `search_path` in postgres.ts)

2. **search_path fix** — `postgres.ts` now sets `search_path=regulator,public` for non-Vercel connections

3. **fly.toml** — Already configured (app: `vienna-os`, region: `iad`, port: 3100, health: `/health`)

## 🔧 Max: Set Fly Secrets (from NUC)

```bash
cd ~/regulator.ai  # or wherever the repo is on NUC

# Required secrets
fly secrets set \
  POSTGRES_URL="postgresql://neondb_owner:npg_qBE7o0YlGQyX@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&options=-c%20search_path%3Dregulator%2Cpublic" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  VIENNA_OPERATOR_PASSWORD="$(openssl rand -hex 16)" \
  VIENNA_ENV="prod" \
  NODE_ENV="production" \
  LOG_LEVEL="info"

# Optional (enables AI chat in console)
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
```

## 🚀 Max: Deploy

```bash
fly deploy
```

## ✅ Verify

```bash
# Health check
curl https://vienna-os.fly.dev/health

# Should return: { "success": true, "data": { "runtime": { "status": "healthy" ... } } }
```

## Post-Deploy

- [ ] Verify https://vienna-os.fly.dev/health returns healthy
- [ ] Verify https://console.regulator.ai points to Fly (DNS)
- [ ] Create first admin user via API
- [ ] Test login flow
