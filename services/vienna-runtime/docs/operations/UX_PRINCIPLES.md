# Vienna Operator Shell — UX Principles

**Goal:** Design a cleaner, more intentional interface than OpenClaw, tailored to daily operator workflows.

**Feeling:** Control room, personal AI OS, operator workbench — not generic dashboard or chatbot wrapper.

---

## Core Principles

### 1. Cleaner than OpenClaw

**Problem with OpenClaw:**
- Information overload
- Flat visual hierarchy
- Dense text
- Everything equally prominent

**Vienna Operator Shell:**
- ✅ Stronger visual hierarchy
- ✅ Progressive disclosure (show more on demand)
- ✅ Focused content areas
- ✅ Better use of whitespace
- ✅ Clear status indicators

**Example:**

**OpenClaw approach:**
```
Session info | Model | Tokens | Cost | Messages | ...
[Long system prompt visible]
[Tool list expanded]
[Full context dump]
```

**Vienna approach:**
```
┌─────────────────────────────────┐
│ System: Healthy | Queue: 12     │  ← Clear, condensed
└─────────────────────────────────┘

Active Objectives (3)               ← Focused section
• obj_441 Config update (T1)
• obj_442 BLOCKED                   ← Status prominent
• obj_443 File processing (T0)

[Expand for details] →              ← Progressive disclosure
```

---

### 2. Operator-Focused

**Design for:**
- Daily operational use (not debugging)
- Your specific workflows (trading, fitness, classwork)
- Most-used actions prominently placed
- Common paths optimized

**Not designed for:**
- Generic admin tasks
- Developer debugging (secondary)
- Raw data exploration (inspection layer only)

**Example:**

**Primary actions (prominent):**
- Chat with Vienna
- View active objectives
- Check decisions inbox
- Navigate to domain workspaces

**Secondary actions (accessible but not prominent):**
- View full replay log
- Inspect envelope ancestry
- Run integrity check
- View agent task history

---

### 3. Calmer Interface

**Avoid:**
- Overwhelming data dumps
- Constant alerts/notifications
- Flashing/blinking elements
- Red everywhere

**Prefer:**
- Subtle status indicators
- Progressive disclosure
- Clear but calm error states
- Purposeful color use

**Color usage:**

| State | Color | Usage |
|-------|-------|-------|
| Healthy | Green | System health, successful actions |
| Warning | Yellow | Decisions needing attention, rate limits |
| Error | Red | Failures, blockers, critical alerts |
| Neutral | Gray | Normal state, inactive elements |
| Info | Blue | Links, informational badges |

**Example:**

**Too loud:**
```
🔴 CRITICAL: 3 OBJECTIVES BLOCKED
🔴 DEAD LETTERS: 5 PENDING REVIEW
🔴 INTEGRITY VIOLATIONS DETECTED
```

**Calmer:**
```
⚠️ 3 objectives blocked       [View] →
📋 5 dead letters pending      [Review] →
⚙️ Integrity check: warnings   [Details] →
```

---

### 4. Unified Experience

**One website, consistent patterns:**

- Persistent top status bar (every page)
- Persistent left navigation (every page)
- Persistent Vienna chat (every page)
- Consistent layout grid
- Consistent component styling
- Smooth page transitions

**Navigation should feel:**
- Predictable (always know where you are)
- Fast (no loading spinners for navigation)
- Contextual (chat understands current page)

---

### 5. Intentional Workflows

**Every action should be:**
- Clearly labeled
- Obvious in outcome
- Reversible when possible
- Explicit in risk

**Action patterns:**

**Low-risk (T0):**
```
[Pause Execution]  ← Direct button, no confirmation
```

**Medium-risk (T1):**
```
[Cancel Objective]
  ↓ Click
[Are you sure? This will cancel 5 envelopes]
[Cancel] [Confirm]
```

**High-risk (T2):**
```
[Emergency Override]
  ↓ Click
[⚠️ Risk Assessment Modal]
  • Requires Metternich approval
  • Max 60 minutes
  • Full audit trail
[Enter approval ID]
[Enter reason]
[Cancel] [Proceed]
```

