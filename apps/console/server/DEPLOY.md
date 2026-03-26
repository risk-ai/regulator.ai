# Vienna OS Console — Fly.io Deployment Guide

## Prerequisites
- Fly.io CLI (`flyctl`) installed
- Authenticated: `fly auth login`

## Quick Deploy (3 commands)

```bash
# From the repo root
cd apps/console/server

# Set required secrets (one-time)
fly secrets set \
  VIENNA_OPERATOR_PASSWORD="$(openssl rand -hex 16)" \
  VIENNA_SESSION_SECRET="$(openssl rand -hex 32)" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  VIENNA_WARRANT_KEY="$(openssl rand -hex 32)" \
  POSTGRES_URL="postgres://neondb_owner:PASSWORD@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-purple-smoke-adpumuth" \
  --app vienna-os

# Deploy
fly deploy --remote-only --app vienna-os
```

## Environment Variables

### Required for boot
| Variable | Description | How to set |
|---|---|---|
| `VIENNA_OPERATOR_PASSWORD` | Operator login password | Auto-generated if missing |
| `VIENNA_SESSION_SECRET` | Session encryption key | Auto-generated if missing |

### Recommended
| Variable | Description |
|---|---|
| `POSTGRES_URL` | Neon Postgres connection (falls back to SQLite) |
| `JWT_SECRET` | JWT signing key |
| `VIENNA_WARRANT_KEY` | Warrant HMAC signing key |
| `ANTHROPIC_API_KEY` | Claude API key (for chat features) |

### Optional
| Variable | Description |
|---|---|
| `CORS_ORIGIN` | Allowed origins (default: regulator.ai domains) |
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `RESEND_API_KEY` | Email notifications |
| `GITHUB_TOKEN` | GitHub integration |

## Verify

```bash
# Check health
curl https://vienna-os.fly.dev/health

# Check logs
fly logs --app vienna-os
```

## Troubleshooting

### Health check fails
The server now boots without crashing on missing env vars. It will:
- Auto-generate VIENNA_OPERATOR_PASSWORD (logged to console)
- Auto-generate VIENNA_SESSION_SECRET (ephemeral)
- Fall back to SQLite if POSTGRES_URL not set
- Skip AI features if ANTHROPIC_API_KEY not set

### Machine lease conflicts
```bash
fly machines list --app vienna-os
# If stale machines exist:
fly machines destroy <machine-id> --app vienna-os --force
```

### Redeploy
```bash
cd apps/console/server
fly deploy --remote-only --app vienna-os
```
