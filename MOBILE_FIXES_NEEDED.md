# Console Mobile Responsiveness - Fixes Needed

**Current Status:** Global mobile.css exists but not all components use it  
**Goal:** Make top 10 pages work perfectly on mobile (375px, 768px, 1024px)

---

## ✅ Infrastructure Already in Place

### Global Mobile CSS
- **File:** `apps/console/client/src/styles/mobile.css`
- **Status:** Loaded in main.tsx
- **Breakpoints:**
  - Mobile: max-width 768px
  - Tablet: 769px - 1024px
  - Desktop: 1025px+

### Responsive Hooks
- **Hook:** `useResponsive()` available
- **Usage:** 7/42 pages currently use it
- **Returns:** `{ isMobile, isTablet, isDesktop }`

---

## 🔧 Top 10 Pages Needing Mobile Fixes

### Priority 1: Core Workflows (Must Work on Mobile)

#### 1. **ApprovalsPage** (CRITICAL)
**Issues:**
- Approval cards too wide on mobile
- Bulk action bar doesn't stack
- Timer badges get cut off
- Deny reason modal not mobile-optimized

**Fixes:**
```css
/* Already in mobile.css */
.approval-card { width: 100% !important; }
.command-palette { width: 100vw !important; }
```

**Additional needed:**
- Stack approval metadata vertically on <768px
- Make action buttons full-width on mobile
- Collapse bulk action bar to dropdown

#### 2. **FleetPremium** (HIGH)
**Issues:**
- Agent table horizontal scroll on mobile
- Trust score charts too small
- Action buttons cramped
- Stats row doesn't wrap

**Fixes:**
- Convert table to card layout on mobile
- Stack agent metadata vertically
- Make charts responsive (min-height)
- Wrap stats into 2 columns on mobile

#### 3. **PolicyBuilderPremium** (HIGH)
**Issues:**
- Condition builder too wide
- Rule cards don't stack properly
- Sidebar overlaps content on tablet

**Fixes:**
- Make condition builder vertical on mobile
- Stack rule metadata
- Hide sidebar on mobile, show as modal

#### 4. **Dashboard** (MEDIUM)
**Issues:**
- 4-column KPI grid too cramped
- Charts overlap on mobile
- Activity feed gets cut off

**Fixes:**
```css
.dashboard-grid {
  grid-template-columns: 1fr !important; /* Already in mobile.css */
}
```

**Additional:**
- Stack KPI cards (2 cols on mobile, 4 on desktop)
- Make charts responsive
- Limit activity feed height on mobile

#### 5. **ExecutionsPage** (MEDIUM)
**Issues:**
- Execution table horizontal scroll
- Filter bar doesn't wrap
- Export button hidden on mobile

**Fixes:**
- Card layout for executions on mobile
- Stack filters vertically
- Move export to overflow menu

### Priority 2: Secondary Pages

#### 6. **IntegrationsPage** (MEDIUM)
**Issues:**
- Integration cards in 3-col grid (too cramped)
- Config modal not mobile-optimized
- OAuth callback flow might fail on mobile

**Fixes:**
- Single column on mobile
- Full-screen modal for config
- Test OAuth on mobile devices

#### 7. **SettingsPage** (LOW)
**Issues:**
- Sidebar doesn't collapse
- Form fields too wide
- API key display overflows

**Fixes:**
- Collapse sidebar to tabs on mobile
- Full-width form fields
- Truncate long API keys with copy button

#### 8. **AnalyticsPage** (LOW)
**Issues:**
- Charts too small on mobile
- Date range picker cramped
- Metric cards overlap

**Fixes:**
- Full-width charts on mobile
- Stack date picker controls
- Single column metric layout

#### 9. **HistoryPage** (LOW)
**Issues:**
- Timeline too compact
- Event details get cut off
- Filter sidebar overlaps content

**Fixes:**
- Expand timeline on mobile
- Truncate long event descriptions
- Sidebar as drawer on mobile