---

### 6. Vienna-Native Concepts

**First-class UI elements:**
- Objectives (not "tasks" or "jobs")
- Directives (not "commands" or "requests")
- Warrants (not "permissions" or "tokens")
- Envelopes (not "actions" or "operations")
- Risk tiers (T0/T1/T2 visible everywhere)
- Trading guard (prominent in status bar)
- Replay (not "logs" or "history")

**Terminology consistency:**

| Use | Don't Use |
|-----|-----------|
| Objective | Task, job, workflow |
| Directive | Command, request |
| Envelope | Action, operation |
| Warrant | Permission, auth token |
| Risk tier | Priority, severity |
| Replay | Log, history, audit trail |

---

### 7. Not Generic

**Avoid:**
- Generic admin dashboard aesthetics
- Raw developer tooling look
- Chatbot wrapper UI patterns
- Off-the-shelf component libraries (or customize heavily)

**Aim for:**
- Custom, purposeful design
- Operator-centric layout
- Vienna-specific patterns
- Control room aesthetic

**Reference aesthetics:**

**Good references:**
- Mission control interfaces
- Trading terminals (Bloomberg, professional tools)
- DevOps dashboards (Datadog, Grafana — for information density, not design)
- Military/aerospace control systems (for calm precision)

**Bad references:**
- Generic SaaS admin panels
- Consumer chatbot UIs
- Social media interfaces
- Generic React admin templates

---

## Layout Patterns

### Top Status Bar

**Purpose:** Always-visible system state

**Contents:**
- System health (healthy/degraded/critical)
- Executor state (running/paused)
- Queue depth (number)
- Active objectives (number)
- Dead letters (number, red if > 0)
- Trading guard (active/override/disabled)
- Integrity status (ok/warnings/violations)

**Interactions:**
- Click badge → opens detail modal or navigates to relevant page
- Hover badge → shows tooltip with more info

**Style:**
- Dark background (gray-900)
- Compact height (h-12)
- Horizontal layout
- Pills/badges for each item
- Color-coded by state

---

### Left Navigation

**Purpose:** Primary navigation

**Sections:**
1. Main (Dashboard)
2. Domains (Trading, Fitness, Classwork)
3. System (Files, Objectives, Agents, Replay)

**Style:**
- Fixed width (w-64)
- Dark background
- Active state: left border highlight + brighter text
- Icons + labels
- Section headers (uppercase, small, gray)

---

### Main Workspace

**Purpose:** Page-specific content

**Layout:**
- Full width minus nav and drawer
- Padding for breathing room
- Scrollable vertically
- White/light background (contrast with dark chrome)

**Grid patterns:**

**Dashboard:**
```
┌─────────────────────────────────┐
│ Active Objectives (50% width)   │
│ Vienna Chat (50% width)         │
├─────────────────────────────────┤
│ Decisions Inbox (full width)    │
├─────────────────────────────────┤
│ Quick Stats (4 columns)         │
└─────────────────────────────────┘
```

**Objective Detail:**
```
┌─────────────────────────────────┐
│ Objective Header (full width)   │
├─────────────────────────────────┤
│ Tab Navigation                   │
├─────────────────────────────────┤
│ Tab Content (full width)         │
│ (Summary/Envelopes/Replay/...)   │
└─────────────────────────────────┘
```

---

### Inspection Drawer

**Purpose:** Deep dive into selected item

**Trigger:** Click objective/envelope/file/agent

**Layout:**
- Slides in from right
- Fixed width (w-96 or w-[32rem])
- Tabs for different views
- Close button (X) or click outside to dismiss

**Style:**
- Dark background (matches nav)
- Overlay shadow
- Smooth slide animation

---

### Vienna Chat Panel

**Purpose:** Primary Vienna interaction

**Location:** Dashboard right side (or collapsible panel on all pages)

**Layout:**
```
┌─────────────────────────────────┐
│ Vienna Chat                  [×] │ ← Header
├─────────────────────────────────┤
│                                 │
│ [Message history scrolls here]  │ ← Content
│                                 │
├─────────────────────────────────┤
│ Type message...              [→] │ ← Input
└─────────────────────────────────┘
```

