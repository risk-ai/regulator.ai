# Console Premium Upgrade Plan

**Goal:** Elevate every console page to premium quality with real data wiring and competitive differentiation

**Date:** 2026-04-12  
**Status:** In Progress

---

## Priority 1: High-Traffic Pages (Immediate)

### 1. Risk Heatmap (`/risk-heatmap`)
**Current:** Mock Math.random() data  
**Target:** Real agent × tier action counts from audit_log  
**Endpoint Needed:** `GET /api/v1/analytics/risk-heatmap?range=7d`  
**Impact:** This is our most differentiated feature - must be real

### 2. Governance Chain (`/governance-chain`)
**Current:** Check if real  
**Target:** Live pipeline visualization from proposals → warrants → executions  
**Endpoint:** Already exists via `/api/v1/governance/chain`  
**Action:** Verify wiring

### 3. Governance Live (`/governance-live`)
**Current:** Check if SSE connected  
**Target:** Real-time SSE stream of governance events  
**Endpoint:** `/api/v1/events/stream`  
**Action:** Verify SSE connection

### 4. Action Types (`/action-types`)
**Current:** Mock data  
**Target:** Real registered action types from action_types table  
**Endpoint:** `GET /api/v1/action-types` (already exists)  
**Action:** Wire to real data

---

## Priority 2: Core Workflow Pages

### 5. Intent Submission (`/intent`)
**Current:** Check if fully functional  
**Target:** Full pipeline: submit → policy eval → warrant → execution  
**Endpoint:** `POST /api/v1/agent/intent`  
**Action:** Add real-time feedback, show pipeline progress

### 6. Executions List (`/executions`)
**Current:** Check mock data usage  
**Target:** Real execution_log + execution_steps data  
**Endpoint:** `GET /api/v1/executions`  
**Action:** Wire pagination, filtering, detail links

### 7. Agent Templates (`/agent-templates`)
**Current:** Check if seeded  
**Target:** Real agent_templates from database  
**Endpoint:** `GET /api/v1/agent-templates` (needs creation or use existing)  
**Action:** Create/wire endpoint

### 8. Policy Templates (`/policy-templates`)
**Current:** Check if seeded  
**Target:** Real policy_templates from database  
**Endpoint:** `GET /api/v1/policy-templates` (needs creation or use existing)  
**Action:** Create/wire endpoint

---

## Priority 3: Admin/Settings Pages

### 9. API Keys (`/api-keys`)
**Current:** Check functionality  
**Target:** Full CRUD for api_keys table  
**Endpoint:** `GET/POST/DELETE /api/v1/api-keys`  
**Action:** Verify all operations work

### 10. Settings (`/settings`)
**Current:** Check RBAC panel  
**Target:** User settings, RBAC management, org config  
**Endpoint:** Multiple endpoints already exist  
**Action:** Add user profile editing, password change

---

## Priority 4: Reporting Pages

### 11. Activity Feed (`/activity`)
**Current:** Check if real audit_log  
**Target:** Real-time audit_log stream with filters  
**Endpoint:** `GET /api/v1/audit`  
**Action:** Add date range, severity filters

### 12. History (`/history`)
**Current:** Check scope  
**Target:** Historical governance decisions with search  
**Endpoint:** `GET /api/v1/audit` with extended retention  
**Action:** Add search, export, date range

---

## Competitive Differentiation Features (New)

### 13. Agent Health Monitoring
**Page:** New dashboard widget  
**Feature:** Real-time agent heartbeat, last-seen, error rates  
**Endpoint:** Extend `/api/v1/fleet/agents` with health metrics  
**Diff:** No competitor shows agent health in real-time

### 14. Policy Impact Analysis
**Page:** New `/policy-impact` page  
**Feature:** Show how policy changes affect approval rates  
**Endpoint:** `GET /api/v1/analytics/policy-impact`  
**Diff:** Unique to Vienna - policy A/B testing visualization

### 15. Compliance Export Automation
**Page:** Enhance `/compliance`  
**Feature:** One-click SOC 2 / GDPR / HIPAA report generation  
**Endpoint:** `POST /api/v1/compliance/export`  
**Diff:** Automated compliance vs manual log review

### 16. Warrant Dependency Graph
**Page:** New `/warrant-graph` page  
**Feature:** Visual graph of warrant chains (parent → child relationships)  
**Endpoint:** `GET /api/v1/warrants/graph`  
**Diff:** No competitor visualizes approval dependencies

---

## Implementation Order

**Week 1 (Immediate):**
1. Risk Heatmap real data (highest visibility)
2. Governance Chain/Live verification
3. Intent page real-time feedback
4. Action Types real data

**Week 2 (Core):**
5. Executions real data + pagination
6. Agent/Policy Templates wiring
7. Activity Feed filters
8. API Keys full CRUD

**Week 3 (Differentiation):**
9. Agent Health Monitoring widget
10. Policy Impact Analysis page
11. Warrant Dependency Graph
12. Compliance Export automation

---

## Success Criteria

**For each page:**
- ✅ Zero Math.random() or mock data
- ✅ Real backend API calls with error handling
- ✅ Loading states (skeletons, spinners)
- ✅ Empty states with helpful CTAs
- ✅ Error states with retry actions
- ✅ Premium visual polish (animated globe, terminal theme)
- ✅ Responsive mobile design
- ✅ At least one unique feature vs competitors

**Overall:**
- ✅ All 30+ pages production-ready
- ✅ 100% real data (no mocks)
- ✅ Best-in-class UX (faster, clearer than CompFly/Obsidian)
- ✅ 3+ unique competitive advantages deployed

---

## Current Status

**Premium Pages (Already Complete):**
- ✅ DashboardPremium (real data)
- ✅ FleetPremium (real agent_registry)
- ✅ ApprovalsPremium (real proposals)
- ✅ AnalyticsPremium (real metrics)
- ✅ CompliancePremium (real audit_log)
- ✅ PolicyBuilderPremium (real policy_rules)
- ✅ DemoModePage (intentionally mock)
- ✅ EmbedWidgetPage (preview generator)

**Needs Upgrade:**
- ⚠️ RiskHeatmapPage (mock data → real)
- ⚠️ ActionTypesPage (check wiring)
- ⚠️ GovernanceChainPage (verify real)
- ⚠️ GovernanceLivePage (verify SSE)
- ⚠️ IntentPage (add progress feedback)
- ⚠️ ExecutionsPage (verify real + pagination)
- ⚠️ AgentTemplatesPage (wire real data)
- ⚠️ PolicyTemplatesPage (wire real data)
- ⚠️ ActivityFeedPage (add filters)
- ⚠️ ApiKeysPage (verify CRUD)

---

**Next:** Start with Priority 1 (Risk Heatmap real data)
