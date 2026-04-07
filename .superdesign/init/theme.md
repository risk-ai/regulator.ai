# Theme Configuration

## Tailwind Config

**File:** `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SuperDesign palette - zinc/violet/amber
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Keep existing Vienna palette for backwards compat
        navy: {
          950: '#08090C',
          900: '#0D0F14',
          800: '#141820',
          700: '#1C222E',
          600: '#2A3244',
        },
        gold: {
          50:  '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE080',
          300: '#FFD040',
          400: '#D4A520',
          500: '#B8860B',
        },
        warm: {
          50:  '#F8F7F5',
          100: '#E8E6E1',
          200: '#D4D0C8',
          300: '#B0AAA0',
          400: '#8A8478',
          500: '#6B6560',
          600: '#4A4540',
          700: '#2D2A26',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## Global Styles

**File:** `src/app/globals.css`

```css
@import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,400&f[]=satoshi@700,500,400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* SuperDesign approved animations */
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(0.5deg); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

body {
  background: #09090b;
  color: #fafafa;
  font-family: 'Satoshi', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Typography system */
.font-display {
  font-family: 'Cabinet Grotesk', sans-serif;
}

.font-body {
  font-family: 'Satoshi', system-ui, sans-serif;
}

.font-mono {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

/* ============================
   VIENNA OS — GOVERNANCE IDENTITY
   
   Design language: Regulatory Authority
   Not a tech startup. A governance institution.
   
   Palette: Dark charcoal + purple governance + emerald verified + amber warrants
   Typography: Inter (body) + JetBrains Mono (data) + Georgia (editorial)
   Textures: Subtle paper grain, seal stamps, document borders
   ============================ */

/* Fine grain texture — like high-quality paper */
.paper-bg {
  background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='40' height='40' filter='url(%23n)' opacity='0.015'/%3E%3C/svg%3E");
}

/* Coordinate grid — governance precision */
.grid-bg {
  background-image: 
    linear-gradient(rgba(180, 170, 160, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(180, 170, 160, 0.02) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* Gold seal glow — for warrants and authority badges */
.seal-glow {
  box-shadow: 
    0 0 15px rgba(124, 58, 237, 0.15),
    0 0 40px rgba(124, 58, 237, 0.05),
    inset 0 1px 0 rgba(124, 58, 237, 0.08);
}

/* Verified stamp glow */
.verified-glow {
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.12);
}

/* Pipeline flow */
@keyframes pipeline-flow {
  0% { opacity: 0.2; transform: translateX(-3px); }
  50% { opacity: 0.7; transform: translateX(0); }
  100% { opacity: 0.2; transform: translateX(3px); }
}
.pipeline-arrow {
  animation: pipeline-flow 2.5s ease-in-out infinite;
}

/* Status pulse */
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.status-live {
  animation: status-pulse 2s ease-in-out infinite;
}

/* Document border — like a certificate/legal document */
.doc-border {
  position: relative;
}
.doc-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(180, 170, 160, 0.1), rgba(124, 58, 237, 0.15));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Section divider — thin purple line */
.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.15), transparent);
  margin: 0 auto;
  max-width: 200px;
}

/* Card hover */
.card-hover {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(180, 170, 160, 0.06);
}
.card-hover:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 58, 237, 0.12);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Stamp/badge */
.stamp {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(180, 170, 160, 0.12); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(180, 170, 160, 0.2); }

/* Focus: purple authority */
input:focus, textarea:focus, select:focus {
  border-color: rgba(124, 58, 237, 0.4) !important;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.08);
}

