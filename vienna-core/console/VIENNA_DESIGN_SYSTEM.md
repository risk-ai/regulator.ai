# Vienna Design System

**Version:** 2.0  
**Date:** 2026-03-14  
**Purpose:** Unified visual language for Vienna Console operator surfaces

---

## Design Principles

### 1. Operator-First
- **Clarity over aesthetics** — Information must be instantly parseable
- **Density with breathing room** — Pack information, but make it scannable
- **State truth** — Never show degraded as healthy, never guess state

### 2. Functional Beauty
- **Every visual element serves a purpose** — No decoration for decoration's sake
- **Color encodes meaning** — Red = attention needed, Green = healthy, Blue = informational
- **Motion draws attention** — Animations only for state changes or loading

### 3. Professional Polish
- **Consistent spacing** — 4px base grid (4, 8, 12, 16, 24, 32, 48)
- **Refined typography** — Clear hierarchy, readable at all sizes
- **Subtle depth** — Shadows and borders create layers without distraction

---

## Color System

### Base Palette
```css
--bg-app: #0a0a0a;           /* App background (darkest) */
--bg-primary: #111111;        /* Panel background */
--bg-secondary: #1a1a1a;      /* Card background */
--bg-tertiary: #242424;       /* Nested card background */
--bg-hover: #2a2a2a;          /* Hover states */
--bg-active: #333333;         /* Active/pressed states */
```

### Text Palette
```css
--text-primary: #ffffff;      /* Primary text */
--text-secondary: #b4b4b4;    /* Secondary text */
--text-tertiary: #8a8a8a;     /* Tertiary text / labels */
--text-disabled: #5a5a5a;     /* Disabled text */
--text-muted: #3a3a3a;        /* Very subtle text */
```

### Border Palette
```css
--border-subtle: #1f1f1f;     /* Very subtle borders */
--border-default: #2a2a2a;    /* Default borders */
--border-strong: #3a3a3a;     /* Emphasized borders */
--border-focus: #4a9eff;      /* Focus rings */
```

### Semantic Colors
```css
/* Success / Healthy */
--success-bg: #0a1f0f;
--success-border: #1e5a2e;
--success-text: #4ade80;
--success-bright: #86efac;

/* Warning / Degraded */
--warning-bg: #1f1808;
--warning-border: #8b5a1f;
--warning-text: #fbbf24;
--warning-bright: #fcd34d;

/* Error / Critical */
--error-bg: #1f0a0a;
--error-border: #8b1f1f;
--error-text: #f87171;
--error-bright: #fca5a5;

/* Info / Informational */
--info-bg: #0a1a2f;
--info-border: #1f4a8b;
--info-text: #60a5fa;
--info-bright: #93c5fd;

/* Unknown / Neutral */
--neutral-bg: #1a1a1a;
--neutral-border: #3a3a3a;
--neutral-text: #9ca3af;
--neutral-bright: #d1d5db;
```

### Accent Colors
```css
--accent-primary: #4a9eff;    /* Primary actions */
--accent-secondary: #7c3aed;  /* Secondary actions */
--accent-tertiary: #ec4899;   /* Tertiary actions */
```

---

## Typography

### Font Stack
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Helvetica Neue', Arial, sans-serif;
             
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', 
             Consolas, 'Courier New', monospace;
             
--font-display: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
```

### Scale
```css
--text-xs: 11px;      /* Labels, meta text */
--text-sm: 13px;      /* Body text (small) */
--text-base: 15px;    /* Body text (default) */
--text-lg: 17px;      /* Emphasized text */
--text-xl: 20px;      /* Section headings */
--text-2xl: 24px;     /* Page headings */
--text-3xl: 32px;     /* Large metrics */
--text-4xl: 48px;     /* Hero metrics */
```

### Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

---

## Spacing System

### Base Grid: 4px

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### Component Spacing

**Cards:**
- Padding: `var(--space-4)` to `var(--space-6)`
- Gap between cards: `var(--space-4)`

**Sections:**
- Padding: `var(--space-6)` to `var(--space-8)`
- Gap between sections: `var(--space-6)`

**Inline elements:**
- Gap: `var(--space-2)` to `var(--space-3)`

---

## Borders & Radius

### Border Widths
```css
--border-thin: 1px;
--border-default: 1px;
--border-thick: 2px;
--border-emphasis: 3px;
```

### Border Radius
```css
--radius-sm: 4px;      /* Buttons, badges */
--radius-md: 6px;      /* Cards, inputs */
--radius-lg: 8px;      /* Panels */
--radius-xl: 12px;     /* Large panels */
--radius-full: 9999px; /* Pills, avatars */
```

---

## Shadows

### Elevation Levels
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4),
             0 2px 4px -1px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5),
             0 4px 6px -2px rgba(0, 0, 0, 0.3);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6),
             0 10px 10px -5px rgba(0, 0, 0, 0.3);
```

