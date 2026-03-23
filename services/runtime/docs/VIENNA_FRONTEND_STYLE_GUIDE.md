# Vienna Frontend Style Guide

**Version:** 1.0.0  
**Date:** 2026-03-14  
**Purpose:** Consistent visual language for Vienna Operator Shell

---

## Design Philosophy

Vienna should feel like:
```
modern infrastructure console
mission control
calm operator shell
```

Not flashy. Not consumer-chat. Not generic SaaS.

**Core principles:**
- **Clarity over decoration**
- **Structure over improvisation**
- **Trustworthy over exciting**
- **Operational over conversational**

---

## Color System

### Base Colors

**Neutrals (Gray scale):**
```css
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

**Primary background:** `gray-900` (#111827) or `gray-800` (#1f2937)  
**Panel background:** `gray-800` (#1f2937)  
**Border:** `gray-700` (#374151)  
**Text primary:** `white` (#ffffff)  
**Text secondary:** `gray-400` (#9ca3af)

### State Colors

**Semantic meaning is critical in infrastructure UIs.**

```css
/* Idle / Neutral */
--state-idle: gray-600;

/* Healthy / Active / Success */
--state-healthy: #10b981; /* green-500 */
--state-success: #10b981;

/* In-flight / Reconciling */
--state-reconciling: #3b82f6; /* blue-500 */
--state-executing: #3b82f6;

/* Cooldown / Waiting */
--state-cooldown: #f59e0b; /* amber-500 */
--state-waiting: #f59e0b;

/* Degraded / Warning */
--state-degraded: #f97316; /* orange-500 */
--state-warning: #f97316;

/* Failed / Critical */
--state-failed: #ef4444; /* red-500 */
--state-critical: #ef4444;

/* Safe Mode / Override */
--state-safemode: #a855f7; /* purple-500 */
--state-override: #a855f7;

/* Info / Unknown */
--state-info: #06b6d4; /* cyan-500 */
--state-unknown: gray-500;
```

**Usage consistency:**
- `idle` → gray-600
- `healthy` → green-500
- `reconciling` → blue-500
- `cooldown` → amber-500
- `degraded` → orange-500
- `failed` → red-500
- `safe_mode` → purple-500
- `unknown` → gray-500

### Accent Colors

**Primary accent:** `blue-600` (#2563eb)  
**Secondary accent:** `cyan-600` (#0891b2)  
**Highlight:** `blue-500` (#3b82f6)

---

## Typography

### Scale

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Weights

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Usage

**Page title:** `text-2xl font-semibold`  
**Section heading:** `text-xl font-semibold`  
**Panel heading:** `text-lg font-semibold`  
**Subsection:** `text-base font-medium`  
**Body text:** `text-sm font-normal`  
**Label/metadata:** `text-xs font-normal text-gray-400`  
**Code/monospace:** `font-mono text-sm`

### Line Height

**Headings:** `line-height: 1.25`  
**Body:** `line-height: 1.5`  
**Tight (labels):** `line-height: 1.2`

---

## Spacing System

### Scale (8px base)

```css
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### Usage

**Panel padding:** `space-4` (16px) or `space-6` (24px)  
**Section gap:** `space-6` (24px) or `space-8` (32px)  
**Element gap:** `space-4` (16px)  
**Compact gap:** `space-2` (8px)  
**Tight gap:** `space-1` (4px)

---

## Borders & Radius

### Border Width

```css
--border-thin: 1px;
--border-medium: 2px;
--border-thick: 4px;
```

**Default panel:** `1px solid var(--gray-700)`  
**Focus state:** `2px solid var(--blue-500)`  
**Emphasis:** `2px solid var(--state-*)`

### Border Radius

```css
--radius-sm: 0.25rem;  /* 4px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem;   /* 8px */
--radius-xl: 0.75rem;  /* 12px */
--radius-full: 9999px; /* Pill */
```

**Panel corners:** `radius-lg` (8px)  
**Button corners:** `radius-md` (6px)  
**Badge corners:** `radius-md` (6px) or `radius-full` (pill)  
**Input corners:** `radius-md` (6px)

---

## Shadows

### Elevation

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

**Usage:**
- **Panels (level 1):** `shadow-md`
- **Modals (level 2):** `shadow-lg`
- **Popovers (level 3):** `shadow-xl`
- **Hover lift:** Add `shadow-lg`

---

## Component Patterns

### Panel Structure

```html
<div class="panel">
  <div class="panel-header">
    <h3 class="panel-title">Title</h3>
    <span class="panel-meta">Metadata</span>
  </div>
  <div class="panel-body">
    Content
  </div>
</div>
```

**CSS:**
```css
.panel {
  background: var(--gray-800);
  border: 1px solid var(--gray-700);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.panel-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--gray-700);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: white;
}

.panel-meta {
  font-size: var(--text-xs);
  color: var(--gray-400);
}

.panel-body {
  padding: var(--space-4);
}
```

