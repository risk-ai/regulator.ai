# Vienna OS Console — Redesign Brief

**From:** Aiden (COO, ai.ventures)  
**To:** Vienna (regulator.ai agent)  
**Date:** 2026-04-28  
**Priority:** High  
**Requested by:** Max Anderson

---

## Objective

Redesign the Vienna OS console (console.regulator.ai) with a modern, premium SaaS aesthetic. The current terminal-gold theme served launch well — now it's time to evolve into something that looks like a $10M ARR product.

---

## Current State (What You're Working With)

### Architecture
- **Stack:** Vite + React + TypeScript + Tailwind CSS + React Router
- **Source:** `apps/console/client/src/`
- **Deployed:** `apps/console-proxy/public/` (built assets)
- **API:** `apps/console-proxy/api/server.js` (Express, ~2500 lines)

### Routes (42 pages across 5 nav groups)
1. **Dashboard** — Overview `/`, Activity Feed `/activity`, Analytics `/analytics`
2. **Governance** — Intent `/intent`, Approvals `/approvals`, Execution `/execution`, Execution Log `/executions`, Governance Chain `/governance-chain`, Live Governance `/governance-live`, Policy Builder `/policies`, Policy Templates `/policy-templates`, Compliance `/compliance`, Audit Trail `/history`
3. **Fleet** — Agent Dashboard `/fleet`, Agent Detail `/fleet/:agentId`, Connect Agent `/connect`, Agent Templates `/agent-templates`, Action Registry `/action-types`
4. **Infrastructure** — API Keys `/api-keys`, Integrations `/integrations`, Runtime `/runtime`, Workspace `/workspace`, Services `/services`
5. **Settings** — Organization `/settings`, Team `/team`, Usage `/usage`, Webhooks `/webhooks`

Plus: Simulation `/simulation`, Risk Heatmap `/risk-heatmap`, Demo Mode `/demo`, Embed Widget `/embed-widget`

### Current Design System (`styles/variables.css`)
- Dark theme: `--bg-app: #0a0a0a`, `--bg-surface: #111`
- Purple accents: `--accent-primary: #7c3aed`
- White text hierarchy with opacity layers
- Emoji-based nav icons (⚡🛡️🤖🔧⚙️)
- 5-group flyout navigation in `MainNav.tsx`

---

## Design Direction

### Visual Identity: "Dark Precision"
Think **Linear**, **Vercel Dashboard**, **Raycast** — not generic admin template.

#### Color System
- **Background:** Deep navy-black (`#0B0F1A` → `#111827`) — richer than pure black
- **Surfaces:** Layered with subtle blue undertones (`#1E293B` cards on `#111827` base)
- **Accent:** Shift from purple to **electric blue** (`#3B82F6`) or **cyan-blue** (`#06B6D4`) — feels more enterprise/governance
- **Success/Warning/Error:** Keep current semantic palette (green/amber/red) — it works
- **Text:** Keep white hierarchy but warm slightly — `#F8FAFC` primary, `#94A3B8` secondary
- **Borders:** Subtle `rgba(148,163,184,0.08)` — barely there, let spacing do the work

#### Typography
- **Headings:** Inter or Geist Sans — clean, modern, tight tracking
- **Monospace (data):** JetBrains Mono or Geist Mono — for IDs, hashes, timestamps, code
- **Kill emoji icons in nav** — replace with Lucide icons (already imported). Emoji looks amateur in a governance product.

#### Layout & Spacing
- **Sidebar navigation** (not top flyout) — vertical left sidebar, collapsible, with icon-only mode
  - Fixed ~240px expanded, ~64px collapsed
  - Groups as collapsible sections
  - Active item: left border accent + subtle bg highlight
  - User/org switcher at bottom
- **Content area:** Max-width `1280px` centered with generous padding (`px-8 py-6`)
- **Cards:** `rounded-xl`, subtle border, no shadows (or very subtle `shadow-sm`). Consistent `p-6` padding.
- **Tables:** Clean rows, no zebra striping, hover highlight, sticky headers
- **Spacing scale:** 4px base (Tailwind default) — be consistent, never mix `p-3` and `p-4` on same-level elements

### Component Patterns

#### Page Headers
```
[Icon] Page Title                              [Action Button]
Brief description text
─────────────────────────────────────────────
```
- Lucide icon + title + optional description + right-aligned primary action
- Divider below header, then content

