# Vienna OS Marketing Site — Design System

## Product Context

**Product:** Vienna OS - AI Governance Platform  
**Brand Identity:** Regulatory authority, not a tech startup. Professional governance institution.  
**Design Language:** Dark, precise, authoritative with subtle luxury touches  

## Core Principles

1. **Regulatory Authority** - Design should convey trust, precision, and institutional gravitas
2. **Dark Professional** - Dark zinc backgrounds with violet governance accents
3. **Data-First** - Monospace typography for technical precision
4. **Minimal Animation** - Subtle, purposeful motion only

---

## Colors

### Primary Palette (MUST USE ONLY THESE)

**Backgrounds:**
- `zinc-950` (#09090b) - Primary background
- `zinc-900` (#18181b) - Secondary background
- `zinc-800` (#27272a) - Card backgrounds

**Text:**
- `zinc-50` (#fafafa) - Primary text
- `zinc-400` (#a1a1aa) - Secondary text
- `zinc-600` (#52525b) - Muted text

**Brand Accents (governance purple):**
- `violet-500` (#8b5cf6) - Primary brand color
- `violet-600` (#7c3aed) - Hover states
- `violet-400` (#a78bfa) - Highlights

**Action Accents (amber warrants):**
- `amber-400` (#fbbf24) - CTAs, warrants
- `amber-500` (#f59e0b) - Hover states
- `amber-300` (#fcd34d) - Highlights

**Semantic Colors:**
- `emerald-500` (#10b981) - Success, verified
- `red-500` (#ef4444) - Error, denied
- `blue-500` (#3b82f6) - Info, pending

### DO NOT USE:
- Pink, neon colors, or random gradients
- Colors outside the zinc/violet/amber palette
- Bright saturated colors (maintains professional tone)

---

## Typography

### Fonts (MUST USE ONLY THESE)

**Display/Headings:**
- `font-display` → Cabinet Grotesk (800/700/400)
- Use for: Hero headlines, section titles, marketing copy

**Body Text:**
- `font-body` → Satoshi (700/500/400)
- Use for: Paragraphs, descriptions, UI text

**Technical/Data:**
- `font-mono` → JetBrains Mono (700/600/500/400)
- Use for: Code, warrants, JSON, terminal UI, technical specs

**Editorial (sparingly):**
- `font-serif` → Georgia
- Use for: Blog posts, long-form content only

### Type Scale

- Hero: `text-5xl md:text-6xl font-display font-bold` (60-72px)
- H1: `text-4xl md:text-5xl font-display font-bold` (48-60px)
- H2: `text-3xl md:text-4xl font-display font-bold` (36-48px)
- H3: `text-2xl md:text-3xl font-display font-semibold` (24-36px)
- Body: `text-base md:text-lg font-body` (16-18px)
- Small: `text-sm font-body` (14px)
- Code: `text-sm font-mono` (14px)

---

## Spacing

Use Tailwind spacing scale (4px base):
- Micro: `gap-2` (8px)
- Small: `gap-4` (16px)
- Medium: `gap-6` (24px)
- Large: `gap-8` (32px)
- XL: `gap-12` (48px)
- XXL: `gap-16` (64px)

**Section padding:**
- Desktop: `py-24 px-8` (96px vertical)
- Mobile: `py-16 px-4` (64px vertical)

---

## Components

### Buttons

**Primary (amber CTA):**
```html
<button class="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold rounded-lg hover:from-amber-500 hover:to-amber-600 transition-all">
  Get Started
</button>
```

**Secondary (violet governance):**
```html
<button class="px-6 py-3 bg-violet-600 text-zinc-50 font-semibold rounded-lg hover:bg-violet-700 transition-colors">
  Learn More
</button>
```

**Outline (ghost):**
```html
<button class="px-6 py-3 border-2 border-zinc-700 text-zinc-50 font-semibold rounded-lg hover:bg-zinc-800 transition-colors">
  View Docs
</button>
```

### Cards

**Standard card:**
```html
<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
  <!-- content -->
</div>
```

**Warrant card (terminal style):**
```html
<div class="bg-zinc-900 border-2 border-violet-500/30 rounded-lg p-6 font-mono text-sm seal-glow">
  <!-- warrant content -->
</div>
```

### Badges

**Status badge:**
```html
<span class="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full text-xs font-mono uppercase">
  Verified
</span>
```

### Icons

- Use `lucide-react` for all icons
- Icon size: `w-5 h-5` (20px) for inline, `w-6 h-6` (24px) for features
- Color: `text-violet-500` or `text-amber-400` for accents

---

## Layout

### Grid System

**Feature grids:**
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- 3 columns on desktop, 2 on tablet, 1 on mobile -->
</div>
```

**Max width container:**
```html
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <!-- content -->
</div>
```

### Responsive Breakpoints

- Mobile: default (< 768px)
- Tablet: `md:` (≥ 768px)
- Desktop: `lg:` (≥ 1024px)
- Wide: `xl:` (≥ 1280px)

---

## Visual Effects

### Backgrounds

**Grid background (governance precision):**
```css
.grid-bg {
  background-image: 
    linear-gradient(rgba(180, 170, 160, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 170, 160, 0.02) 1px, transparent 1px);
  background-size: 48px 48px;
}
```

**Paper texture (subtle):**
```css
.paper-bg {
  /* SVG noise texture at 1.5% opacity */
}
```

### Glows

**Seal glow (warrants, authority badges):**
```css
.seal-glow {
  box-shadow: 
    0 0 15px rgba(124, 58, 237, 0.15),
    0 0 40px rgba(124, 58, 237, 0.05),
    inset 0 1px 0 rgba(124, 58, 237, 0.08);
}
```

**Verified glow:**
```css
.verified-glow {
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.12);
}
```

### Animations (use sparingly)

**Float (hero elements):**
```css
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(0.5deg); }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}
```

**Status pulse (LIVE indicators):**
```css
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.status-live {
  animation: status-pulse 2s ease-in-out infinite;
}
```

---

## Design Fidelity Rules

**WHEN ITERATING DESIGNS, YOU MUST:**

1. **Use ONLY the fonts listed above** - No serif headlines, no decorative fonts
2. **Use ONLY the colors from the zinc/violet/amber palette** - No pink, no neon, no random gradients
3. **Maintain dark zinc-950 background** - Never switch to light mode or white backgrounds
4. **Keep monospace for technical elements** - Warrants, code, JSON must use JetBrains Mono
5. **Preserve the governance aesthetic** - Professional authority, not playful startup

**Every design iteration must end with:**
"Use ONLY the fonts, colors, spacing, and component styles defined in the design system. Do not introduce any fonts, colors, or visual styles not in the design system."

---

## Example Component Usage

### Hero Section Pattern

```html
<section class="relative min-h-screen bg-zinc-950 grid-bg">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
    <h1 class="text-5xl md:text-6xl font-display font-bold text-zinc-50 mb-6">
      Governance for<br/>Production AI Systems
    </h1>
    <p class="text-lg md:text-xl text-zinc-400 max-w-2xl mb-8">
      Runtime policy enforcement, warrant-based execution, and regulatory audit trails.
    </p>
    <div class="flex gap-4">
      <button class="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold rounded-lg hover:from-amber-500 hover:to-amber-600">
        Generate Warrant
      </button>
      <button class="px-6 py-3 border-2 border-zinc-700 text-zinc-50 font-semibold rounded-lg hover:bg-zinc-800">
        View Specification
      </button>
    </div>
  </div>
</section>
```

### Feature Card Pattern

```html
<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
  <div class="w-12 h-12 bg-violet-500/10 border border-violet-500/30 rounded-lg flex items-center justify-center mb-4">
    <Shield class="w-6 h-6 text-violet-500" />
  </div>
  <h3 class="text-xl font-display font-bold text-zinc-50 mb-2">
    Policy Enforcement
  </h3>
  <p class="text-zinc-400">
    Runtime validation of AI actions against organizational policies.
  </p>
</div>
```

---

**Design system version:** 1.0 (2026-04-07)  
**Maintained by:** Vienna (Technical Lead)