### Metric Card

```html
<div class="metric-card">
  <div class="metric-label">Queue Depth</div>
  <div class="metric-value">42</div>
  <div class="metric-detail">3 executing · 2 blocked</div>
</div>
```

**CSS:**
```css
.metric-card {
  background: var(--gray-800);
  border: 1px solid var(--gray-700);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  min-width: 180px;
}

.metric-label {
  font-size: var(--text-xs);
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.metric-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: white;
  margin-bottom: var(--space-1);
}

.metric-detail {
  font-size: var(--text-xs);
  color: var(--gray-500);
}
```

### State Badge

```html
<span class="badge badge-healthy">Healthy</span>
<span class="badge badge-degraded">Degraded</span>
```

**CSS:**
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-healthy {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.badge-degraded {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
  border: 1px solid rgba(249, 115, 22, 0.2);
}

/* Repeat for each state */
```

### Empty State

```html
<div class="empty-state">
  <div class="empty-state-icon">📊</div>
  <h4 class="empty-state-title">No active execution leases</h4>
  <p class="empty-state-description">
    Vienna is not currently running any time-bounded reconciliations.
  </p>
</div>
```

**CSS:**
```css
.empty-state {
  padding: var(--space-12) var(--space-6);
  text-align: center;
  color: var(--gray-500);
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.empty-state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-400);
  margin-bottom: var(--space-2);
}

.empty-state-description {
  font-size: var(--text-sm);
  color: var(--gray-500);
  max-width: 400px;
  margin: 0 auto;
}
```

---

## Animation & Transitions

### Timing

```css
--transition-fast: 150ms;
--transition-base: 200ms;
--transition-slow: 300ms;
```

**Usage:**
```css
transition: all var(--transition-base) ease-in-out;
```

### Hover States

**Panels:** Slight shadow lift
```css
.panel:hover {
  box-shadow: var(--shadow-lg);
  transition: box-shadow var(--transition-base);
}
```

**Buttons:** Background darken
```css
.button:hover {
  background: var(--blue-700);
  transition: background var(--transition-fast);
}
```

**Links:** Color shift
```css
a:hover {
  color: var(--blue-400);
  transition: color var(--transition-fast);
}
```

---

## Loading States

### Spinner

```html
<div class="spinner"></div>
```

**CSS:**
```css
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--gray-700);
  border-top-color: var(--blue-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Skeleton

```html
<div class="skeleton skeleton-text"></div>
```

**CSS:**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-800) 25%,
    var(--gray-700) 50%,
    var(--gray-800) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
  border-radius: var(--radius-md);
}

.skeleton-text {
  height: 1rem;
  margin-bottom: var(--space-2);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Focus & Accessibility

### Focus Rings

```css
:focus-visible {
  outline: 2px solid var(--blue-500);
  outline-offset: 2px;
}

button:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--blue-500);
  outline-offset: 2px;
}
```

### Keyboard Navigation

Ensure all interactive elements:
- Have visible focus states
- Are keyboard accessible
- Have ARIA labels where needed

---

## Grid & Layout

### Container Widths

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

### Grid Systems

**Two-column:**
```css
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}
```

**Three-column:**
```css
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}
```

**Auto-fit (responsive):**
```css
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
}
```

---

## Button Styles

### Primary

```css
.btn-primary {
  padding: var(--space-2) var(--space-4);
  background: var(--blue-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-primary:hover {
  background: var(--blue-700);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Secondary

```css
.btn-secondary {
  padding: var(--space-2) var(--space-4);
  background: transparent;
  color: var(--gray-300);
  border: 1px solid var(--gray-600);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  border-color: var(--gray-500);
  background: rgba(255, 255, 255, 0.05);
}
```

### Danger

```css
.btn-danger {
  padding: var(--space-2) var(--space-4);
  background: var(--red-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
}

.btn-danger:hover {
  background: var(--red-700);
}
```

---

## Implementation Guidelines

### Use CSS Variables

Define at `:root` level:
```css
:root {
  --gray-900: #111827;
  --blue-600: #2563eb;
  /* etc */
}
```

Use in components:
```css
.panel {
  background: var(--gray-800);
  border: 1px solid var(--gray-700);
}
```

### Prefer Utility Classes

For spacing, colors, typography, use Tailwind utilities:
```html
<div class="p-4 bg-gray-800 border border-gray-700 rounded-lg">
```

For component-specific styles, use CSS classes:
```html
<div class="metric-card">
```

### Component Organization

```
src/
  styles/
    variables.css      # CSS variables
    base.css          # Reset + base styles
    components/       # Component-specific CSS
      panel.css
      badge.css
      metric-card.css
    utilities.css     # Custom utilities
```

---

## Bottom Line

**Vienna should look and feel like a serious infrastructure control plane.**

Use this guide to ensure:
- Visual consistency across all components
- Clear state communication
- Professional operator-grade appearance
- Trustworthy, calm, structured interface