/* Keyboard focus ring — visible only on keyboard navigation */
*:focus-visible {
  outline: 2px solid rgba(124, 58, 237, 0.6);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* ============================
   ANIMATIONS — Hero & Page Dynamism
   ============================ */

/* Hero fade-up cascade */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-up {
  opacity: 0;
  animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Scroll-triggered fade-up (applied via IntersectionObserver) */
.scroll-fade-up {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.scroll-fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Warrant paper-unfold */
@keyframes warrantUnfold {
  from { opacity: 0; transform: scale(0.97) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.warrant-unfold {
  opacity: 0;
  transform: scale(0.97) translateY(8px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.warrant-unfold.visible {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Pipeline activation pulse */
@keyframes pipelineActivate {
  0%, 100% { background: rgba(124, 58, 237, 0.05); border-color: rgba(124, 58, 237, 0.1); box-shadow: none; }
  15% { background: rgba(124, 58, 237, 0.2); border-color: rgba(124, 58, 237, 0.5); box-shadow: 0 0 12px rgba(124, 58, 237, 0.2); }
}
.pipeline-step-animated {
  animation: pipelineActivate 6s ease-in-out infinite;
}

/* Typewriter cursor blink */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.typewriter-cursor {
  display: inline-block;
  width: 7px;
  height: 14px;
  background: #a78bfa;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 1px;
}

/* Ambient glow — slow-moving radial gradient */
@keyframes ambientDrift {
  0% { transform: translate(-30%, -30%) scale(1); }
  33% { transform: translate(-25%, -35%) scale(1.05); }
  66% { transform: translate(-35%, -25%) scale(0.95); }
  100% { transform: translate(-30%, -30%) scale(1); }
}
.ambient-glow {
  position: absolute;
  width: 800px;
  height: 800px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.06) 0%, rgba(59, 130, 246, 0.03) 40%, transparent 70%);
  pointer-events: none;
  animation: ambientDrift 20s ease-in-out infinite;
  top: 50%;
  left: 50%;
  z-index: 0;
}

/* Stats count-up container */
.stat-number {
  font-variant-numeric: tabular-nums;
  min-width: 3ch;
  display: inline-block;
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .pipeline-arrow,
  .status-live,
  .pipeline-step-animated,
  .ambient-glow {
    animation: none;
  }
  .animate-fade-up {
    opacity: 1;
    animation: none;
  }
  .scroll-fade-up {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .warrant-unfold {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .typewriter-cursor {
    animation: none;
    opacity: 1;
  }
  .card-hover:hover {
    transform: none;
  }
}

/* Selection: purple highlight */
::selection { background: rgba(124, 58, 237, 0.2); color: #fff; }

/* Data row */
.data-row {
  border-bottom: 1px solid rgba(180, 170, 160, 0.05);
  transition: background 100ms;
}
.data-row:hover {
  background: rgba(180, 170, 160, 0.02);
}

/* ============================
   NEW VISUAL OVERHAUL ANIMATIONS
   ============================ */

/* Warrant card floating animation */
@keyframes warrantFloat {
  0%, 100% { transform: translateY(0px) rotateX(0deg); }
  50% { transform: translateY(-8px) rotateX(1deg); }
}
.warrant-float {
  animation: warrantFloat 6s ease-in-out infinite;
}

/* Warrant card scan line effect */
@keyframes scanLine {
  0% { transform: translateX(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}
.warrant-scan-line::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
  pointer-events: none;
  animation: scanLine 8s ease-in-out infinite;
  z-index: 1;
}

/* Enhanced warrant pulsing elements */
@keyframes warrantPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
}
.warrant-pulse {
  animation: warrantPulse 2s ease-in-out infinite;
}

/* Verified status enhanced pulse */
@keyframes verifiedPulse {
  0%, 100% { transform: scale(1); background-color: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); }
  50% { transform: scale(1.05); background-color: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.5); }
}
.verified-pulse {
  animation: verifiedPulse 3s ease-in-out infinite;
}

/* Warrant typing effect */
@keyframes warrantTyping {
  0% { width: 0; }
  100% { width: 100%; }
}
.warrant-typing {
  overflow: hidden;
  white-space: nowrap;
  animation: warrantTyping 2s steps(30) infinite;
}

/* Warrant active status */
@keyframes warrantActive {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4), 0 0 20px rgba(251, 191, 36, 0.1); }
  50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0), 0 0 30px rgba(251, 191, 36, 0.2); }
}
.warrant-active {
  animation: warrantActive 2s ease-in-out infinite;
}

/* Trust signal hover effect */
@keyframes trustSignal {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-2px); }
  100% { transform: translateY(0px); }
}
.trust-signal:hover {
  animation: trustSignal 0.6s ease-in-out;
}

/* Gradient background animation */
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.animate-gradient {
  background-size: 200% 200%;
  animation: gradientShift 4s ease-in-out infinite;
}

/* Industry card accent bar animation */
@keyframes accentPulse {
  0%, 100% { opacity: 0.8; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.02); }
}
.industry-accent:hover::before {
  animation: accentPulse 1s ease-in-out;
}

/* Enhanced card hover with better transform */
.enhanced-card-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}
.enhanced-card-hover:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(139, 92, 246, 0.1);
}

/* Terminal window styling */
.terminal-window {
  border-radius: 8px 8px 0 0;
  background: linear-gradient(145deg, #1e293b, #0f172a);
}

/* Timeline connector line animation */
@keyframes timelineFlow {
  0% { transform: scaleY(0); transform-origin: top; }
  100% { transform: scaleY(1); transform-origin: top; }
}
.timeline-connector {
  animation: timelineFlow 0.8s ease-out forwards;
}

/* Step number pulse on active */
@keyframes stepPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
  50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); }
}
.step-active {
  animation: stepPulse 2s ease-in-out infinite;
}

