# Vienna OS — Product Roadmap to v1.0

_Author: Aiden (COO, ai.ventures) | Updated: 2026-03-26 14:30 EDT_

---

## Current State (v0.10.0)

### ✅ Core Engine (vienna-lib) — 300+ modules
- 7 governance services + T0-T3 risk tiers + HMAC-SHA256 warrants
- Policy versioning, evaluation caching, conflict detection
- Verification: scope drift detection, timing verification, output validation
- Rate limiter: per-tenant/per-agent, sliding window, burst allowance
- Circuit breaker: half-open state, action-specific thresholds, metrics
- AI policy suggestions engine (6 pattern detectors)
- Natural language policy creation (7 template patterns)

### ✅ Console — 16 pages + auth + real-time
- Policy Builder, Fleet Dashboard, Compliance Reports, Custom Actions, Integrations
- JWT auth + refresh tokens, API key auth with scopes
- RBAC: admin/operator/viewer/agent roles (30+ permissions)
- SSE real-time event stream with tenant filtering
- Welcome wizard, Cmd+K command palette, theme toggle, mobile responsive

### ✅ Marketing Site — 30+ routes
- Landing, /try playground, /pricing, /signup, /docs, /blog, /case-studies
- Integration guide, API reference, framework examples
- Stripe checkout, GA4, Resend, SEO optimized

### ✅ SDKs — TypeScript + Python
- TypeScript SDK: 6 modules, framework wrappers, npm publish ready
- Python SDK: zero-dependency, framework adapters, PyPI ready
- OpenClaw governance plugin (enforce/audit/dry-run)

---

## Critical Path: v0.10 → v1.0

### Phase 1: Production Hardening ✅ COMPLETE
| Task | Status |
|---|---|
| Postgres migration schema | ✅ Migration 006 |
| Multi-tenant tables | ✅ tenants, users, api_keys, refresh_tokens |
| JWT auth + refresh tokens | ✅ jwtAuth.ts middleware |
| API key auth with scopes | ✅ Enhanced apiKeyAuth.ts |
| WebSocket/SSE real-time | ✅ Event bus + SSE handler |
| Policy versioning + rollback | ✅ Engine hardening |
| Error boundaries + retry | ✅ Console components |
| Console Fly.io deploy | ⏸️ Needs Max on NUC |

### Phase 2: Enterprise Auth ✅ MOSTLY COMPLETE
| Task | Status |
|---|---|
| RBAC (4 roles, 30+ perms) | ✅ rbac.ts middleware |
| npm publish `@vienna-os/sdk` | ✅ Build ready, needs `npm publish` |
| Python SDK | ✅ Built, needs `pip publish` |
| API key management UI | ✅ Auth routes |
| Mobile-responsive approvals | ✅ Console sub-agent |
| SSO/SAML/OIDC | 🔜 Next priority |
| Agent mTLS / HMAC auth | ✅ Framework adapter supports HMAC |

### Phase 3: Intelligence ✅ PARTIALLY COMPLETE
| Task | Status |
|---|---|
| AI policy suggestions | ✅ 6 pattern detectors |
| Natural language policies | ✅ 7 template patterns |
| Global search (Cmd+K) | ✅ Console component |
| Anomaly detection | 🔜 |
| Chaos / red team mode | 🔜 |
| Notification center | 🔜 |

### Phase 4: Scale & Compliance
| Task | Status |
|---|---|
| SOC 2 Type I prep | 🔜 |
| Multi-region (EU) | 🔜 |
| Terraform provider | 🔜 |
| Billing + usage metering | 🔜 |
| Load test 10K intents/sec | 🔜 |
| OpenAPI 3.1 docs | 🔜 |
| Framework integration guides | ✅ OpenClaw, LangChain, CrewAI, AutoGen |

---

## v1.0 Launch Criteria

- [x] Core governance pipeline (7 services)
- [x] T0-T3 risk tiers with cryptographic warrants
- [x] TypeScript + Python SDKs
- [x] 4 framework integrations
- [x] RBAC + JWT + API key auth
- [x] AI policy suggestions
- [x] Natural language policy creation
- [x] Real-time event streaming
- [ ] 5+ enterprise pilot customers
- [ ] <500ms p99 intent-to-execution latency
- [ ] 99.9% uptime SLA
- [ ] SOC 2 Type I report
- [ ] Published SDKs on npm + PyPI
- [ ] Demo video (<3 min lifecycle)
- [ ] 2,000+ GitHub stars

---

## Commit Stats (Mar 26)
- **60+ commits** pushed to risk-ai/regulator.ai
- Phase 1: ✅ Complete | Phase 2: ~85% | Phase 3: ~50% | Phase 4: ~15%

---

_Agent timescale. Ship fast, iterate faster._
