# Vienna OS Console — Deployment Guide

## Deployment Target: Vercel

Console (frontend + backend proxy) deploys to Vercel via GitHub Actions or Vercel auto-deploy.

## Quick Deploy

Push to `main` triggers auto-deploy via Vercel. For manual deploys:

```bash
# From apps/console
vercel --prod --token=$VERCEL_TOKEN --yes
```

## CI/CD Workflows

- `.github/workflows/deploy-production.yml` — Manual trigger, deploys backend (console-proxy) + frontend (console) to Vercel
- `.github/workflows/deploy-staging.yml` — Staging deploys

## Environment Variables

Set via Vercel dashboard or `vercel env add`:

### Required
| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | JWT signing key |
| `STRIPE_SECRET_KEY` | Stripe live secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Transactional email |
| `CONSOLE_URL` | `https://console.regulator.ai` |

### Optional
| Variable | Description |
|---|---|
| `VITE_API_URL` | API URL for frontend (`https://api.regulator.ai`) |
| `CORS_ORIGIN` | Allowed origins |
| `ANTHROPIC_API_KEY` | Claude API (chat features) |
| `GITHUB_TOKEN` | GitHub integration |
| `SLACK_WEBHOOK_URL` | Slack notifications |

## Verify

```bash
curl https://console.regulator.ai/api/v1/health
```

## Note

Fly.io deployment was retired. All infrastructure runs on Vercel + Neon.