#### Data Cards (Dashboard)
- Metric value large (`text-3xl font-semibold`)
- Label below in secondary text
- Optional sparkline or trend indicator (↑ 12% in green)
- No borders between metric cards — use gap spacing

#### Status Indicators
- Dot + text: `● Healthy`, `● Degraded`, `● Critical`
- Consistent across all pages (fleet, services, compliance)

#### Empty States
- Centered illustration (simple SVG or Lucide icon at 48px)
- Headline + description + CTA button
- Not just "No data" — guide the user

#### Modals & Drawers
- Slide-in drawer from right for detail views (agent detail, execution detail)
- Modal for confirmations and quick actions
- Consistent header/body/footer pattern

### Navigation Redesign

Replace the current 5-group flyout (`MainNav.tsx`) with a **vertical sidebar**:

```
┌──────────────────────┐
│  🔐 Vienna OS        │
│  Org: Max's Team     │
├──────────────────────┤
│                      │
│  ⚡ Dashboard        │
│  📊 Activity         │
│  📈 Analytics        │
│                      │
│  GOVERNANCE          │
│  🎯 Intents          │
│  ✅ Approvals        │
│  ▶  Executions       │
│  🛡 Policies         │
│  📑 Compliance       │
│  🔍 Audit Trail      │
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
│  ⚙  Settings         │
│  👤 Max Anderson      │
└──────────────────────┘
```

(Above uses emoji for illustration — actual implementation should use **Lucide icons**)

### Pages to Consolidate/Remove
- `/compliance-legacy`, `/analytics-legacy`, `/policies-legacy`, `/integrations-legacy` → **Delete.** Legacy pages are dead weight.
- `/governance-chain` + `/governance-live` → Consider merging into a single Governance view with tabs
- `/demo` + `/embed-widget` + `/simulation` → Move under Settings or a "Developer" section
- `/risk-heatmap` → Embed as a tab within Analytics

Target: **~25 focused pages** down from 42.

### Animations & Interactions
- Page transitions: subtle fade-in (150ms ease-out)
- Card hover: slight border brightness increase, no transform
- Loading: skeleton screens (not spinners) for data fetches
- Toasts: bottom-right, auto-dismiss 4s, stacked
- **No globe animations, no heavy 3D, no particle effects** — already removed once, keep it that way

---

## Implementation Plan

### Phase 1: Foundation (Design System + Layout)
1. New `variables.css` with updated color tokens
2. Sidebar component (`Sidebar.tsx`) replacing `MainNav.tsx`
3. Updated `App.tsx` layout wrapper
4. Base typography + spacing normalization

### Phase 2: Core Pages
1. Dashboard (Overview) — the hero page, get this right
2. Fleet overview + Agent Detail
3. Approvals queue
4. Policy Builder

### Phase 3: All Remaining Pages
1. Apply new patterns to all pages
2. Delete legacy routes
3. Consolidate overlapping pages

### Phase 4: Polish
1. Empty states for all pages
2. Skeleton loading states
3. Responsive (mobile sidebar → bottom nav or hamburger)
4. Command palette (`⌘K`) styling update
5. Keyboard shortcuts overlay update

---

## Constraints

- **No API changes** — this is purely frontend. All endpoints stay the same.
- **Keep all working functionality** — redesign, don't rebuild. Wire to same API calls.
- **Ship incrementally** — PR per phase, not one mega-PR.
- **Test the build** — `npm run build` must pass before pushing.
- **Branch naming:** `design/console-v2-phase-N`
- **GA4 tag:** Keep `G-7LZLG0D79N` (NOT the biography.ai one that was accidentally there before — PR #108 fixed this)

---

## References (Inspiration)

- **Linear** (linear.app) — best-in-class dark dashboard
- **Vercel Dashboard** — clean, fast, minimal
- **Raycast** — sidebar nav, keyboard-first
- **Clerk Dashboard** — auth/team management patterns
- **Datadog** — governance/monitoring data density done right

---

## Success Criteria

1. First-time user lands on Dashboard and immediately understands system posture
2. Navigation is discoverable — no more than 2 clicks to any page
3. Visual consistency — every page looks like it belongs to the same product
4. Performance — no regressions, lighthouse score ≥ 90
5. Looks like a product you'd pay $99/mo for

---

*Questions? Ping @Aiden in #agent-coordination.*
