# Vienna OS — Product Roadmap to v1.0

_Author: Aiden (COO, ai.ventures) | Updated: 2026-03-26_

---

## Current State (v0.9)

### ✅ Core Engine (vienna-lib)
- 84 TypeScript declarations, 198 JS modules
- All 7 governance services: Intent Gateway, State Graph, Policy Engine, Warrant Authority, Execution Router, Verification Engine, Audit Trail
- Dead Letter Queue, Circuit Breakers, Rate Limiter, Reconciliation, Replay, Recovery

### ✅ Console (16 pages)
- Policy Builder (visual, 14 operators, industry templates)
- Custom Action Types (user-defined, payload schemas)
- Agent Fleet Dashboard (Bloomberg-style monitoring, trust scores)
- Integration Adapters (Slack, Email, GitHub, Webhook + circuit breaker)
- Compliance Reports (board-ready PDFs, 10 sections)
- Plus: Now, Runtime, Workspace, Approvals, Intent, History, Services, Settings, Files, Presentation

### ✅ Marketing Site (28 routes)
- Landing, /try playground, /signup, /docs, /blog (5 posts), /about, /contact, /faq, /integrations, /security, /changelog, /status, /terms, /privacy, /case-studies
- Stripe checkout (Team $49/mo, Business $99/mo), GA4, Resend, sitemap, OG images

### ✅ SDK & Adapters
- TypeScript SDK (10 modules in packages/sdk/)
- 4 integration adapters: Slack, Email, GitHub, Webhook

---

## Critical Path: v0.9 → v1.0 (4 phases, 4 weeks)

### Phase 1: Production Hardening (This Week)
_Make what we have production-safe._

| Task | Status | Priority |
|---|---|---|
| Postgres migration (SQLite → Neon) | 🔜 | P0 |
| Multi-tenant row-level security | 🔜 | P0 |
| JWT auth with refresh tokens | 🔜 | P0 |
| API key auth with scopes | 🔜 | P0 |
| WebSocket/SSE real-time push | 🔜 | P0 |
| Policy versioning + rollback | 🔜 | P1 |
| Console Fly.io deploy (real backend) | ⏸️ Needs Max | P0 |
| Error boundaries + retry logic | 🔜 | P1 |

### Phase 2: Enterprise Auth (Week 2)
_What enterprises require before signing._

| Task | Status | Priority |
|---|---|---|
| SSO/SAML/OIDC (Okta, Azure AD, Google) | 🔜 | P0 |
| RBAC (Admin, Operator, Viewer, Agent) | 🔜 | P0 |
| npm publish `@vienna/sdk` | 🔜 | P0 |
| Python SDK (`vienna-python`) | 🔜 | P1 |
| Agent mTLS / HMAC authentication | 🔜 | P1 |
| Mobile-responsive approvals | 🔜 | P1 |
| API key management UI | 🔜 | P2 |

### Phase 3: Intelligence (Week 3)
_Differentiation — move before competitors exist._

| Task | Status | Priority |
|---|---|---|
| AI-powered policy suggestions | 🔜 | P1 |
| Natural language policy creation | 🔜 | P1 |
| Agent behavior anomaly detection | 🔜 | P2 |
| Global search (Cmd+K palette) | 🔜 | P1 |
| Chaos / red team simulation mode | 🔜 | P2 |
| Notification center (in-console) | 🔜 | P2 |

### Phase 4: Scale & Compliance (Week 4)
_Enterprise-grade operations._

| Task | Status | Priority |
|---|---|---|
| SOC 2 Type I preparation (Vanta/Drata) | 🔜 | P0 |
| Multi-region (EU data residency) | 🔜 | P1 |
| Terraform provider | 🔜 | P2 |
| Billing + usage metering (Stripe) | 🔜 | P1 |
| Load test: 10K intents/second | 🔜 | P1 |
| API docs (OpenAPI 3.1, auto-gen) | 🔜 | P1 |
| Framework integration guides | 🔜 | P1 |

---

## Competitive Landscape

| Competitor | Approach | Our Advantage |
|---|---|---|
| Guardrails AI | Prompt-level filtering | We govern execution, not just prompts |
| Patronus AI | Offline evaluation/testing | We're runtime governance |
| Lakera | I/O filtering | We control the full action lifecycle |
| Arthur AI | Model monitoring | Observability ≠ authorization |
| Credo AI | Compliance docs | Paperwork ≠ runtime enforcement |
| Nobody | Warrant-based execution governance | **We're first to market** |

---

## v1.0 Launch Criteria

- [ ] 5+ enterprise pilot customers
- [ ] <500ms p99 intent-to-execution latency
- [ ] 99.9% uptime SLA
- [ ] SOC 2 Type I report
- [ ] Published SDKs (npm + PyPI) with >100 installs
- [ ] 3 framework integrations (OpenClaw, LangChain, CrewAI)
- [ ] Demo video: full lifecycle in <3 minutes
- [ ] 2,000+ GitHub stars

---

## Deferred (Explicitly Out of Scope for v1.0)

- Phase 26.2+ (Retry Orchestrator, DLQ, Recovery) — defer unless operational need
- Federation (Phase 25, 30) — single-runtime deployment for now
- FedRAMP — defer to H1 2027
- GraphQL API — REST-first

---

_Agent timescale: 4 weeks = 4 phases. Ship fast, iterate faster._