/* Reduce motion preferences */
@media (prefers-reduced-motion: reduce) {
  .warrant-float,
  .warrant-scan-line::after,
  .warrant-pulse,
  .verified-pulse,
  .warrant-typing,
  .warrant-active,
  .trust-signal:hover,
  .animate-gradient,
  .industry-accent:hover::before,
  .timeline-connector,
  .step-active {
    animation: none;
  }
  
  .enhanced-card-hover:hover {
    transform: translateY(-2px);
  }
}
```

---

## Design System Tokens

**File:** `src/styles/design-system.css`

```css
/**
 * Vienna OS Design System — Unified Visual Language
 * 
 * Core principles:
 * 1. PROFESSIONAL: Enterprise-grade, not startup-playful
 * 2. DARK + WARM: Navy/slate base with warm gold/amber accents
 * 3. TYPOGRAPHIC: Let type hierarchy do the work, not decorations
 * 4. SUBTLE MOTION: Smooth, purposeful transitions — never bouncy
 * 5. ICONOGRAPHIC: Lucide icons instead of emoji
 * 6. SPACIOUS: Generous padding, breathing room
 * 7. MONOSPACE FOR DATA: Code, hashes, IDs in mono; prose in sans
 */

/* ─── Typography Scale ─── */
.text-display { font-size: 3.75rem; line-height: 1.05; letter-spacing: -0.025em; font-weight: 700; }
.text-title-1 { font-size: 2.5rem; line-height: 1.1; letter-spacing: -0.02em; font-weight: 700; }
.text-title-2 { font-size: 1.875rem; line-height: 1.15; letter-spacing: -0.015em; font-weight: 600; }
.text-title-3 { font-size: 1.25rem; line-height: 1.3; letter-spacing: -0.01em; font-weight: 600; }
.text-body { font-size: 1rem; line-height: 1.7; }
.text-body-sm { font-size: 0.875rem; line-height: 1.6; }
.text-caption { font-size: 0.75rem; line-height: 1.5; letter-spacing: 0.02em; }
.text-label { font-size: 0.6875rem; line-height: 1.4; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }

/* ─── Premium Color Tokens ─── */
:root {
  --v-gold: #D4A853;
  --v-gold-soft: rgba(212, 168, 83, 0.15);
  --v-gold-border: rgba(212, 168, 83, 0.25);
  --v-violet: #8B5CF6;
  --v-violet-soft: rgba(139, 92, 246, 0.12);
  --v-surface-0: #0B0F1A;
  --v-surface-1: #111827;
  --v-surface-2: #1E293B;
  --v-surface-3: #334155;
  --v-text-primary: #F1F5F9;
  --v-text-secondary: #94A3B8;
  --v-text-muted: #64748B;
  --v-border: rgba(148, 163, 184, 0.12);
  --v-border-strong: rgba(148, 163, 184, 0.2);
}