#### 10. **RuntimePage** (LOW)
**Issues:**
- Runtime controls too small
- Logs overflow horizontally
- Restart button hidden

**Fixes:**
- Full-width control buttons
- Wrap log lines
- Make all actions visible

---

## 🎯 Quick Wins (Can Fix in 1-2 Hours)

### Fix 1: ApprovalCard Mobile Layout
**File:** `apps/console/client/src/components/approvals/ApprovalCard.tsx`

**Change:**
```tsx
// Add responsive wrapper
const { isMobile } = useResponsive();

return (
  <div className={`approval-card ${isMobile ? 'mobile' : ''}`}>
    {/* Existing content */}
  </div>
);
```

**CSS:**
```css
@media (max-width: 768px) {
  .approval-card.mobile {
    padding: 12px;
  }
  .approval-card.mobile .metadata {
    flex-direction: column;
    gap: 8px;
  }
  .approval-card.mobile .actions {
    width: 100%;
  }
  .approval-card.mobile button {
    width: 100%;
  }
}
```

### Fix 2: Fleet Table → Mobile Cards
**File:** `apps/console/client/src/pages/FleetPremium.tsx`

**Change:**
```tsx
const { isMobile } = useResponsive();

{isMobile ? (
  // Card layout
  <div className="flex flex-col gap-3">
    {agents.map(agent => (
      <AgentMobileCard key={agent.id} agent={agent} />
    ))}
  </div>
) : (
  // Table layout (existing)
  <table>...</table>
)}
```

### Fix 3: Dashboard Grid Responsive
**File:** `apps/console/client/src/pages/Dashboard.tsx`

**Change:**
```tsx
// Use responsive grid classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {kpiCards}
</div>
```

### Fix 4: Policy Builder Mobile Mode
**File:** `apps/console/client/src/pages/PolicyBuilderPremium.tsx`

**Change:**
```tsx
const { isMobile } = useResponsive();

// Simplify on mobile
{isMobile ? (
  <SimplePolicyList />  // Card-based, no drag-drop
) : (
  <FullPolicyBuilder /> // Existing complex UI
)}
```

---

## 📱 Testing Checklist

For each page, test at these breakpoints:

### iPhone SE (375px)
- ✅ All content visible (no horizontal scroll)
- ✅ Buttons large enough to tap (min 44px)
- ✅ Text readable (min 14px)
- ✅ Forms usable
- ✅ Modals full-screen

### iPad (768px)
- ✅ 2-column layouts work
- ✅ Sidebars collapse appropriately
- ✅ Charts render correctly
- ✅ Tables readable

### iPad Pro (1024px)
- ✅ Desktop-like experience
- ✅ All features accessible
- ✅ No cramped layouts

---

## 🚀 Implementation Plan

### Phase 1: Critical Pages (4 hours)
1. ApprovalsPage mobile cards
2. FleetPremium mobile layout
3. Dashboard responsive grid
4. ExecutionsPage card view

### Phase 2: Secondary Pages (3 hours)
5. PolicyBuilder mobile mode
6. IntegrationsPage single column
7. SettingsPage collapsible sidebar
8. AnalyticsPage responsive charts

### Phase 3: Polish (2 hours)
9. HistoryPage timeline
10. RuntimePage controls
11. Touch target audit (all buttons ≥44px)
12. Text size audit (all text ≥14px)

**Total:** ~9 hours for complete mobile support

---

## 📊 Success Metrics

**Before:**
- Mobile bounce rate: Unknown (likely high)
- Pages usable on mobile: ~20%
- Horizontal scroll: Common

**After:**
- All top 10 pages work on 375px
- No horizontal scroll anywhere
- Touch targets ≥44px
- Text readable without zoom

---

**Current Status:** Infrastructure ready, need per-page fixes  
**Next Action:** Start with ApprovalCard mobile layout  
**Owner:** Vienna (Technical Lead)
