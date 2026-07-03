# Phase 2: Console Redesign — Sidebar + Empty States + Skeletons

**Owner:** Vienna (Agent)  
**Status:** In Progress  
**Started:** 2026-07-03 14:25 EDT  
**Target Completion:** 2026-07-05 (2–3 days)  

---

## Overview

Phase 1 (wiring + colors + icons) shipped. Phase 2 focuses on **UX polish**: sidebar navigation redesign, empty states, skeleton loaders, and responsive/accessibility improvements.

**Goal:** Make console look like a $99/mo SaaS product (not alpha).

---

## Task Breakdown

### P0: Sidebar Navigation (1 day)

**Create:** `apps/console/client/src/components/layout/Sidebar.tsx`

**Design Spec (from CONSOLE-REDESIGN-BRIEF.md §3):**

```
┌──────────────────────┐
│  🔐 Vienna OS        │  ← Logo + collapse toggle
│  Org: Max's Team     │  ← Org/user name
├──────────────────────┤
│                      │
│  ⚡ Dashboard        │  ← Group header (clickable → default route)
│  📊 Activity         │  ← Items (with hover + active state)
│  📈 Analytics        │
│                      │
│  GOVERNANCE          │  ← Section header (no icon)
│  🎯 Intents          │
│  ✅ Approvals        │
│  ▶  Executions       │
│  ...                 │
│                      │
│  FLEET               │
│  🤖 Agents           │
│  🔗 Connect          │
│  📦 Templates        │
│                      │
│  PLATFORM            │
│  🔑 API Keys         │
│  🔌 Integrations     │
│  ⚙  Runtime          │
│  📁 Workspace        │
│                      │
├──────────────────────┤
│  ⚙  Settings         │  ← Footer (always visible)
│  👤 Max Anderson      │
│  🚪 Sign Out          │
└──────────────────────┘
```

**Specs:**
- **Fixed width:** 240px (expanded), 64px (collapsed)
- **Collapse toggle:** Icon in header (e.g., `<Menu/>` Lucide)
- **Active state:** Left border accent (3px, `var(--accent-primary)`) + subtle bg
- **Hover:** `background: var(--bg-hover)`
- **Mobile:** Hidden on screens <768px; replaced with hamburger in top nav
- **Responsive transitions:** All state changes use `var(--transition-base)`
- **Footer items:** Settings, User, Sign Out — sticky at bottom

**Implementation Notes:**
1. Export `NAV_GROUPS` from MainNav.tsx, reuse in Sidebar
2. Use same icon logic (Lucide components from ICON_MAP)
3. Respect collapsed state in localStorage: `localStorage.getItem('sidebar-collapsed')`
4. Mobile: Add hamburger button to top nav when sidebar hidden

**Files to Update:**
- Create: `components/layout/Sidebar.tsx`
- Update: `App.tsx` (replace `<MainNav>` with `<Sidebar>` + adjust layout)
- Update: `styles/variables.css` (add sidebar-specific tokens if needed)

---

### P1: Empty States (4–5 hours)

**Apply to these pages (in priority order):**

1. **Dashboard** (`pages/Dashboard.tsx`)
   - When no agents/proposals: "No activity yet"
   - CTA: "Connect your first agent"

2. **Fleet Dashboard** (`pages/FleetDashboardPage.tsx`)
   - When no agents: "No agents connected"
   - CTA: "Connect Agent"

3. **Approvals** (`pages/ApprovalsPage.tsx`)
   - When no pending: "All caught up!"
   - CTA: "View policy templates"

4. **Policies** (`pages/PolicyBuilderPage.tsx`)
   - When no policies: "No policies yet"
   - CTA: "Create your first policy"

5. **Compliance** (`pages/CompliancePage.tsx`)
   - When no audit events: "No events recorded"
   - CTA: "Configure monitoring"

**Template (reusable):**
```tsx
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  ctaLabel?: string;
  ctaAction?: () => void;
}

export function EmptyState({ title, description, icon, ctaLabel, ctaAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="text-6xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="text-secondary mt-2 max-w-md">{description}</p>
      {ctaLabel && (
        <button
          onClick={ctaAction}
          className="mt-6 px-6 py-2 rounded-lg"
          style={{ background: 'var(--accent-primary)', color: 'white' }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
```

**Each page:** Add conditional render at top of component data area
```tsx
if (!data || data.length === 0) {
  return <EmptyState title="..." description="..." ctaLabel="..." ctaAction={...} />;
}
```

---

### P2: Skeleton Loaders (2–3 hours)

**Replace spinners with skeleton screens (Tailwind `animate-pulse`).**

**Dashboard (metrics):**
```tsx
// OLD:
<div className="animate-spin w-8 h-8" />

// NEW:
<div className="h-12 w-24 bg-secondary rounded animate-pulse" />
```

