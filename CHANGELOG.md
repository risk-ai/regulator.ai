# Changelog

All notable changes to Vienna OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.10.1] - 2026-03-28

### Infrastructure
- **BREAKING:** Migrated from Fly.io to NUC (maxlawai) deployment
- Console now runs on local NUC infrastructure with Cloudflare Tunnel
- Fly.io app (vienna-os) DESTROYED and decommissioned
- Database migrated from Fly Postgres to Neon (shared with portfolio sites)
- Auto-deploy system via cron (~/vienna-auto-deploy.sh every 10 minutes)
- Systemd services: vienna-console, cloudflared-vienna
- URL unchanged: https://console.regulator.ai (now via Cloudflare Tunnel)

### Changed
- Deployment process now uses NUC + Cloudflare instead of Fly.io
- All documentation updated to reflect new infrastructure
- Health checks adapted for local deployment + tunnel setup

### Added
- **Custom Actions** — Dynamic action registration system for tenant-specific actions
- **Visual Policy Builder** — No-code governance rules with 11 operators (==, !=, >, <, >=, <=, contains, starts_with, ends_with, in, not_in)
- **Agent Fleet Dashboard** — Auto-tracking of all governed agents with success rates and activity timelines
- **Policy Notifications** — Slack + Email adapters integrated with Policy Builder for runtime alerts
- **Open-Source Release** — Apache 2.0 license, comprehensive README, contribution guidelines
- **OpenClaw Integration Tool** — `vienna-intent` tool for OpenClaw agents to submit governed intents

### Changed
- Agent Intent Bridge now checks both static allowlist + custom actions per tenant
- Policy Engine integrated into Intent Gateway (evaluated after validation, before execution)
- Source validation broadened to accept multiple platforms (openclaw, web, api, try)
- Login screen redesigned with dark theme matching console aesthetic

### Fixed
- Dashboard 100% failure rate bug (show "—" when no executions)
- Schema tenant_id columns added to all base tables (objectives, execution_ledger_events, execution_ledger_summary)
- agent_activity view corrected to use execution_ledger_summary table + correct column names

### Security
- Rate limiting middleware (100 req/15min general, 5 req/15min auth, 1000 req/15min agent intents)
- Helmet.js security headers (CSP, HSTS, XSS protection, clickjacking prevention)
- React ErrorBoundary with fallback UI and recovery actions

## [0.10.0] - 2026-03-25

### Highlights
Phase 15 features shipped in 8 hours:
- Custom Actions (30 min)
- Visual Policy Builder (2 hrs) — **KILLER FEATURE**
- Agent Fleet Dashboard (3 hrs)
- Policy Notifications (20 min)
- Open-Source Prep (90 min)

Q2 Roadmap: 80% complete

### Added
- Multi-tenant architecture foundation (tenant_id columns, tenant-scoped queries)
- Policy evaluation engine with 11 operators
- Agent auto-registration from execution ledger
- Slack adapter (interactive approval buttons, policy notifications, violation alerts)
- Email adapter (dark-theme HTML, daily governance digest)
- GitHub adapter (PR status checks, warrant metadata, audit trail comments)

### API Endpoints Added
**Custom Actions:**
- POST /api/v1/actions (create)
- GET /api/v1/actions (list)
- GET /api/v1/actions/:id (get)
- PATCH /api/v1/actions/:id (update)
- DELETE /api/v1/actions/:id (delete)

**Policies:**
- POST /api/v1/policies (create)
- GET /api/v1/policies (list)
- GET /api/v1/policies/:id (get)
- PATCH /api/v1/policies/:id (update)
- DELETE /api/v1/policies/:id (delete)
- POST /api/v1/policies/:id/test (test against sample intent)

**Agent Fleet:**
- GET /api/v1/fleet (overview + statistics)
- GET /api/v1/fleet/agents (list)
- GET /api/v1/fleet/agents/:id (details)
- GET /api/v1/fleet/agents/:id/activity (timeline)
- PATCH /api/v1/fleet/agents/:id (update status)

### Documentation
- README.md (13.5KB) — Problem statement, architecture, quick start, API reference, deployment guide
- CONTRIBUTING.md (13.1KB) — Code of conduct, development workflow, testing guidelines, coding standards
- LICENSE (Apache 2.0) — Commercial-friendly open-source license

### Infrastructure
- Unified monolith deployment (164 MB Docker image)
- SQLite State Graph with WAL mode
- Fly.io production deployment (https://vienna-os.fly.dev)
- Phase 28 operational (111/111 tests passing)

## [0.9.0] - 2026-03-22

### Added
- Phase 28 system integration tests
- Intent tracing with lifecycle events
- Quota enforcement
- Attestation engine
- Cost tracking

## [0.8.0] - 2026-03-20

### Added
- Warrant system (transactional execution authorization)
- Execution ledger (append-only audit trail)
- State Graph versioning
- Verification receipts

## [0.7.0] - 2026-03-18

### Added
- Intent Gateway (canonical ingress)
- Policy Engine foundation
- Risk tier classification (T0/T1/T2)
- Three-tier approval workflow

## Earlier Versions

See git history for Phase 1-6 development.

---

## Release Naming Convention

**Version Format:** MAJOR.MINOR.PATCH

- **MAJOR:** Breaking API changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes

**Phase Progression:**
- Phase 1-10: Foundation (intent pipeline, state graph, warrants)
- Phase 11-20: Governance (policies, quotas, attestation)
- Phase 21-30: Integration (OpenClaw, Slack, GitHub, cost tracking)
- Phase 31+: Scale (federation, multi-cloud, enterprise features)

---

## Roadmap

**Q2 2026 (Current):**
- [x] Core pipeline MVP
- [x] Dashboard v1 (13 pages)
- [x] Policy builder
- [x] Fleet dashboard
- [x] Custom actions
- [x] Slack/Email adapters
- [x] Open-source release
- [ ] OpenClaw deep integration (in progress)
- [ ] Multi-tenant session management
- [ ] SDK npm publish

**Q3 2026:**
- [ ] Compliance reports (SOC 2, GDPR)
- [ ] Policy versioning + rollback
- [ ] Agent sandboxing (VM2)
- [ ] Cost tracking per agent
- [ ] SLA enforcement

**Q4 2026:**
- [ ] Federated ledger (cross-node sync)
- [ ] Warrant marketplace
- [ ] Policy templates library
- [ ] Agent certification program
