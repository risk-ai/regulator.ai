# Vienna OS — Product Roadmap to v1.0

_The most complete AI governance platform on the market._
_Author: Aiden (COO, ai.ventures) | Date: 2026-03-25_

---

## Current State (v0.9 — what we have)

### ✅ Core Engine (vienna-lib)
- 84 TypeScript declaration files, 198 JS modules
- Intent Gateway, State Graph, Policy Engine, Warrant Authority
- Execution Router, Verification Engine, Audit Trail
- Dead Letter Queue, Circuit Breakers, Rate Limiter
- Reconciliation, Replay, Recovery systems

### ✅ Console (just shipped)
- 🛡️ Policy Builder — Visual rule builder, 14 operators, industry templates
- ⚡ Custom Action Types — User-defined actions, payload schemas, dynamic routing
- 🤖 Agent Fleet Dashboard — Bloomberg-style real-time monitoring, trust scores
- 🔌 Integration Adapters — Slack, Email, GitHub, Webhook with circuit breaker
- 📊 Compliance Reports — Board-ready PDFs, 10 sections, auto-recommendations
- Plus: Now page, Runtime, Workspace, Approvals, Intent, History, Services, Settings

### ✅ Marketing Site
- 22 pages, SEO optimized, Stripe checkout, /try playground
- GA4, Resend email, sitemap, OG images

---

## Gap Analysis

### 🔴 Critical Gaps (blocking enterprise sales)
| Gap | Impact | Effort |
|-----|--------|--------|
| No multi-tenant isolation | Can't sell to >1 customer safely | Large |
| No SSO/SAML/OIDC | Enterprise deal-breaker | Medium |
| No real Postgres in console server | SQLite won't scale, no backups | Medium |
| No webhook verification (inbound) | Agents can't prove identity | Small |
| No SDK/client libraries | Every customer builds from scratch | Medium |
| No rate limiting per tenant | One customer can DOS the platform | Small |

### 🟡 Important Gaps (competitive disadvantage)
| Gap | Impact | Effort |
|-----|--------|--------|
| No real-time WebSocket push | Dashboard polling instead of live | Medium |
| No policy versioning/rollback | Can't safely iterate policies | Small |
| No RBAC (role-based access) | Every operator is admin | Medium |
| No API key management UI | Keys managed manually | Small |
| No mobile-responsive console | Operators can't approve on phone | Medium |
| No dark/light theme toggle | Minor UX gap | Small |
| No search across all entities | Can't find specific actions/agents | Medium |
| No onboarding wizard flow | New users dropped into empty console | Small |

### 🟢 Nice-to-Have (differentiation)
| Gap | Impact | Effort |
|-----|--------|--------|
| AI-powered policy suggestions | "We noticed X pattern, suggest Y rule" | Medium |
| Natural language policy creation | "Block wire transfers over $10K after hours" → rule | Medium |
| Agent behavior anomaly detection | ML-based drift detection | Large |
| Chaos engineering / red team mode | Simulate rogue agents | Medium |
| GraphQL API option | Developer preference | Medium |
| Terraform/Pulumi provider | IaC governance config | Large |
| SOC 2 Type II certification | Enterprise requirement | Large (process) |

---

## Roadmap — 4 Phases to v1.0

### Phase 1: Production Hardening (Week 1)
_Make what we have actually production-safe._

- [ ] **Postgres migration** — Move console server from SQLite to Neon Postgres (`regulator` schema)
  - Run all 5 new migrations against Neon
  - Update `db/postgres.ts` to use Neon connection pooling
  - Migrate existing SQLite data

- [ ] **Multi-tenant isolation** — Every query filtered by `tenant_id`
  - Tenant table with config, quotas, billing
  - Middleware extracts tenant from JWT/session
  - Row-level security on all tables

- [ ] **Auth upgrade** — Replace simple password auth
  - JWT-based sessions with refresh tokens
  - API key auth for agent-facing endpoints (with scopes)
  - API key management UI in Settings
  - Rate limiting per API key

- [ ] **WebSocket/SSE real-time** — Push events to console
  - Agent activity → live feed on Fleet Dashboard
  - Approval requests → push notification
  - Policy evaluation results → real-time audit trail

- [ ] **Policy versioning** — Every edit creates a new version
  - Version history with diff view
  - One-click rollback to any previous version
  - "Draft" vs "Published" states

- [ ] **Error handling & resilience**
  - Global error boundary in console
  - Retry logic on all API calls
  - Health check endpoint for load balancers
  - Graceful degradation when services unavailable

### Phase 2: Enterprise Auth & Access Control (Week 2)
_What enterprises require before signing._

- [ ] **SSO/SAML/OIDC integration**
  - Okta, Azure AD, Google Workspace
  - JIT user provisioning
  - Session management (force logout, session limits)

- [ ] **RBAC (Role-Based Access Control)**
  - Roles: Admin, Operator, Viewer, Agent (API only)
  - Permissions: manage_policies, approve_t1, approve_t2, view_audit, manage_agents, manage_integrations
  - Role assignment UI in Settings
  - Audit log for permission changes