**Fleet Agent List (3 rows):**
```tsx
{isLoading && (
  <div className="space-y-2">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-16 bg-secondary rounded animate-pulse" />
    ))}
  </div>
)}
```

**Approvals Queue (card skeleton):**
```tsx
{isLoading && (
  <div className="p-4 border rounded" style={{ borderColor: 'var(--border-default)' }}>
    <div className="h-6 bg-secondary rounded mb-3 w-3/4 animate-pulse" />
    <div className="h-4 bg-secondary rounded w-1/2 animate-pulse" />
  </div>
)}
```

**Apply to:**
- Dashboard: metrics, activity timeline
- Fleet: agent list
- Approvals: pending approvals list
- Policies: policy list
- Compliance: audit event list

---

### P3: Polish Pass (4–6 hours)

#### Responsive Testing
- **Mobile (320px):** Sidebar hidden, hamburger in top nav, pages stack vertically
- **Tablet (768px):** Sidebar visible, content beside, touch-friendly buttons
- **Desktop (1280px):** Full layout, sidebar + content, optimal use of space

#### Keyboard Navigation
- Tab through sidebar nav items (left → right → down)
- Space/Enter to activate item or collapse group
- Escape to close mobile menu
- Focus states visible (outline or border highlight)

#### Accessibility
- ARIA labels on nav groups + items
- `aria-expanded` on collapse buttons
- `aria-current="page"` on active nav item
- Alt text on sidebar icons

#### Lighthouse Audit
```bash
cd apps/console/client
npm run build
# Use Chrome DevTools: Lighthouse tab
# Run audit, target scores:
# - Performance: ≥85
# - Accessibility: ≥90
# - Best Practices: ≥90
# - SEO: ≥90
```

#### Dark Mode Verification
- Toggle dark/light in `/settings`
- All colors should update (use `var(--*)` tokens, not hardcoded)
- Sidebar colors: `var(--bg-primary)`, `var(--border-default)`, `var(--text-primary)`
- Active item: `var(--accent-primary)`

#### Console Errors
```bash
npm run dev
# Open browser console (F12)
# Navigate all pages
# Verify: 0 errors, 0 warnings
```

---

## Submission Checklist

Before opening PR:

- [ ] `npm run build` passes (0 errors, 0 warnings)
- [ ] Sidebar renders correctly (desktop + tablet + mobile)
- [ ] Sidebar collapse/expand works (icon click + localStorage persist)
- [ ] Mobile hamburger menu works (opens/closes)
- [ ] Empty states on 5+ core pages
- [ ] Skeleton loaders on data-loading pages
- [ ] Dark mode toggle works (all colors update)
- [ ] No console errors
- [ ] Responsive layout correct on 3 breakpoints
- [ ] Keyboard navigation works (Tab, Space, Escape)
- [ ] Lighthouse scores ≥85 all categories

---

## Opening the PR

```bash
git checkout -b fix/console-redesign-phase2
# ... make all changes ...
git add -A
git commit -m "fix: console redesign Phase 2 — sidebar + empty states + skeletons

- Sidebar navigation redesign (240px fixed, collapsible, mobile responsive)
- Empty states on Dashboard, Fleet, Approvals, Policies, Compliance
- Skeleton loaders for data-loading pages (replace spinners)
- Responsive testing (mobile/tablet/desktop)
- Accessibility improvements (ARIA labels, keyboard nav)
- Dark mode verified (all colors update via CSS variables)
- Lighthouse scores: Performance 85+, Accessibility 90+, Best Practices 90+
"

git push origin fix/console-redesign-phase2
```

**Then ping Aiden in thread with:**
- PR link
- Before/after screenshots (sidebar, empty state, mobile)
- Lighthouse scores
- Confirmation of all checklist items

---

## References

- **Design Brief:** `CONSOLE-REDESIGN-BRIEF.md` §2–4 (visual identity, layout, navigation)
- **Color System:** `apps/console/client/src/styles/variables.css` (all design tokens)
- **Current MainNav:** `apps/console/client/src/components/layout/MainNav.tsx` (nav structure, icons)
- **Lucide Icons:** https://lucide.dev (icon component library)

---

## Timeline

- **Day 1 (Jul 3–4):** Sidebar design + implementation (4–6 hours)
- **Day 2 (Jul 4–5):** Empty states + skeletons (3–4 hours)
- **Day 3 (Jul 5):** Polish pass + testing (2–3 hours), PR review

**Target:** PR opened by end of Day 2, merged by end of Day 3.

---

## Questions?

- **Design:** Refer to CONSOLE-REDESIGN-BRIEF.md
- **Styling:** Check `styles/variables.css`
- **Icons:** Lucide docs or MainNav.tsx for pattern
- **Blocked:** Ping Aiden in thread

Good luck! 🚀
