# Vienna OS — Product Roadmap to v1.0

_Updated: 2026-03-26 14:25 EDT | 76 commits today_

---

## Phase 1: Production Hardening ✅ COMPLETE
- ✅ Postgres migration (tenants, users, api_keys, refresh_tokens)
- ✅ Multi-tenant row-level security
- ✅ JWT auth + refresh tokens (15min/7day TTL)
- ✅ API key auth with scopes + rate limiting
- ✅ SSE real-time push (15 event types, tenant filtering, 30s heartbeat)
- ✅ Event bus (100-event buffer, rate tracking)
- ✅ Policy versioning + evaluation caching + conflict detection
- ✅ Error boundaries + retry logic
- ✅ Console deployed on NUC + Cloudflare Tunnel (console.regulator.ai)
- ✅ Fly.io decommissioned — replaced with local NUC + systemd + auto-deploy cron

## Phase 2: Enterprise Auth ✅ COMPLETE
- ✅ RBAC (admin/operator/viewer/agent, 30+ permissions)
- ✅ SSO/OIDC (Google, Okta, Azure AD, Auth0 + JIT provisioning)
- ✅ TypeScript SDK (npm publish ready, 6 modules + framework wrappers)
- ✅ Python SDK (PyPI ready, zero-dependency)
- ✅ OpenClaw governance plugin (enforce/audit/dry-run)
- ✅ API key management routes (create/list/revoke)
- ✅ Mobile-responsive approvals
- ✅ Agent HMAC authentication

## Phase 3: Intelligence ✅ COMPLETE
- ✅ AI policy suggestions (6 pattern detectors)
- ✅ Natural language policy creation (7 template patterns)
- ✅ Anomaly detection (velocity, scope, error, time, pattern break)
- ✅ Chaos/red team simulation (6 scenarios: flood, scope creep, budget, concurrent, expired warrant, tampering)
- ✅ Global search (Cmd+K command palette)
- ✅ Notification center (SSE events)

## Phase 4: Scale & Compliance — ~90%
- ✅ OpenAPI 3.1 specification (complete API docs)
- ✅ Terraform provider schema (6 resources + 2 data sources)
- ✅ Billing + usage metering (per-tenant tracking, plan limits, overage alerts)
- ✅ Billing DB migration (usage_events, usage_summaries, billing_alerts)
- ✅ Framework integration guides (OpenClaw, LangChain, CrewAI, AutoGen)
- ✅ Demo video script
- ✅ SOC 2 controls documentation (95% Type I ready)
- ✅ Security hardening checklist + incident response
- ✅ Multi-region service (us-east, eu-west, ap-southeast + GDPR data residency)
- ✅ Performance optimizer (intent dedup, warrant cache, batch audit, p50/95/99 metrics)
- ✅ Database optimization (composite, partial, GIN indexes — 85-95% query speedup)
- ✅ Load test script (configurable RPS, tier distribution)
- ✅ Test suite (warrant, risk-tier, policy-suggestions, integration, SDK)
- ✅ CI/CD pipeline (GitHub Actions) + Docker Compose + Makefile
- ✅ Patent filed (USPTO #64/018,152)
- 🔜 npm publish + PyPI publish (SDKs build-verified, awaiting credentials)
- ✅ SOC 2 compliance docs complete (5 policy documents)
- 🔜 SOC 2 Type I audit engagement ($15-30K)

---

## v1.0 Launch Criteria

- [x] Core governance pipeline (7 services)
- [x] T0-T3 risk tiers with HMAC-signed warrants
- [x] TypeScript + Python SDKs
- [x] 4+ framework integrations
- [x] JWT + API key + SSO auth
- [x] RBAC (4 roles, 30+ permissions)
- [x] AI policy suggestions + natural language policies
- [x] Anomaly detection + chaos simulation
- [x] Real-time event streaming (15 event types)
- [x] OpenAPI 3.1 spec
- [x] Billing/metering infrastructure
- [x] Console deployed (NUC + Cloudflare Tunnel at console.regulator.ai)
- [ ] Published SDKs (npm + PyPI) — builds verified, awaiting publish
- [ ] 5+ enterprise pilot customers
- [ ] Demo video recorded
- [ ] SOC 2 Type I
- [ ] 2,000+ GitHub stars
