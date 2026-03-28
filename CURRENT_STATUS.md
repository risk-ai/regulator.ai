# Vienna OS — Current Status

**Date:** 2026-03-28
**Version:** v0.10.0 (production)

---

## Executive Summary

✅ **Core engine:** 7 governance services operational (300+ modules)
✅ **Console:** 16 pages built, deployed on NUC infrastructure
✅ **Marketing site:** 28+ routes live at regulator.ai
✅ **SDK:** TypeScript SDK with framework adapters (npm publish pending)
✅ **Integrations:** Slack, Email, GitHub, Webhook adapters + OpenClaw plugin
✅ **Production deployment:** Console backend running on maxlawai NUC via Cloudflare Tunnel

---

## What's Live

| Component | URL | Status |
|---|---|---|
| Marketing site | https://regulator.ai | ✅ Live (Vercel) |
| Console | https://console.regulator.ai | ✅ Live (NUC + Cloudflare Tunnel) |
| Try playground | https://regulator.ai/try | ✅ Live (5 scenarios + custom) |
| Stripe checkout | regulator.ai/signup | ✅ Live (Team $49/mo, Business $99/mo) |
| GitHub | github.com/risk-ai/regulator.ai | ✅ 160+ commits |

## What's Built (Production Ready)

| Component | Status | Notes |
|---|---|---|
| Console backend (16 pages) | ✅ Deployed | Running on NUC via systemd |
| Framework API (REST) | ✅ Live | Available at console.regulator.ai |
| OpenClaw governance plugin | ✅ Code complete | Ready for API integration |
| TypeScript SDK | ✅ Code complete | Awaiting npm publish credentials |
| Multi-tenant auth | ✅ Production validated | Running with Neon Postgres |

---

## Architecture

```
Marketing (Vercel) ←→ Console (NUC + Cloudflare Tunnel) ←→ Vienna Engine (vienna-lib)
                                    ↑                                ↑
                            maxlawai infrastructure            Agent SDKs
                        (systemd + auto-deploy cron)     (OpenClaw, LangChain, etc.)
                                    ↓
                              Neon Postgres
```

### Core Engine (services/vienna-lib/)
- **84** TypeScript declarations, **198** JS modules
- 7 governance services: Intent Gateway, State Graph, Policy Engine, Warrant Authority, Execution Router, Verification Engine, Audit Trail
- Support systems: Dead Letter Queue, Circuit Breakers, Rate Limiter, Reconciliation, Replay, Recovery
- Risk tiers: T0 (auto), T1 (policy auto), T2 (human), T3 (multi-party)
- HMAC-SHA256 warrant signatures with tamper detection
- Scope verification with constraint enforcement

### Console (apps/console/)
- 16 pages: Now, Runtime, Fleet, Approvals, PolicyBuilder, Intent, ActionTypes, Integrations, Compliance, History, Workspace, Files, Services, Settings, Dashboard, Presentation
- Framework API: POST /intents, POST /executions, POST /agents, GET /warrants
- API key auth (Bearer vos_xxx)

### Marketing (apps/marketing/)
- 28+ routes with SEO, Stripe, GA4
- Interactive /try playground (5 built-in scenarios + custom builder)
- Integration guide, case studies, blog, docs

### SDK (packages/sdk/)
- ViennaClient with 6 modules: Intent, Policies, Fleet, Approvals, Integrations, Compliance
- Framework wrappers: createForLangChain, createForCrewAI, createForAutoGen, createForOpenClaw
- Retry logic, rate limit handling, typed errors

### Adapters
- **OpenClaw plugin:** Governance middleware for OpenClaw agents (3 modes: enforce/audit/dry-run)
- **Slack:** Interactive approval buttons, execution notifications
- **Email:** Approval emails, daily digest (Resend)
- **GitHub:** Governed deployments, PR status checks
- **Webhook:** Generic integration with circuit breaker

---

## Infrastructure Details

### NUC Deployment (maxlawai)
- **Host:** maxlawai (local NUC)
- **Services:** 
  - `vienna-console` (systemd service)
  - `cloudflared-vienna` (Cloudflare Tunnel daemon)
- **Tunnel ID:** 2aeefb18-ab8c-4580-a23f-8cdaa0425484
- **Tunnel Name:** vienna-console
- **Auto-deployment:** ~/vienna-auto-deploy.sh (cron every 10 minutes)
- **Database:** Neon Postgres (shared with portfolio sites)
- **Logs:** `sudo journalctl -u vienna-console -f`

### Migration Complete
✅ Fly.io app DESTROYED (vienna-os.fly.dev offline)  
✅ DNS updated to point console.regulator.ai → Cloudflare Tunnel  
✅ Database migrated from Fly Postgres to Neon  
✅ All services operational on NUC infrastructure

---

## Critical Path

1. ~~**Console deploy**~~ ✅ **COMPLETE** — Console live on NUC via Cloudflare Tunnel
2. **npm publish** — `@vienna-os/sdk` to npm → developers can install
3. **Open-source** — Make repo public on GitHub → community adoption
4. **OpenClaw self-integration** — Govern our own agent fleet → case study #1

---

## Recent Changes (Mar 26)

- Business plan v2.0 with sourced market data (Gartner, Deloitte)
- T3 multi-party warrants (2+ approvers, justification, rollback plan)
- HMAC-SHA256 warrant signatures with tamper detection
- Framework adapter for LangChain/CrewAI/AutoGen/OpenClaw
- REST API routes for external framework integration
- OpenClaw governance plugin (enforce/audit/dry-run modes)
- Console: welcome wizard, command palette, theme toggle, mobile responsive
- Marketing: enhanced hero, case studies page, integration guide
- SDK framework wrappers + publish prep
- Verification engine scope drift detection + timing verification