**Features:**
- Resizable
- Collapsible
- Message badges (classification)
- Inline action buttons
- Markdown support

---

## Component Patterns

### Card

**Usage:** Objectives, decisions, files, agents

**Structure:**
```
┌─────────────────────────────────┐
│ Title                    [Badge] │
│ Subtitle/description             │
│ Metadata (date, status, tier)    │
│ [Action buttons]                 │
└─────────────────────────────────┘
```

**Style:**
- Border (subtle)
- Rounded corners
- Hover state (slight border highlight)
- Click target (entire card or specific button)

---

### Badge

**Usage:** Status, classification, risk tier

**Variants:**
- Success (green)
- Warning (yellow)
- Error (red)
- Neutral (gray)
- Info (blue)

**Style:**
- Small (px-2 py-1)
- Rounded (rounded or rounded-full)
- Uppercase text (text-xs uppercase font-medium)

---

### Button

**Primary:**
- Blue background
- White text
- Hover: darker blue

**Secondary:**
- Gray border
- Gray text
- Hover: light gray background

**Danger:**
- Red background
- White text
- Hover: darker red

**Ghost:**
- No background
- Gray text
- Hover: light gray background

---

### Modal

**Usage:** Confirmations, approvals, details

**Structure:**
```
┌──────────────────────────────────┐
│ Title                         [×] │
├──────────────────────────────────┤
│                                  │
│ Content                          │
│                                  │
├──────────────────────────────────┤
│               [Cancel] [Confirm] │
└──────────────────────────────────┘
```

**Style:**
- Centered overlay
- Dark backdrop (semi-transparent)
- White content area
- Shadow
- Smooth fade-in

---

### Tab Navigation

**Usage:** Objective detail, agent detail, system pages

**Structure:**
```
[Summary] [Envelopes] [Replay] [Warrants] [Risk]
  ───────
```

**Style:**
- Horizontal list
- Active tab: bottom border highlight
- Hover: slight background change
- Smooth transition

---

## Typography

**Hierarchy:**

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Page title | text-2xl | font-semibold | Page heading |
| Section title | text-lg | font-medium | Section heading |
| Card title | text-base | font-medium | Card heading |
| Body | text-sm | font-normal | Main content |
| Caption | text-xs | font-normal | Metadata, timestamps |
| Label | text-xs | font-semibold | Form labels, badge text |

**Font stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Monospace (for IDs, timestamps, numbers):**
```css
font-family: "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", monospace;
```

---

## Color Palette

### Background

| Token | Value | Usage |
|-------|-------|-------|
| bg-primary | gray-50 | Main workspace background |
| bg-secondary | white | Cards, panels |
| bg-chrome | gray-900 | Nav, status bar, drawer |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| text-primary | gray-900 | Headings, important text |
| text-secondary | gray-600 | Body text |
| text-muted | gray-400 | Metadata, captions |
| text-inverse | white | Text on dark backgrounds |

### Status

| Token | Value | Usage |
|-------|-------|-------|
| success | green-600 | Healthy, completed |
| warning | yellow-600 | Attention needed, warnings |
| error | red-600 | Failures, errors, critical |
| info | blue-600 | Links, informational |

---

## Animation

**Transitions:**
- Page navigation: instant (no fade)
- Modal open/close: 200ms fade
- Drawer slide: 300ms ease-out
- Hover states: 150ms
- Button press: 100ms

**Avoid:**
- Spinners (use skeleton loaders)
- Excessive animations
- Bouncing/elastic effects
- Attention-grabbing animations

**Loading states:**
- Skeleton loaders for content
- Subtle pulse for loading buttons
- Progress bars for long operations

---

## Responsive Design

**Priority:** Desktop-first (operators use laptops/desktops)

**Breakpoints:**
- Desktop: 1280px+ (primary target)
- Laptop: 1024-1279px (fully supported)
- Tablet: 768-1023px (graceful degradation)
- Mobile: <768px (minimal support, not a priority)

