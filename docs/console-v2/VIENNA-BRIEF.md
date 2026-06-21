# VIENNA OS CONSOLE v2 — DESIGN + IMPLEMENTATION BRIEF

**To:** Vienna (Max's agent, U0AJ642SEGL)
**From:** Aiden (COO)
**Date:** 2026-06-21
**Source:** Live audit of console.regulator.ai + regulator.ai + risk-ai/regulator.ai repo @ HEAD
**Mandate (Whit, via Max):** Build a complete console that is **functional, aesthetic, and usable** — most importantly, **something people would pay for.**

---

## 0. THE HONEST DIAGNOSIS

### What you have right now

- **43 page files / 90 component files / 51,749 LOC** under `apps/console/client/src`
- **7 "Premium" duplicates** living alongside their legacy originals: DashboardPremium / FleetPremium / ApprovalsPremium / AnalyticsPremium / CompliancePremium / IntegrationsPremium / PolicyBuilderPremium — plus DashboardControl as a third dashboard variant. **The product is an archaeology dig of half-finished iterations.**
- Two different brand languages running simultaneously: marketing site uses orange + mono (`#f59e0b` + JetBrains Mono terminal aesthetic); console uses purple + sans (`#7c3aed` + Inter). A buyer who clicks "Sign In" feels like they bought a different product than the one they evaluated.
- **`/settings` and `/policies` both crash** with React error #31 (object-as-child) — two of the three most important pages of a governance product are dead on arrival.
- **`/fleet` shows 17 agents with `0` actions across the board and `82d ago` heartbeats.** The product looks abandoned. Either the demo data is fossilized or the runtime isn't actually plumbed — either way, a buyer churns in 30 seconds.
- **API keys page lists 2 keys, both EXPIRED (Mar 29).** Onboarding leaves zero working credentials.
- **Empty states are flat zeros**, not curated demo data. "Warrants Today: 0", "Avg latency: 0ms", "0 pending approvals" — nothing to look at.
- **Mobile is broken on the marketing site** — long_underscore_tokens overflow horizontally. Cards, buttons, timestamps clip. (Already covered in the prior brief.)

### What is actually good and must be preserved

- **The brand IDEA is excellent.** "Cryptographic warrants for AI agent execution" is a real, defensible category. The terminal aesthetic on the marketing homepage is the right voice.
- **The API surface is comprehensive** — 35 typed API client modules already exist (`api/agents.ts`, `api/approvals.ts`, `api/governance.ts`, `api/audit.ts`, etc.). The plumbing exists; the surface is broken.
- **The nav information architecture is correct**: Dashboard / Governance / Fleet / Infrastructure / Settings is the right 5-bucket split for an enterprise governance product. Don't refactor that.
- **Auth works.** OAuth (Google/GitHub) + email/password + JWT cookies are solid.
- **17 agents are already registered** in the DB — the data foundation is there.

### The verdict

You do not need to rebuild from scratch. **You need to delete half the surface, unify the brand, and finish the 18 pages that matter.**

---

## 1. NORTH STAR — WHAT "PAYABLE" LOOKS LIKE

A VP of Engineering or Head of AI Risk at a fintech sees the console and within **90 seconds** decides:

1. "This is the AI governance plane we've been hand-rolling in Notion docs."
2. "It is clearly running production traffic right now — I can see live warrants flowing."
3. "The audit trail is cryptographically signed and exportable for our SOC 2 auditor."
4. "I can connect a real agent in under 10 minutes via SDK."
5. "$49/agent/mo (Team) is a no-brainer. $99/agent/mo (Business) for SSO + compliance reports is also a no-brainer."

If any of those five beats is missing or feels fake, the deal is dead.

---

## 2. SUPERDESIGN PROMPT — USE THIS VERBATIM

Open SuperDesign. Create one design system + 8 page mocks. Use this prompt block exactly (do NOT improvise the brand — it has to match the marketing site or every visitor experiences whiplash):

```
PROJECT: Vienna OS Console v2 — execution governance platform for autonomous AI agents

DESIGN LANGUAGE: Premium terminal/control-plane aesthetic. Reference points:
  - Linear (information density, keyboard-first, mono font in code surfaces)
  - Vercel (clean dark surfaces, sharp typography, restrained color)
  - Grafana (data density without clutter, signal-over-noise)
  - Datadog (real-time-feel: pulse indicators, live counters, fresh-as-of timestamps)
  - DO NOT REFERENCE: Stripe Dashboard, Linear's "fun" theme, anything pastel,
    anything with glassmorphism or gradient buttons. We tried that and it looks
    like a 2021 indie SaaS, not infrastructure.

COLOR SYSTEM (must match marketing site at regulator.ai):
  Background: layered dark — #0a0a0f (app), #12131a (surface), #1a1b26 (raised)
  Primary accent (CTAs, brand): #f59e0b (amber/orange — same as marketing)
  Success: #10b981 (green for VERIFIED / APPROVED / ACTIVE)
  Warning: #f59e0b (warning state — yes, same hue as primary; distinguished by context)
  Danger:  #ef4444 (DENIED / HALTED / EXPIRED)
  Info:    #3b82f6 (used sparingly; not on CTAs)
  Text:    #ffffff / rgba(255,255,255,0.7) / rgba(255,255,255,0.55)
  Borders: rgba(255,255,255,0.06) / 0.08 / 0.12
  REMOVE purple (#7c3aed) entirely. It does not appear on marketing.

TYPOGRAPHY:
  Display + headings: JetBrains Mono 600 — uppercase with underscore spacing
    (e.g. "MISSION_CONTROL", "WARRANT_DETAIL", "FLEET_OVERVIEW")
  Body: Inter 400/500 — sentence case
  Data/code: JetBrains Mono 400/500 (warrant IDs, agent IDs, timestamps, hashes)
  Numerics in stat tiles: JetBrains Mono 600, tabular-nums
  Page titles render as mono-uppercase-underscore. Section labels render as
  lowercase_underscore (e.g. "system_status", "audit_chain").

VOICE:
  Terminal/operator. Labels use snake_case. Buttons use SCREAMING_SNAKE
  ("APPROVE_WARRANT", "GENERATE_REPORT", "CONNECT_AGENT"). Empty states use
  ops-room language ("queue_clear", "no_pending_intents", "fleet_idle — awaiting_intent").

DENSITY:
  Information-dense by default. Tables show 25 rows above the fold. Stat tiles
  cluster 4-up not 2-up. NO hero illustrations. NO whitespace-as-feature. This is
  infrastructure, not a marketing landing page.

DELIVERABLES (one mock per breakpoint 1440 + 390):
  1. /now            — Mission Control (replaces 3 dashboard variants)
  2. /fleet          — Agent fleet table + detail panel
  3. /fleet/:agentId — Agent detail (heartbeat sparkline, recent warrants, trust score)
  4. /approvals      — Active approval queue with warrant preview pane
  5. /executions     — Execution log (filterable, exportable)
  6. /policies       — Policy builder (visual rule editor + raw JSON view)
  7. /audit          — Cryptographic audit trail with signature verification UI
  8. /settings       — Org + members + billing + API keys + SSO + webhooks (single page, tabbed)

COMPONENTS LIBRARY (mocks needed):
  - Warrant card (compact + expanded variants; HMAC signature reveal)
  - Risk tier badge (T0 / T1 / T2 / T3 with matching color)
  - Pulse indicator (LIVE green dot with @keyframes pulse)
  - Stat tile (label + big-number + delta + sparkline)
  - Approval action row (approve / deny / escalate with keyboard shortcuts visible)
  - Command palette (Cmd+K) — must be a first-class citizen
  - Empty state primitive (icon + ops-language copy + primary CTA)
  - Error state primitive (the REAL one — not "Something went wrong")
```

When SuperDesign returns mocks, export each at 2x as PNG + the design tokens as
CSS variables. Commit to `apps/console/client/src/styles/v2-tokens.css`.

---

## 3. IMPLEMENTATION ORDER — 5 PHASES, 5 DAYS

### Phase 0 — Demolition (Day 1 AM, 2-3h)

Before adding anything, **delete or quarantine the half-finished iterations**. The cognitive load of 7 Premium/Legacy duplicates is the single biggest reason the product feels unpolished.

For each pair (DashboardPremium vs DashboardControl vs Dashboard, FleetPremium vs FleetDashboardPage, ApprovalsPremium vs ApprovalsPage, etc.):

1. Pick the one that's closest to spec OR start a new `*V2` file.
2. Move the loser to `apps/console/client/src/pages/_archive/` (don't delete yet — git history is your safety net but `_archive/` lets you grep for old logic).
3. Update `App.tsx` so there is exactly ONE route per canonical path. No `/policies-legacy`, no `/compliance-legacy`, no `/dashboard-premium`.

Target after Phase 0: ~22 pages, down from 43.

### Phase 1 — Brand unification (Day 1 PM, 3-4h)

1. Replace `apps/console/client/src/styles/variables.css` with v2 tokens from SuperDesign output. Critical: `--accent-primary: #f59e0b`. Purple is dead.
2. Load JetBrains Mono from Google Fonts in `index.html`. Add a `.mono` utility class.
3. Update `MainNav.tsx`: VienanaOS logo wordmark must match the marketing site's exact treatment ("Vienna" in white, "OS" in amber, all sans). Replace the cyan/teal accents in dashboard tiles with the v2 amber + green semantic palette.
4. Strip `themes.css` light-mode + high-contrast variants for now — they're fragmenting the design language and nobody is asking for them. Re-add later when there's a real customer ask.
5. Replace the floating chat bubble (purple gradient) with a minimal terminal-style "help_" button bottom-right that opens the command palette.

**Acceptance:** Open marketing site in one tab and console in another. Switching feels like the same product.

### Phase 2 — Fix the broken pages (Day 2)

The two pages that crash are not optional.

**`/settings` (SettingsPage.tsx):** React error #31 means somewhere it's doing `<div>{someObject}</div>`. The error decoder shows keys `{action, seeded, simulation}` — that's the demo-mode bootstrap response. Find the render path that consumes `bootstrap.ts` API output and JSON.stringify it or pluck the right field. Then build the actual settings page as **6 tabs in one route**:
  - `Organization` (name, logo, slug, time zone)
  - `Members` (list, invite, role: owner / admin / operator / viewer)
  - `API Keys` (move from /api-keys — current page becomes a tab)
  - `Billing` (Stripe portal link + current plan + agent count + upgrade CTA)
  - `Webhooks` (URL, event filters, signing secret reveal, test-send button)
  - `Security` (SSO config, audit log retention, IP allowlist, MFA enforcement)

**`/policies` (PolicyBuilderPremium.tsx):** Same triage. Then deliver a visual policy editor:
  - Left rail: policy list with status pills
  - Center: rule blocks (if intent.action matches X AND risk_tier >= T2 → require human approval from group Y)
  - Right rail: live "what would this do" simulator pulling 10 most recent intents through the proposed policy
  - Footer: raw JSON view (collapsed by default) + "publish" CTA with diff preview

**Acceptance:** Both pages render real data without crash. Cypress smoke test passes for all 22 routes.

### Phase 3 — Make it feel alive (Day 3)

This is the single biggest "would-pay-for-it" lever.

1. **Seed real-looking activity.** Write a cron (`scripts/seed-demo-activity.ts`) that runs every 10 min and generates 3-8 plausible warrant events across the 17 registered agents — deploy_production approvals, db_migration intents, payment_authorize calls, etc. Each must produce a real DB row in `warrants`, `audit_events`, `executions`. Even on a fresh demo account, the console should look like a busy ops room.
2. **Wire `LIVE` indicators to a websocket or 5-sec poll.** The dashboard "WARRANTS TODAY" tile must tick up while you watch. The fleet "LAST HEARTBEAT" column must show "12s ago" / "47s ago", not "82d ago". Use the existing `api/stream.ts` if it works; otherwise poll `/api/v1/dashboard/summary` every 5s.
3. **Add sparklines to every stat tile.** A bare number is dead. A bare number with a 24h sparkline is alive. Use `recharts` or `visx` — both already common in the React ecosystem.
4. **Replace empty states.** Every empty list gets a real ops-language copy + a CTA. Examples:
   - Approvals empty → "queue_clear · last_approval 2m ago by @max · view_history →"
   - Executions empty → "no_executions_yet · connect_first_agent →"
   - Audit empty → "audit_chain_initialized · 0 events · run_demo_warrant →"

**Acceptance:** Pull up the console on a phone in a coffee shop and watch numbers move in real time. That's the demo.

### Phase 4 — The 5 power features that justify $99/agent/mo (Day 4)

These are the features a Business-tier buyer NEEDS to see on the demo call. Without these, $49 is the ceiling.

1. **Cmd+K command palette** with fuzzy search across every page, every agent, every recent warrant. Bind `?` for the keyboard shortcut overlay (already half-built per `KeyboardShortcutOverlay.tsx`).
2. **Warrant inspector with cryptographic verification.** Click any warrant → side panel opens → shows HMAC signature, signing key fingerprint, public-verify command (`vienna verify wrt_abc123 --pubkey ...`), and a green "✓ signature_verified" or red "✗ tampered" indicator. This is the moat. A buyer will pay for this alone.
3. **Audit export.** "Export 90 days as PDF" + "Export as JSON-Lines" + "Export as CSV for SOC 2" buttons on `/audit`. Generated server-side. Email link on completion.
4. **Slack/PagerDuty webhooks** with a test-send button on `/settings/webhooks`. Compliance teams want notifications, not polling.
5. **Org-level risk dashboard** at `/now` — heatmap of agents × risk tiers × recent denials. Shows where governance is actually catching things. This is the slide a CISO takes to their board.

### Phase 5 — Polish pass (Day 5)

1. Mobile audit at 390 / 414 / 768. Every page must fit. Apply `overflow-wrap: anywhere` + `min-width: 0` to long mono tokens. Test every nav dropdown on mobile.
2. Accessibility: every interactive element must have a visible focus ring (not `outline: none`), aria labels on icon-only buttons, color contrast ≥ 4.5:1 (the design tokens already aim for this — verify).
3. Loading states: every async component shows a skeleton (not a spinner) for >300ms loads.
4. 404 + 500 pages styled in the v2 brand. "Something went wrong" → "fatal_error · trace_id: abc123 · contact_support →".
5. Onboarding flow: first-login experience walks a brand-new org through "connect first agent → submit first intent → see first warrant → see first audit event" in <5 min. The existing `OnboardingWizard.tsx` is a start; rebuild it in the v2 voice.

---

## 4. WHAT YOU SHIP — DEFINITION OF DONE

A PR titled `feat(console): v2 — unified brand + 18 page redesign` that:

- Reduces `apps/console/client/src/pages/` from 43 files to ≤22 (the rest moved to `_archive/`)
- Zero references to `#7c3aed` or `purple` in active styles
- All 22 routes render without console errors on Chrome 124, Safari 17, Firefox 125
- Lighthouse score ≥ 90 on /now, /fleet, /approvals at desktop and mobile
- Cypress smoke test (or Playwright) hitting every route + 5 critical user flows: login, connect-agent, submit-intent, approve-warrant, export-audit
- Updated `apps/console/README.md` with the new page inventory and design token map
- Screenshot tour at `docs/screenshots/console-v2/` — 1 hero + 8 page caps for the marketing site to use

Deployment: merge to `main`, Vercel auto-deploys to `console.regulator.ai`. Tag `v2.0.0-console`.

---

## 5. THINGS NOT TO DO

- **Do not redesign the marketing site.** That's a separate brief and is already mostly correct on desktop. The console is the bottleneck.
- **Do not add a light theme, high-contrast theme, or colorblind theme yet.** Real ask first, ship later.
- **Do not invent new color accents** ("oh I'll use cyan for AI features and pink for compliance"). One primary (amber), three semantics (green/yellow/red), period.
- **Do not add a chat assistant inside the console.** The floating bubble currently in the bottom-right is the wrong primitive for a governance product. Replace with the command palette.
- **Do not skip the deletion phase.** Adding new code on top of the 7 Premium duplicates makes the rot worse. The first commit of this PR must be deletions.
- **Do not ship a "demo mode" that's separate from production.** Real seed data in the real DB. One product, one experience.

---

## 6. SUPERDESIGN CREDIT ALLOCATION

Spend in this order:
1. Design tokens + base components (warrant card, stat tile, approval row, command palette) — **40% of credits**
2. /now Mission Control + /fleet (the two pages a buyer sees first) — **25%**
3. /approvals + /audit + /settings (the three pages that close deals) — **20%**
4. /policies visual editor (most novel UI, highest leverage) — **10%**
5. Onboarding flow + empty states + loading states — **5%**

---

## 7. CHECKPOINT CADENCE

- **End of Day 1:** Post in #agent-coordination — design tokens applied, Phase 0 demolition merged. Screenshot of v2 nav + dashboard. Aiden + Whit will sanity-check brand match.
- **End of Day 2:** Post — /settings + /policies green. Loom of clicking through every route with zero crashes.
- **End of Day 3:** Post — live demo URL with seeded activity. Aiden will record a 60-sec walkthrough for Whit to evaluate "would I pay" gut feel.
- **End of Day 4:** Post — power features shipped. Cmd+K demo + warrant verification demo.
- **End of Day 5:** Post — PR open, screenshots committed, ready to merge.

If you're blocked on anything (API gaps, SuperDesign credit ceiling, Stripe plumbing for billing tab), surface it in #agent-coordination immediately — don't wait for the checkpoint.

---

## 8. NORTH STAR REMINDER

> **Most importantly, something people would pay for.** — Whit

A buyer doesn't pay for "nice UI." They pay for:
- Confidence that the cryptographic warrant is real (→ verification UI on every warrant)
- Confidence that the audit trail will pass a SOC 2 auditor (→ exportable, signed, tamper-evident)
- Confidence that nothing breaks when they connect a real production agent (→ no crashed routes, fresh API keys flow, working SDK examples)
- Confidence that the team behind this is shipping (→ live counters, recent activity, "deployed 14 min ago" build hash in footer)

Build for that buyer. Every design decision should answer "does this make the buyer more confident or less?"

Ship it.

— Aiden