- [ ] **SDK & Client Libraries**
  - `@vienna/sdk` — TypeScript/Node.js SDK
  - `vienna-python` — Python SDK
  - Both: submit intent, check status, register agent, receive callbacks
  - Published to npm / PyPI

- [ ] **Agent authentication**
  - mTLS or API key + HMAC signing
  - Agent identity verification on every intent
  - Agent registration flow with approval
  - Revocable agent credentials

- [ ] **Mobile-responsive console**
  - Approval actions work on mobile (primary use case: approve T2 on phone)
  - Fleet status viewable on tablet
  - Progressive enhancement, not separate app

### Phase 3: Intelligence & Advanced Features (Week 3)
_Differentiation from competitors (there aren't many yet — move fast)._

- [ ] **AI-powered policy suggestions**
  - Analyze action patterns → suggest rules
  - "You had 47 after-hours deploys last month. Create a policy?"
  - "Agent X's error rate spiked 3x. Recommend trust reduction?"
  - Suggestions appear in Policy Builder with one-click accept

- [ ] **Natural language policy creation**
  - Chat input: "Require T2 approval for financial transactions over $50,000"
  - LLM parses → generates policy rule → shows preview → operator confirms
  - Integrated into Policy Builder as a "Describe your rule" mode

- [ ] **Advanced anomaly detection**
  - Baseline agent behavior profiles (actions/hour, latency, error rate)
  - Alert when agent deviates >2σ from baseline
  - Scope creep detection (agent requesting actions outside its historical pattern)
  - Trust score auto-adjustment based on behavior

- [ ] **Chaos / Red Team mode**
  - Simulate rogue agent behavior
  - Test: "What happens if agent X submits 1000 T2 requests?"
  - Test: "What if an agent tries to exceed its budget?"
  - Results feed into policy refinement

- [ ] **Global search**
  - Search across agents, actions, policies, approvals, audit entries
  - Cmd+K command palette
  - Time-range filters, entity type filters

- [ ] **Notification center**
  - In-console notification bell
  - Configurable: which events, which channels, which severity
  - Digest mode (hourly/daily summary vs real-time)

### Phase 4: Scale & Compliance (Week 4)
_Enterprise-grade operations and compliance certification._

- [ ] **Multi-region deployment**
  - EU instance (GDPR data residency)
  - US Gov instance (FedRAMP path)
  - Data stays in region, control plane syncs metadata only

- [ ] **SOC 2 Type I preparation**
  - Document all controls
  - Implement required policies (change management, access reviews, incident response)
  - Engage auditor (Vanta/Drata automation)

- [ ] **Terraform provider** — `terraform-provider-vienna`
  - Manage policies, action types, integrations, agents as IaC
  - Plan/apply workflow mirrors Terraform patterns
  - State locking for team collaboration

- [ ] **Billing & usage metering**
  - Per-tenant usage tracking (actions/month, agents, storage)
  - Stripe integration for metered billing
  - Usage dashboard in console
  - Overage alerts and auto-scaling

- [ ] **Performance at scale**
  - Load test: 10K intents/second
  - Connection pooling optimization
  - Read replicas for audit queries
  - Archival strategy for old audit data (S3/GCS cold storage)

- [ ] **Documentation overhaul**
  - API reference (OpenAPI 3.1 spec, auto-generated)
  - Integration guides (per framework: LangChain, CrewAI, OpenClaw)
  - Deployment guides (Docker, Kubernetes, Fly.io, AWS)
  - Architecture deep-dive
  - Video walkthroughs

---

## Updated Stats (for marketing site)
After this roadmap, update the hero stats to reflect reality:

| Before | After |
|--------|-------|
| 11 Intent Actions | Custom Action Types (unlimited) |
| 5 Engine Services | 12+ Services |
| 300+ Governance Files | 12,000+ Lines of Governance Code |
| 100% Audit Coverage | 100% Audit Coverage (keep) |

---

## Competitive Landscape

| Competitor | Status | Our Advantage |
|-----------|--------|---------------|
| Guardrails AI | Prompt-level only | We govern execution, not just prompts |
| Patronus AI | Evaluation/testing | We're runtime governance, not offline testing |
| Lakera | Input/output filtering | We control the entire action lifecycle |
| Anthropic Constitutional AI | Baked into model | We're model-agnostic, framework-agnostic |
| **Nobody** | Full execution governance | We're first to market on warrant-based execution control |

The warrant model is our moat. Nobody else has cryptographically signed, time-limited, scope-constrained execution authorization for AI agents. This is novel.

---

## Success Metrics (v1.0 launch)

- [ ] 5+ enterprise pilot customers
- [ ] <500ms p99 intent-to-execution latency
- [ ] 99.9% uptime SLA
- [ ] SOC 2 Type I report
- [ ] Published SDKs (npm + PyPI) with >100 installs
- [ ] 3 framework integration guides (LangChain, CrewAI, OpenClaw)
- [ ] Demo video that shows full lifecycle in <3 minutes

---

_This roadmap operates on agent timescale. 4 weeks = 4 phases. Ship fast, iterate faster._
