# Vienna OS — Current Status

**Date:** 2026-03-26
**Version:** v0.10.0 (pre-release)

---

## Executive Summary

✅ **Core engine:** 7 governance services operational (300+ modules)
✅ **Console:** 16 pages built, pending Fly.io deploy
✅ **Marketing site:** 28+ routes live at regulator.ai
✅ **SDK:** TypeScript SDK with framework adapters (npm publish pending)
✅ **Integrations:** Slack, Email, GitHub, Webhook adapters + OpenClaw plugin
⏸️ **Production deployment:** Console backend needs `fly deploy` from NUC

---

## What's Live

| Component | URL | Status |
|---|---|---|
| Marketing site | https://regulator.ai | ✅ Live (Vercel) |
| Console | https://console.regulator.ai | ⚠️ Minimal runtime (needs real backend) |
| Try playground | https://regulator.ai/try | ✅ Live (5 scenarios + custom) |
| Stripe checkout | regulator.ai/signup | ✅ Live (Team $49/mo, Business $99/mo) |
| GitHub | github.com/risk-ai/regulator.ai | ✅ 160+ commits |

## What's Built (Not Yet Deployed)

| Component | Status | Blocker |
|---|---|---|
| Console backend (16 pages) | ✅ Code complete | Needs `fly deploy` from NUC |
| Framework API (REST) | ✅ Code complete | Needs console deploy |
| OpenClaw governance plugin | ✅ Code complete | Needs API running |
| TypeScript SDK | ✅ Code complete | Needs npm publish |
| Multi-tenant auth | ✅ Code complete | Needs production validation |

---

## Architecture

```
Marketing (Vercel) ←→ Console (Fly.io) ←→ Vienna Engine (vienna-lib)
                                                    ↑
                                               Agent SDKs
                                          (OpenClaw, LangChain, etc.)
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

## Critical Path

1. **Console deploy** — Max runs `fly deploy` from NUC → real backend live
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
