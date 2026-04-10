# Vienna OS Console — Roadmap
**Last updated:** 2026-04-10
**Owner:** Aiden (COO)
**Lead:** Max Anderson

---

## PHASE 1: Verify & Stabilize ✅ (Apr 10)
- [x] Fix Action Types SQL error (tenantQuery on global table)
- [x] Fix Execution Pipeline 404s (6 missing endpoints)
- [x] Fix Settings execution modes (missing endpoint)
- [x] Fix "17 agents connected" lie (stale heartbeat detection)
- [x] Fix Agent Templates empty page (create table + seed 6 templates)
- [x] Fix Policy Templates /packs 404 (add endpoint)
- [x] Rewrite DB adapter (pg.Pool instead of @vercel/postgres)
- [x] Clean up 38 stale branches → only `main` remains
- [ ] Confirm fixes live after hard refresh (Max)

## PHASE 2: Data Richness (Apr 11-13)
- [ ] Execution Pipeline visualization — wire INTENT/PLAN/POLICY/WARRANT/EXECUTION/VERIFICATION boxes to real DB counts from proposals, warrants, audit_log
- [ ] Dashboard widgets — live metrics: agent count, active warrants, policy evals, recent events
- [ ] Fleet page — real agent heartbeat status, last activity, trust scores from agent_registry
- [ ] Compliance reports — generate from audit_log, exportable PDF/CSV
- [ ] Executions page — pull from execution_log with state filtering, timeline view

## PHASE 3: Interactive Features (Apr 14-18)
- [ ] Activity Feed — real-time SSE streaming of governance events
- [ ] Policy Builder — dry-run policy evaluation against sample intents
- [ ] Agent detail pages — per-agent execution history, warrant usage, risk profile
- [ ] Global search — unified search across agents, warrants, policies, audit events
- [ ] Notification center — in-app alerts for denied intents, expired warrants, violations
- [ ] Workspace file browser — view/edit policy files, agent configs

## PHASE 4: Polish & Production-Ready (Apr 19-22)
- [ ] Full theme audit — terminal gold consistency across all 24 pages
- [ ] Empty states — meaningful CTAs for Integrations, Incidents, Investigations, etc.
- [ ] Mobile responsiveness — all pages usable on tablet/phone
- [ ] Performance — lazy loading, bundle optimization, API response caching
- [ ] Error boundaries — graceful fallback UI instead of toast spam
- [ ] Accessibility — keyboard navigation, screen reader support

## PHASE 5: GTM Support (Apr 23+)
- [ ] Demo mode with realistic governance timeline (one-click seed)
- [ ] Sales demo flow — guided walkthrough of key features
- [ ] Console screenshots/recordings for marketing site refresh
- [ ] Embeddable governance stats widget for regulator.ai homepage
- [ ] Customer onboarding flow refinement from pilot feedback
- [ ] Multi-tenant isolation verification for production customers
- [ ] SOC 2 readiness — audit log retention, access controls, encryption at rest

---

## Architecture Notes

### Deployment
- **console.regulator.ai** → Vercel project `console-proxy` (prj_phwymDCiXZSNGaqV3oYWfb3t1Mhi)
- **Frontend:** React/Vite → built in `apps/console/client/`, copied to `apps/console-proxy/public/`
- **Backend:** `apps/console-proxy/api/server.js` (~2200 lines catch-all) + dedicated route files
- **Database:** Neon Postgres, `regulator` schema

### Key Rules
- `tenantQuery()` — NEVER use on tables without `tenant_id` column (action_types, agent_templates, policy_templates are global)
- `@vercel/postgres` sql tagged template — DO NOT USE (pooled connections break SET search_path). Use native `pg.Pool` with `on('connect')` handler.
- Frontend changes require: `npx vite build` in client/ → copy `dist/` to `console-proxy/public/`
- All branches should be deleted after merge (auto-delete not configured on repo)