/* ─── Card Styles ─── */
.v-card {
  background: var(--v-surface-1);
  border: 1px solid var(--v-border);
  border-radius: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.v-card:hover {
  border-color: var(--v-border-strong);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.v-card-elevated {
  background: linear-gradient(135deg, var(--v-surface-1), var(--v-surface-2));
  border: 1px solid var(--v-border-strong);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* ─── Badge Styles (replace emoji) ─── */
.v-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid;
}

.v-badge-gold { background: var(--v-gold-soft); color: var(--v-gold); border-color: var(--v-gold-border); }
.v-badge-violet { background: var(--v-violet-soft); color: var(--v-violet); border-color: rgba(139, 92, 246, 0.25); }
.v-badge-emerald { background: rgba(16, 185, 129, 0.12); color: #34D399; border-color: rgba(16, 185, 129, 0.25); }
.v-badge-blue { background: rgba(59, 130, 246, 0.12); color: #60A5FA; border-color: rgba(59, 130, 246, 0.25); }
.v-badge-rose { background: rgba(244, 63, 94, 0.12); color: #FB7185; border-color: rgba(244, 63, 94, 0.25); }

/* ─── Button Styles ─── */
.v-btn-primary {
  background: linear-gradient(135deg, var(--v-gold), #C08C3A);
  color: #0B0F1A;
  font-weight: 600;
  padding: 12px 28px;
  border-radius: 10px;
  transition: all 0.2s ease;
  border: none;
  font-size: 0.9375rem;
  letter-spacing: -0.01em;
}

.v-btn-primary:hover {
  filter: brightness(1.1);
  box-shadow: 0 4px 16px rgba(212, 168, 83, 0.3);
  transform: translateY(-1px);
}

.v-btn-secondary {
  background: transparent;
  color: var(--v-text-secondary);
  font-weight: 500;
  padding: 12px 28px;
  border-radius: 10px;
  border: 1px solid var(--v-border-strong);
  transition: all 0.2s ease;
  font-size: 0.9375rem;
}

.v-btn-secondary:hover {
  color: var(--v-text-primary);
  border-color: var(--v-gold-border);
  background: var(--v-gold-soft);
}

/* ─── Section Spacing ─── */
.v-section { padding: 6rem 0; }
.v-section-lg { padding: 8rem 0; }

/* ─── Smooth Animations ─── */
@keyframes v-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.v-animate-in {
  animation: v-fade-in 0.5s ease forwards;
}

/* ─── Data Display (monospace) ─── */
.v-mono {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.8125rem;
  letter-spacing: -0.02em;
}

/* ─── Divider ─── */
.v-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--v-border), transparent);
}

/* ─── Status Indicators (replace emoji circles) ─── */
.v-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.v-status-success { background: #34D399; box-shadow: 0 0 8px rgba(52, 211, 153, 0.4); }
.v-status-warning { background: #FBBF24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.4); }
.v-status-error { background: #FB7185; box-shadow: 0 0 8px rgba(251, 113, 133, 0.4); }
.v-status-info { background: #60A5FA; box-shadow: 0 0 8px rgba(96, 165, 250, 0.4); }

/* ─── Tier Indicators (replace emoji with styled badges) ─── */
.v-tier { font-family: monospace; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; }
.v-tier-t0 { background: rgba(52, 211, 153, 0.15); color: #34D399; }
.v-tier-t1 { background: rgba(251, 191, 36, 0.15); color: #FBBF24; }
.v-tier-t2 { background: rgba(251, 113, 133, 0.15); color: #FB7185; }
.v-tier-t3 { background: rgba(139, 92, 246, 0.15); color: #8B5CF6; }
```

---

## Fonts

### Loaded Fonts
- **Cabinet Grotesk** - Display/headlines (weights: 400, 700, 800)
- **Satoshi** - Body/UI text (weights: 400, 500, 700)
- **JetBrains Mono** - Code/data (weights: 400, 500, 600, 700)
- **Inter** - Fallback body (via Google Fonts)

### Font Variables (CSS)
- `--font-inter` - Body text
- `--font-jetbrains` - Monospace

### Typography Classes
- `.text-display` - Large headings (3.75rem)
- `.text-title-1` - H1 (2.5rem)
- `.text-title-2` - H2 (1.875rem)
- `.text-title-3` - H3 (1.25rem)
- `.text-body` - Paragraph (1rem)
- `.text-body-sm` - Small text (0.875rem)
- `.text-caption` - Caption (0.75rem)
- `.text-label` - Label/badge (0.6875rem, uppercase)

---

## Color Palette

### Primary Colors
| Name | Light | Dark | Usage |
|------|-------|------|-------|
| Zinc | #f4f4f5 | #18181b | Backgrounds, borders |
| Violet | #8b5cf6 | #2e1065 | Primary, accents |
| Amber | #fbbf24 | #451a03 | Warnings, warrants |

### Vienna Palette (Legacy)
| Name | Hex | Usage |
|------|-----|-------|
| Navy 950 | #08090C | Deep background |
| Navy 900 | #0D0F14 | Card backgrounds |
| Navy 800 | #141820 | Surface |
| Gold | #D4A853 | Primary accent |
| Warm | #6B6560 | Secondary |

### Status Colors
- Success: #34D399 (emerald)
- Warning: #FBBF24 (amber)
- Error: #FB7185 (rose)
- Info: #60A5FA (blue)

---

## Spacing Scale

- `px-6` - 1.5rem (standard padding)
- `py-4` - 1rem (vertical spacing)
- `gap-6` - 1.5rem (component gaps)
- `mb-8`, `mt-8` - 2rem (section spacing)

---

## Animations

### Performance-Optimized
- Fade-up (0.7s)
- Warrant unfold (0.8s)
- Scroll-triggered animations
- Reduced motion support

### Key Animations
- `animate-float` - Gentle Y-axis bob
- `animate-fade-up` - Entry animation
- `warrant-pulse` - Pulsing glow
- `status-live` - Breathing animation
- `pipeline-flow` - Directional flow

---

## Typography System

### Hierarchy
1. Display (3.75rem) - Page title
2. Title 1 (2.5rem) - Main heading
3. Title 2 (1.875rem) - Section heading
4. Title 3 (1.25rem) - Subsection
5. Body (1rem) - Paragraph text
6. Body-sm (0.875rem) - Secondary text
7. Caption (0.75rem) - Small text
8. Label (0.6875rem) - Tags/badges

### Font Families
- Display/Titles: Cabinet Grotesk
- Body: Satoshi, Inter
- Monospace: JetBrains Mono (for code, hashes, IDs)

---

## Dark Mode

All styles optimized for dark mode:
- Background: `#09090b` (zinc-950)
- Text: `#fafafa` (zinc-50)
- Borders: `rgba(148, 163, 184, 0.12)` (semi-transparent slate)
- Accents: Violet (#8b5cf6), Amber (#fbbf24)
