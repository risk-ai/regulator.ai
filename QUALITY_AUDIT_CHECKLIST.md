# Quality Audit Checklist

**Date:** 2026-04-14  
**Scope:** All console + marketing pages  
**Goal:** Production-ready quality across mobile, loading states, errors, keyboard nav

---

## Audit Criteria

### 1. Mobile Responsive ✓
- [ ] Works on 375px (iPhone SE)
- [ ] Works on 768px (iPad)
- [ ] Works on 1024px+ (Desktop)
- [ ] Touch targets ≥44px
- [ ] Text readable (min 14px)
- [ ] No horizontal scroll

### 2. Loading States ✓
- [ ] Skeleton loaders for data
- [ ] Spinners for actions
- [ ] Progress indicators for multi-step
- [ ] No layout shift during load

### 3. Empty States ✓
- [ ] Helpful message
- [ ] Clear CTA
- [ ] Relevant icon
- [ ] Not just "No data"

### 4. Error States ✓
- [ ] Error message shown
- [ ] Retry action available
- [ ] Network errors handled
- [ ] 404/500 pages exist

### 5. Keyboard Navigation ✓
- [ ] Tab order logical
- [ ] Focus visible
- [ ] Escape closes modals
- [ ] Enter submits forms
- [ ] Arrow keys for lists

### 6. Accessibility ✓
- [ ] Alt text on images
- [ ] ARIA labels on interactive elements
- [ ] Color contrast ≥4.5:1
- [ ] Screen reader friendly

### 7. Performance ✓
- [ ] Initial load <3s
- [ ] Images optimized
- [ ] Code split by route
- [ ] API responses cached

---

## Page-by-Page Audit

### Console Pages (37 total)

#### Dashboard & Overview
- [ ] DashboardPremium (`/`)
- [ ] DashboardControl (`/dashboard`)
- [ ] NowPage (`/now`)
- [ ] ActivityFeedPage (`/activity`)

#### Governance
- [ ] IntentPage (`/intent`)
- [ ] ApprovalsPage (`/approvals`)
- [ ] ApprovalsPremium (`/approvals`)
- [ ] GovernanceChainPage (`/governance-chain`)
- [ ] GovernanceLivePage (`/governance-live`)
- [ ] ExecutionPage (`/execution`)
- [ ] ExecutionsPage (`/executions`)
- [ ] ExecutionDetailPage (`/execution/:id`)

#### Fleet Management
- [ ] FleetPremium (`/fleet`)
- [ ] FleetDashboardPage (`/fleet-old`)
- [ ] AgentDetailPage (`/agent/:id`)
- [ ] ConnectAgentPage (`/connect`)
- [ ] AgentTemplatesPage (`/agent-templates`)
- [ ] ActionTypesPage (`/action-types`)

#### Policies
- [ ] PolicyBuilderPremium (`/policies`)
- [ ] PolicyBuilderPage (`/policies-legacy`)
- [ ] PolicyTemplatesPage (`/policy-templates`)

#### Analytics & Reports
- [ ] AnalyticsPremium (`/analytics`)
- [ ] AnalyticsPage (`/analytics-legacy`)
- [ ] RiskHeatmapPage (`/risk-heatmap`)
- [ ] CompliancePremium (`/compliance`)
- [ ] CompliancePage (`/compliance-legacy`)
- [ ] UsageDashboardPage (`/usage`)

#### Configuration
- [ ] IntegrationsPremium (`/integrations`)
- [ ] IntegrationsPage (`/integrations-legacy`)
- [ ] WebhookConfigPage (`/webhooks`)
- [ ] TeamManagementPage (`/team`)
- [ ] SettingsPage (`/settings`)
- [ ] ApiKeysPage (`/api-keys`)

#### Tools & Utilities
- [ ] SimulationPage (`/simulation`)
- [ ] DemoModePage (`/demo`)
- [ ] EmbedWidgetPage (`/embed-widget`)
- [ ] RuntimePage (`/runtime`)
- [ ] ServicesPage (`/services`)
- [ ] WorkspacePage (`/workspace`)
- [ ] HistoryPage (`/history`)

### Marketing Pages

- [ ] Home (`/`)
- [ ] Pricing (`/pricing`)
- [ ] Changelog (`/changelog`)
- [ ] Status (`/status`)
- [ ] Interactive Demo (`/demo`)
- [ ] Customer Portal (`/portal`)
- [ ] FAQ (`/faq`)
- [ ] Community (`/community`)
- [ ] SDK (`/sdk`)

---

## Automated Checks

### Lighthouse Scores (Target)
- Performance: ≥90
- Accessibility: ≥95
- Best Practices: ≥95
- SEO: ≥90

### Bundle Analysis
- Total size: <500KB gzipped
- Largest chunk: <200KB
- No duplicate dependencies

### API Health
- All endpoints return 200 or 401 (not 500)
- Response times <500ms p95
- No N+1 queries

---

## Critical Issues Found

### High Priority
- [ ] (None yet)

### Medium Priority
- [ ] Mobile nav may need adjustment on small screens
- [ ] Loading states missing on some legacy pages

### Low Priority
- [ ] Keyboard shortcuts not documented
- [ ] Some icons lack aria-labels

---

## Sign-off

- [ ] Mobile responsive: All critical pages tested
- [ ] Loading states: All data fetches have loaders
- [ ] Empty states: All lists have empty state UI
- [ ] Error states: All API calls handle errors
- [ ] Keyboard nav: All interactive elements accessible
- [ ] Performance: Bundle optimized, lazy loading enabled

**Status:** 🔄 In Progress  
**Completion:** 0% (0/37 console + 0/9 marketing = 0/46 total)