### Glow Effects
```css
--glow-success: 0 0 20px rgba(74, 222, 128, 0.3);
--glow-warning: 0 0 20px rgba(251, 191, 36, 0.3);
--glow-error: 0 0 20px rgba(248, 113, 113, 0.3);
--glow-info: 0 0 20px rgba(96, 165, 250, 0.3);
```

---

## Animations

### Transitions
```css
--transition-fast: 100ms ease-in-out;
--transition-base: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;
```

### Common Animations
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

---

## Component Patterns

### Status Badges

**Structure:**
```jsx
<span className="status-badge status-healthy">
  ✓ Healthy
</span>
```

**Variants:**
- `.status-healthy` — Green background, success text
- `.status-degraded` — Yellow background, warning text
- `.status-critical` — Red background, error text
- `.status-unknown` — Gray background, neutral text

**Styling:**
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: var(--transition-base);
}
```

### Metric Cards

**Structure:**
```jsx
<div className="metric-card">
  <div className="metric-label">Queue Depth</div>
  <div className="metric-value">42</div>
  <div className="metric-detail">12 executing</div>
</div>
```

**Styling:**
```css
.metric-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: var(--transition-base);
}

.metric-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

### Panels

**Structure:**
```jsx
<div className="panel">
  <div className="panel-header">
    <h3>Panel Title</h3>
    <span className="panel-badge">12</span>
  </div>
  <div className="panel-body">
    Content
  </div>
</div>
```

**Styling:**
```css
.panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}
```

### Empty States

**Styling:**
```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  text-align: center;
  color: var(--text-tertiary);
}

.empty-state-icon {
  font-size: var(--text-4xl);
  opacity: 0.5;
  margin-bottom: var(--space-4);
}

.empty-state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
```

---

## Icons & Indicators

### State Indicators
```
✓ — Success / Healthy
⚠ — Warning / Degraded
🚨 — Critical / Error
⏸ — Paused
🔄 — Loading / Refresh
⚫ — Offline / Unknown
🟢 — Live / Active
🔴 — Disconnected / Failed
🟡 — Degraded / Warning
```

### Directional Icons
```
→ — Next / Forward
← — Back / Previous
↑ — Increase / Up
↓ — Decrease / Down
⤴ — Escalate / Priority
⤵ — Degraded / Low Priority
```

---

## Functional Observability

### Health Status Hierarchy

**System Level:**
1. Overall system state (healthy/degraded/critical)
2. Pause status (active/paused + reason)
3. Telemetry freshness (live/stale/disconnected)

**Provider Level:**
1. Provider count (healthy/degraded/unavailable/unknown)
2. Individual provider status
3. Failure rates
4. Last seen timestamps

**Execution Level:**
1. Queue depth (total/executing/blocked)
2. Active objectives
3. Recent failures (count, rate, top errors)
4. Dead letter queue status

### Data Freshness Indicators

**Always show:**
- Last updated timestamp
- Snapshot age
- Stream connection status (live/disconnected)
- Degradation warnings if >5s snapshot time

**Pattern:**
```jsx
<div className="freshness-indicator">
  <span className={snapshot.telemetry.live ? 'live' : 'stale'}>
    {snapshot.telemetry.live ? '🟢 Live' : '🔴 Stale'}
  </span>
  <span className="timestamp">
    Updated: {formatTimestamp(lastUpdated)}
  </span>
</div>
```

---

## Accessibility

### Focus States
- All interactive elements must have visible focus rings
- Use `--border-focus` for focus outlines
- Minimum 2px outline width

### Color Contrast
- Text on dark backgrounds: minimum 7:1 ratio (AAA)
- Interactive elements: minimum 4.5:1 ratio (AA)
- Never rely on color alone for state

### Keyboard Navigation
- All actions accessible via keyboard
- Logical tab order
- Clear visual focus indicators

---

## Implementation Guidelines

### CSS Variable Usage

**Always use variables:**
```css
/* ✓ Good */
background: var(--bg-secondary);
color: var(--text-primary);
padding: var(--space-4);

/* ✗ Bad */
background: #1a1a1a;
color: white;
padding: 16px;
```

### Semantic Class Names

**Prefer:**
```html
<div class="metric-card metric-critical">
<span class="status-badge status-healthy">
<button class="action-primary">
```

**Avoid:**
```html
<div class="red-card">
<span class="green-badge">
<button class="big-button">
```

### Component Composition

**Build complex UIs from simple primitives:**
```jsx
// ✓ Good
<Panel>
  <PanelHeader title="Metrics" badge={12} />
  <PanelBody>
    <MetricCard label="Queue" value={42} />
  </PanelBody>
</Panel>

// ✗ Bad
<div className="custom-metrics-panel-with-badge">
  <div className="custom-header-12">...</div>
</div>
```

---

## Reference Implementation

See:
- `/components/ui/` — Core UI primitives
- `/components/OperatorNowView.tsx` — Reference dashboard
- `/styles/variables.css` — CSS variable definitions
- `/styles/base.css` — Base styles and resets

---

**Last Updated:** 2026-03-14  
**Maintainer:** Vienna Core Team