**Mobile considerations:**
- Nav collapses to hamburger menu
- Chat becomes full-page route
- Inspection drawer becomes modal
- Status bar condenses to icons only

---

## Accessibility

**Keyboard navigation:**
- Tab order logical
- Focus indicators visible
- All actions keyboard-accessible
- Escape closes modals/drawers

**Screen readers:**
- Semantic HTML
- ARIA labels where needed
- Status announcements for async updates

**Contrast:**
- WCAG AA minimum
- Text on backgrounds: 4.5:1 ratio
- UI elements: 3:1 ratio

---

## Performance

**Initial load:**
- Single dashboard bootstrap request
- SSE connection established
- <2s to interactive

**Navigation:**
- Instant page transitions (client-side routing)
- Data fetched in background
- Optimistic UI updates

**Streaming:**
- Chat responses stream in real time
- SSE updates apply immediately
- No polling (SSE only)

---

## Error States

### Network Error

```
┌──────────────────────────────────┐
│ ⚠️ Connection Lost               │
│                                  │
│ Trying to reconnect...           │
│                                  │
│ [Retry Now]                      │
└──────────────────────────────────┘
```

### Execution Failure

```
┌──────────────────────────────────┐
│ ⚠️ Action Failed                 │
│                                  │
│ Objective obj_442 failed:        │
│ API timeout                      │
│                                  │
│ [View Details] [Retry]           │
└──────────────────────────────────┘
```

### Empty State

```
┌──────────────────────────────────┐
│            📭                     │
│                                  │
│ No objectives executing          │
│                                  │
│ All caught up!                   │
└──────────────────────────────────┘
```

---

## Content Guidelines

### Voice

- Direct and clear
- Professional but not stiff
- Action-oriented
- Operator-focused

**Good:**
```
Objective blocked: recursion depth exceeded.
[Cancel] [Retry with higher limit]
```

**Bad:**
```
Oops! Something went wrong. The system encountered an unexpected condition during envelope execution. Please contact support.
```

### Terminology

**Consistent terms:**
- "Objective" (not task/job)
- "Directive" (not command)
- "Envelope" (not action/step)
- "Blocked" (not failed/errored)
- "Executing" (not running/processing)

### Timestamps

**Format:** Relative for recent, absolute for old

- <1 min: "Just now"
- <1 hour: "15 minutes ago"
- <24 hours: "3 hours ago"
- <7 days: "2 days ago"
- >7 days: "Mar 11, 3:45 PM"

---

## Testing Checklist

### Visual Review

- [ ] Layout consistent across pages
- [ ] Typography hierarchy clear
- [ ] Color usage purposeful
- [ ] Whitespace balanced
- [ ] Components aligned

### Interaction Review

- [ ] Buttons have clear hover states
- [ ] Forms validate properly
- [ ] Modals open/close smoothly
- [ ] Drawer slides in/out
- [ ] Navigation feels instant

### Accessibility Review

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Contrast ratios pass WCAG AA
- [ ] Screen reader friendly

### Performance Review

- [ ] Initial load <2s
- [ ] Page transitions instant
- [ ] SSE updates smoothly
- [ ] No layout shift

---

## Design System

**Recommended tools:**
- Tailwind CSS (utility-first)
- Headless UI (accessible components)
- Radix UI (primitives)
- Lucide icons (clean, consistent icons)

**Custom components:**
- Build custom Vienna-specific components
- Wrap third-party components for consistency
- Document in Storybook (future)

---

## Success Criteria

**Operator feedback:**
- [ ] "Cleaner than OpenClaw"
- [ ] "Easy to find what I need"
- [ ] "Doesn't feel overwhelming"
- [ ] "Interface feels tailored to my work"

**Metrics:**
- [ ] <2s initial load
- [ ] <100ms page transitions
- [ ] 0 console errors
- [ ] WCAG AA compliance

**Adoption:**
- [ ] Vienna Operator Shell becomes default UI
- [ ] OpenClaw rarely opened
- [ ] Operators prefer shell for daily work

---

**Vienna Operator Shell: Cleaner, calmer, more intentional than OpenClaw.**
