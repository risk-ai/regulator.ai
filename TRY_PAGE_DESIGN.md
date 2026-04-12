# `/try` Demo Playground — Design Spec

**Page:** `regulator.ai/try`  
**Purpose:** Interactive governance demo that makes Vienna OS feel like NASA mission control  
**Aesthetic:** Bloomberg Terminal (dark #0A0E14 + amber #fbbf24)

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  VIENNA OS DEMO PLAYGROUND                          [RUN ALL]   │
│  Experience AI governance in real-time                          │
├──────────────┬──────────────────────┬──────────────────────────┤
│              │                      │                          │
│  SCENARIOS   │   EXECUTE ZONE       │   LIVE PIPELINE          │
│  (Sidebar)   │   (Center)           │   (Results)              │
│              │                      │                          │
│  ┌────────┐  │                      │  ┌────────────────────┐  │
│  │Wire 💸 │  │   ┌──────────────┐   │  │ 1. Intent Received│  │
│  │T2 Multi│◄─┼───│  EXECUTE     │   │  │    ✓ 12ms         │  │
│  │$75K    │  │   │  GOVERNANCE  │   │  ├────────────────────┤  │
│  └────────┘  │   │              │   │  │ 2. Policy Engine  │  │
│              │   │  [PULSE]     │   │  │    ✓ 8ms          │  │
│  ┌────────┐  │   └──────────────┘   │  ├────────────────────┤  │
│  │Deploy ⚙│  │                      │  │ 3. Risk Assess    │  │
│  │T1 Appr │  │   Selected: Wire     │  │    ✓ 15ms         │  │
│  │Prod    │  │   Tier: T2           │  ├────────────────────┤  │
│  └────────┘  │   Risk: High         │  │ 4. Approval Gate  │  │
│              │                      │  │    ⏳ Pending     │  │
│  ┌────────┐  │                      │  ├────────────────────┤  │
│  │Patient🏥│  │                      │  │ 5. Warrant Issued │  │
│  │T1 HIPAA│  │                      │  │    ✓ 3ms          │  │
│  └────────┘  │                      │  └────────────────────┘  │
│              │                      │                          │
│  ┌────────┐  │                      │  ┌──────────────────┐    │
│  │Custom ⚙│  │                      │  │ TABS:            │    │
│  │Dynamic │  │                      │  │ █PIPELINE█       │    │
│  │Build   │  │                      │  │  WARRANT  AUDIT  │    │
│  └────────┘  │                      │  └──────────────────┘    │
└──────────────┴──────────────────────┴──────────────────────────┘
```

---

## Sections Breakdown

### 1. Header Bar
```
┌──────────────────────────────────────────────────────┐
│ ⚡ VIENNA OS DEMO PLAYGROUND                         │
│ Experience AI governance in real-time                │
│                                      [RUN ALL DEMOS] │
└──────────────────────────────────────────────────────┘
```

- **Title:** "⚡ VIENNA OS DEMO PLAYGROUND" (24px, amber, mono font)
- **Subtitle:** "Experience AI governance in real-time" (12px, gray)
- **RUN ALL button:** Cycles through all 8 scenarios automatically (10s each)
- **Tier filter tabs:** `ALL | T0 | T1 | T2 | DENIED` (filter scenarios)

---

### 2. Scenario Sidebar (Left)

**Layout:** 3-column responsive grid (becomes 2-col on tablet, 1-col on mobile)

**Each scenario card:**
```
┌──────────────────────────┐
│ 💸 Wire Transfer         │  ← Icon (48px emoji)
│                          │
│ Tier: T2 (Multi-Party)   │  ← Tier badge (amber glow if T2)
│ Amount: $75,000          │
│                          │
│ Risk Factors:            │
│ • High value             │
│ • External transfer      │
│ • Irreversible           │
│                          │
│ [SELECT]                 │  ← Button (amber when selected)
└──────────────────────────┘
```

**States:**
- **Default:** Dark bg, gray border
- **Hover:** Lift 2px, subtle amber glow
- **Selected:** Amber border (2px), bright amber glow, "SELECTED" label

**8 Scenarios:**
1. 💸 Wire Transfer ($75K) — T2 Multi-Party
2. 🚀 Production Deploy — T1 Approval
3. 🏥 Patient Record Update — T1 HIPAA
4. 🚫 Denied — Scope Creep — DENY
5. ✅ Auto-Approved Read — T0 Auto
6. 🤖 AI Model Training — T2 Privacy
7. 📱 Social Media Post — T1 Brand Safety
8. 📝 Contract E-Signature — T3 Legal

---

### 3. Execute Zone (Center)

**Large central button:**
```
┌────────────────────────────┐
│                            │
│      EXECUTE               │  ← 32px bold, amber
│      GOVERNANCE            │
│                            │
│      ▶ RUN NOW             │  ← Pulsing play icon
│                            │
└────────────────────────────┘
```

**Below button:**
```
Selected Scenario: Wire Transfer ($75K)
Tier: T2 (Multi-Party Approval)
Risk Level: HIGH
Estimated Duration: ~120ms
```

**Button states:**
- **Ready:** Pulsing amber glow (2s cycle)
- **Loading:** Spinning spinner + "EXECUTING..."
- **Success:** Green checkmark + "COMPLETE"
- **Error:** Red X + "FAILED"

---

### 4. Live Pipeline Visualization (Right)

**Pipeline steps appear one-by-one:**
```
┌──────────────────────────────────┐
│ GOVERNANCE PIPELINE              │
├──────────────────────────────────┤
│ 1. → Intent Received             │
│    ✓ Success | 12ms              │  ← Green glow
│    Timestamp: 21:36:45.123       │
├──────────────────────────────────┤
│ 2. P Policy Engine               │
│    ✓ Success | 8ms               │
│    Matched Rule: Wire-T2-001     │
├──────────────────────────────────┤
│ 3. R Risk Assessment             │
│    ✓ Success | 15ms              │
│    Tier: T2 | Score: 87/100      │
├──────────────────────────────────┤
│ 4. A Approval Gate               │
│    ⏳ Awaiting Human Sign-Off    │  ← Amber pulse
│    Required: 2 of 3 approvers    │
├──────────────────────────────────┤
│ 5. W Warrant Issued              │
│    ✓ Success | 3ms               │
│    WRT-7F3A-82B1-4D9E            │
├──────────────────────────────────┤
│ 6. E Execution                   │
│    ✓ Success | 45ms              │
│    Transfer completed            │
├──────────────────────────────────┤
│ 7. L Audit Logged                │
│    ✓ Success | 2ms               │
│    SHA-256 hash recorded         │
└──────────────────────────────────┘

Total Duration: 120ms
```

**Step animations:**
- Steps fade in from top (200ms stagger)
- Current step has pulsing amber glow
- Completed steps have static green checkmark
- Failed steps have red X
- Skipped steps are grayed out

---

### 5. Tabs Section (Bottom)

**Tab bar:**
```
┌────────────────────────────────────────┐
│ █ PIPELINE █ | WARRANT | AUDIT | CHAIN │
└────────────────────────────────────────┘
```

**Tab content areas:**

#### PIPELINE Tab (default)
Shows animated step-by-step execution (see section 4 above)

#### WARRANT Tab
```
┌──────────────────────────────────────┐
│ EXECUTION WARRANT                    │
├──────────────────────────────────────┤
│ Warrant ID: WRT-7F3A-82B1-4D9E       │
│ Issued: 2026-04-11T21:36:45.123Z     │
│ Expires: 2026-04-11T21:41:45.123Z    │
│ TTL: 298s remaining ⏱                │  ← Live countdown
│                                      │
│ Scope:                               │
│ • Action: wire_transfer              │
│ • Resource: account-9912             │
│ • Amount: $75,000                    │
│ • Environment: production            │
│                                      │
│ Signature Hash:                      │
│ 0x7e3c2b1a00918e77a2d1f4e5c8b9a0d1  │
│                                      │
│ Verification: ✓ VERIFIED             │  ← Green checkmark
│ Merkle Root: ✓ Validated             │
│ Chain Depth: 847                     │
└──────────────────────────────────────┘
```

#### AUDIT Tab
```
┌──────────────────────────────────────┐
│ IMMUTABLE AUDIT TRAIL                │
├──────────────────────────────────────┤
│ [21:36:45.123] Intent submitted      │
│ [21:36:45.135] Policy evaluated      │
│ [21:36:45.143] Risk assessed: T2     │
│ [21:36:45.158] Approval requested    │
│ [21:36:45.890] Approval granted      │
│ [21:36:45.893] Warrant issued        │
│ [21:36:45.938] Execution complete    │
│ [21:36:45.940] Audit hash written    │
│                                      │
│ SHA-256: 0xf4e5c8b9a0d1e2f3a4b5c6d7 │
│ Merkle Root: ✓ Verified              │
└──────────────────────────────────────┘
```

#### CHAIN Tab
```
┌──────────────────────────────────────┐
│ BLOCKCHAIN VERIFICATION              │
├──────────────────────────────────────┤
│ Chain Index: #847                    │
│ Current Hash:                        │
│ 0x3a1f9e2b7c4d8a5b6f0e1d2c3b4a5c6d  │
│                                      │
│ Previous Hash:                       │
│ 0x8b9a0d1e2f3a4b5c6d7e8f9a0b1c2d3e  │
│                                      │
│ Merkle Root:                         │
│ 0x1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b  │
│                                      │
│ Verification: ✓ CHAIN VALID          │  ← Green glow
│ Depth: 847 blocks                    │
│ Tamper-proof: ✓                      │
└──────────────────────────────────────┘
```

---

## Interaction Flow

### User Journey:
1. **Land on page** → See 8 scenario cards
2. **Click "Wire Transfer"** → Card glows amber, EXECUTE button pulses
3. **Click "EXECUTE GOVERNANCE"** → Button spins
4. **Pipeline animates** → Steps appear 1-by-1 (200ms stagger)
   - Intent Received ✓ (fade in, green glow)
   - Policy Engine ✓ (fade in, green glow)
   - Risk Assessment ✓ (fade in, green glow)
   - Approval Gate ⏳ (fade in, amber pulse)
   - Warrant Issued ✓ (fade in, green glow)
   - Execution ✓ (fade in, green glow)
   - Audit Logged ✓ (fade in, green glow)
5. **Total duration: 120ms** displayed
6. **Switch to WARRANT tab** → See warrant details with TTL countdown
7. **Switch to AUDIT tab** → See immutable log with SHA-256 hash
8. **Click "RUN ALL DEMOS"** → Cycles through all 8 scenarios (auto-mode)

---

## Visual Design

### Color Palette:
- **Background:** #0A0E14 (dark terminal)
- **Panel:** #0F1419 (card background)
- **Border:** rgba(251, 191, 36, 0.2) (amber 20%)
- **Text Primary:** #E6E1DC (off-white)
- **Text Secondary:** rgba(230, 225, 220, 0.6) (60% opacity)
- **Accent:** #fbbf24 (amber)
- **Success:** #10b981 (green)
- **Warning:** #f59e0b (orange)
- **Error:** #ef4444 (red)

### Typography:
- **Headings:** JetBrains Mono, 16-24px, 700 weight
- **Body:** JetBrains Mono, 11-13px, 400 weight
- **Code:** JetBrains Mono, 11px, monospace

### Animations:
- **Card hover:** 2px lift, 200ms ease
- **Button pulse:** 0-12px glow, 2s infinite
- **Step fade-in:** 300ms opacity 0→1, 200ms stagger
- **Status pulse:** 1.5s infinite (amber/green)
- **TTL countdown:** 1s interval, live update

### Spacing:
- **Card padding:** 20px
- **Grid gap:** 12px
- **Section margin:** 24px
- **Button padding:** 16px 32px

---

## Mobile Responsive

### Breakpoints:
- **Desktop (1200px+):** 3-column layout (sidebar | center | pipeline)
- **Tablet (768-1199px):** 2-column (scenarios + pipeline stacked)
- **Mobile (<768px):** 1-column stack
  - Scenario dropdown instead of grid
  - Full-width EXECUTE button
  - Collapsible pipeline accordion

---

## New Features to Add

### 1. RUN ALL SCENARIOS
- Button in header: "RUN ALL DEMOS"
- Cycles through all 8 scenarios automatically
- 10 seconds per scenario (3s execution + 7s result display)
- Progress indicator: "Running 3/8 scenarios..."

### 2. TIER FILTER
- Tabs in header: `ALL | T0 | T1 | T2 | DENIED`
- Click T2 → Only show T2 scenarios
- Click ALL → Show all 8

### 3. CUSTOM SCENARIO BUILDER
- "Custom Action" card opens modal
- Fields: Action name, Agent ID, Amount, Parameters
- Live preview of generated warrant
- "Execute Custom" button

### 4. SHARE RESULTS
- "Share" button after execution
- Generates shareable link: `regulator.ai/try?demo=wire_transfer&result=abc123`
- Pre-populated scenario with result

### 5. COMPARISON MODE
- "Compare" button
- Run 2 scenarios side-by-side
- Show diff in pipeline steps

---

## Technical Implementation

### Stack:
- **Framework:** Next.js 15 (React)
- **Styling:** Tailwind CSS + Custom CSS
- **Animations:** Framer Motion or CSS transitions
- **API:** `/api/try` POST endpoint (existing)
- **State:** React useState hooks (no Redux needed)

### Key Files:
- `apps/marketing/src/app/try/page.tsx` (main component)
- `apps/marketing/src/app/api/try/route.ts` (API handler)
- `apps/marketing/src/components/TryDemo/` (sub-components)

### Components to Extract:
1. `ScenarioCard` - Reusable scenario picker card
2. `ExecuteButton` - Central execute button with pulse
3. `PipelineStep` - Individual pipeline step with animation
4. `WarrantDisplay` - Warrant details with TTL countdown
5. `AuditTrail` - Immutable log display
6. `ChainVerification` - Blockchain validation UI

---

## Success Metrics

**Goal:** Make demo so compelling that users immediately want to integrate

**KPIs:**
- **Time to first execution:** <10 seconds from page load
- **Scenarios run per session:** >3 scenarios on average
- **Conversion to signup:** 15% of demo users click "Start Free Trial"
- **Share rate:** 5% of users share results
- **Mobile completion:** 60% of mobile users complete 1 scenario

---

## What Makes This Feel Like Mission Control

1. **Live pipeline animation** - Steps appear in real-time like NASA countdown
2. **Pulsing indicators** - Active steps pulse (you see the system alive)
3. **Instant feedback** - Every click triggers visual response (<200ms)
4. **Status glows** - Green/amber/red glows show health at a glance
5. **Terminal aesthetic** - Dark background + monospace fonts = serious tool
6. **Immutable audit trail** - SHA-256 hashes make it feel cryptographically secure
7. **Merkle chain verification** - Blockchain validation = enterprise-grade
8. **TTL countdown** - Live timer creates urgency and shows warrants expire
9. **One-click execution** - No forms, no config - just EXECUTE

**This demo makes governance feel fast, visual, and powerful.**

---

**Next Steps:**
1. Approve this design spec
2. Implement enhanced /try page with new features
3. Add RUN ALL SCENARIOS auto-mode
4. Add tier filtering
5. Test on mobile (ensure pipeline works on small screens)
6. Add share functionality
7. Track analytics (time to first exec, scenarios per session)

**Estimated Dev Time:** 8-12 hours for full implementation
