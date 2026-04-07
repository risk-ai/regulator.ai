# Vienna OS Console — Design System

## Product Context

**Product:** Vienna OS Console - Governance Dashboard  
**Brand Identity:** Premium SaaS dashboard for AI governance operations  
**Design Language:** Professional, clean, information-dense with subtle luxury

## Core Principles

1. **Information Density** - Show maximum relevant data without clutter
2. **Professional Polish** - Premium dark theme with subtle contrasts
3. **Operational Clarity** - Fast scanning, clear hierarchy, instant status comprehension
4. **Trust & Authority** - Governance platform must feel reliable and authoritative

---

## Colors (from variables.css)

### Backgrounds (Layered Dark)

**Base:**
- `--bg-app: #0a0a0f` - Main app background
- `--bg-primary: #12131a` - Primary card/panel background
- `--bg-secondary: #1a1b26` - Secondary surfaces
- `--bg-tertiary: #22242e` - Tertiary surfaces, nested cards

**Interactive:**
- `--bg-hover: rgba(255,255,255,0.03)` - Hover state
- `--bg-active: rgba(255,255,255,0.06)` - Active/pressed state

### Text (Premium Hierarchy)

- `--text-primary: #ffffff` - Main headings, key data
- `--text-secondary: rgba(255,255,255,0.7)` - Body text, labels
- `--text-tertiary: rgba(255,255,255,0.55)` - Muted text, helper text
- `--text-disabled: rgba(255,255,255,0.35)` - Disabled states
- `--text-muted: rgba(255,255,255,0.25)` - Very subtle text

### Borders (Subtle Surface Contrast)

- `--border-subtle: rgba(255,255,255,0.06)` - Card borders, dividers
- `--border-default: rgba(255,255,255,0.08)` - Default borders
- `--border-strong: rgba(255,255,255,0.12)` - Emphasized borders
- `--border-focus: #7c3aed` - Focus rings (purple)

### Semantic Colors

**Success / Healthy:**
- Background: `rgba(16, 185, 129, 0.08)`
- Border: `rgba(16, 185, 129, 0.2)`
- Text: `#10b981` (green-500)
- Bright: `#34d399` (green-400)

**Warning / Degraded:**
- Background: `rgba(245, 158, 11, 0.08)`
- Border: `rgba(245, 158, 11, 0.2)`
- Text: `#f59e0b` (amber-500)
- Bright: `#fbbf24` (amber-400)

**Error / Critical:**
- Background: `rgba(239, 68, 68, 0.08)`
- Border: `rgba(239, 68, 68, 0.2)`
- Text: `#ef4444` (red-500)
- Bright: `#f87171` (red-400)

**Info / Informational:**
- Background: `rgba(59, 130, 246, 0.08)`
- Border: `rgba(59, 130, 246, 0.2)`
- Text: `#3b82f6` (blue-500)
- Bright: `#60a5fa` (blue-400)

### Accent Colors

- Primary: `#7c3aed` (purple-600)
- Secondary: `#a855f7` (purple-500)
- Tertiary: `#c084fc` (purple-400)

---

## Typography

### Fonts

**Sans (UI Text):**
- `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif`
- Use for: Navigation, labels, body text, buttons

**Mono (Data):**
- `'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace`
- Use for: Numbers, timestamps, IDs, code, JSON, technical data

**Display (Headings):**
- `Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- Use for: Page titles, section headers

### Type Scale

- Helper text: `11px` (labels, captions)
- Body text: `13px` (standard text)
- Base text: `15px` (larger body)
- Large text: `17px` (emphasized body)
- Title: `20px` (page titles)
- Large title: `24px` (main headings)
- KPI: `32px` (dashboard numbers)
- Large KPI: `36px` (hero metrics)

### Font Weights

- Normal: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`

---

## Components

### Cards

**Standard Card:**
```html
<div style="background: #12131a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px;">
  <!-- content -->
</div>
```

**Nested Card:**
```html
<div style="background: #1a1b26; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 12px;">
  <!-- content -->
</div>
```

**Status Card (Success):**
```html
<div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 16px;">
  <!-- content with #10b981 text -->
</div>
```

### Buttons

**Primary (Purple):**
```html
<button style="background: #7c3aed; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 13px;">
  Action
</button>
```

**Secondary (Outline):**
```html
<button style="background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 13px;">
  Cancel
</button>
```

**Ghost (Subtle):**
```html
<button style="background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.7); padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 13px;">
  View
</button>
```

### Badges

**Status Badge (Active):**
```html
<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 4px; color: #10b981; font-size: 11px; font-weight: 500;">
  <span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span>
  ACTIVE
</span>
```

**Risk Tier Badge (T2):**
```html
<span style="padding: 4px 8px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 4px; color: #f59e0b; font-family: monospace; font-size: 11px; font-weight: 600;">
  T2
</span>
```

### Tables

**Table Header:**
```html
<thead style="border-bottom: 1px solid rgba(255,255,255,0.08);">
  <tr>
    <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.05em;">
      Agent
    </th>
  </tr>
</thead>
```

**Table Row:**
```html
<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
  <td style="padding: 12px 16px; font-size: 13px; color: rgba(255,255,255,0.7);">
    agent-sigma-v4
  </td>
</tr>
```

### Stats Display

**KPI Card:**
```html
<div style="background: #12131a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 20px;">
  <div style="font-size: 11px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
    Total Executions
  </div>
  <div style="font-size: 32px; font-family: monospace; font-weight: 600; color: #ffffff; margin-bottom: 4px;">
    2,847
  </div>
  <div style="font-size: 11px; color: #10b981;">
    ↑ 12.3% from last week
  </div>
</div>
```

### Navigation

**Sidebar Nav Item (Active):**
```html
<a href="#" style="display: block; padding: 8px 12px; background: rgba(124, 58, 237, 0.1); border-left: 2px solid #7c3aed; color: #ffffff; font-size: 13px; font-weight: 500; text-decoration: none;">
  Dashboard
</a>
```

**Sidebar Nav Item (Inactive):**
```html
<a href="#" style="display: block; padding: 8px 12px; color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 400; text-decoration: none;">
  Policies
</a>
```

---

## Layout Patterns

### Dashboard Grid

**3-Column Stats:**
```html
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
  <!-- KPI cards -->
</div>
```

**2-Column Layout (Sidebar + Main):**
```html
<div style="display: grid; grid-template-columns: 240px 1fr; gap: 24px;">
  <!-- Sidebar + Main content -->
</div>
```

### Page Structure

**Standard Page:**
```html
<div style="padding: 24px; background: #0a0a0f;">
  <!-- Page header -->
  <div style="margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">
      Fleet Dashboard
    </h1>
    <p style="font-size: 13px; color: rgba(255,255,255,0.55);">
      Monitor all agents under governance
    </p>
  </div>
  
  <!-- Stats row -->
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
    <!-- KPI cards -->
  </div>
  
  <!-- Main content -->
  <div style="background: #12131a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 24px;">
    <!-- Table or content -->
  </div>
</div>
```

---

## Spacing

- `4px` - Micro spacing (icon-text gaps)
- `8px` - Small spacing (button padding)
- `12px` - Default spacing (card padding, row gaps)
- `16px` - Medium spacing (section gaps)
- `24px` - Large spacing (page sections)
- `32px` - XL spacing (major sections)
- `48px` - XXL spacing (page top/bottom)

---

## Border Radius

- `4px` - Small (badges, small buttons)
- `6px` - Default (buttons, inputs)
- `8px` - Large (cards, panels)
- `12px` - XL (modals, large cards)

---

## Design Fidelity Rules

**WHEN CREATING CONSOLE DESIGNS:**

1. **Use ONLY the colors from variables.css** - No bright colors, no pastels
2. **Maintain professional hierarchy** - Primary/secondary/tertiary text levels
3. **Use monospace for data only** - IDs, timestamps, numbers, not all text
4. **Subtle borders and backgrounds** - Layered surfaces, not stark contrasts
5. **Purple accent sparingly** - Focus states, active items, CTAs only

**Every console design iteration must:**
- Use the exact background colors (`#0a0a0f`, `#12131a`, `#1a1b26`)
- Use the exact border colors (6%, 8%, 12% white opacity)
- Use semantic colors only for status (green=healthy, amber=warning, red=error)
- Maintain the premium layered aesthetic (not flat, not stark)

---

**Design system version:** Console 1.0 (2026-04-07)  
**Maintained by:** Vienna (Technical Lead)
