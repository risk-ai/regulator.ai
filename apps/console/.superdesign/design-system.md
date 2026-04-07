# Vienna OS Console Design System

## Product Context
Vienna OS Console is the operator control plane for AI governance. Users manage agents, policies, approvals, and executions in a data-dense, professional interface.

**Target Users:** Platform engineers, AI operators, compliance teams
**Tone:** Authority, precision, control
**Not:** Consumer-friendly, playful, marketing

## Visual Identity

### Color Palette
**Background:**
- Primary: `#0B0E17` (deep navy)
- Secondary: `#0D1224` (midnight blue)
- Tertiary: `#0F0B1E` (dark purple tint)
- Card: `rgba(17, 24, 39, 0.7)` (translucent dark)
- Elevated card: `rgba(15, 23, 42, 0.6)`

**Border:**
- Subtle: `rgba(148, 163, 184, 0.08)`
- Default: `rgba(148, 163, 184, 0.12)`
- Hover: `rgba(124, 58, 237, 0.4)` (purple)

**Text:**
- Primary: `#f1f5f9` (almost white)
- Secondary: `#cbd5e1` (light gray)
- Tertiary: `#64748b` (medium gray)
- Muted: `#475569` (dark gray)

**Brand Colors:**
- Purple: `#7c3aed` (violet-600), `#a78bfa` (violet-400), `#6d28d9` (violet-700)
- Accent: Purple gradient `linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)`
- Glow: `rgba(124, 58, 237, 0.06)` for ambient highlights

**Status Colors:**
- Success: `#10b981` (emerald-500)
- Warning: `#f59e0b` (amber-500)
- Error: `#ef4444` (red-500)
- Info: `#3b82f6` (blue-500)

### Typography
**Font Family:**
- Primary: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
- Monospace: `'SF Mono', Monaco, 'Courier New', monospace` (for data, code, IDs)

**Hierarchy:**
- H1: 22px, 700 weight, -0.02em tracking
- H2: 18px, 600 weight
- H3: 16px, 600 weight
- Body: 14px, 400 weight
- Small: 13px, 400 weight
- Caption: 12px, 500 weight
- Micro: 11px, 400 weight, uppercase, 0.05em tracking

### Spacing Scale
- 4px (0.25rem)
- 6px (0.375rem)
- 8px (0.5rem)
- 10px (0.625rem)
- 12px (0.75rem)
- 14px (0.875rem)
- 16px (1rem)
- 20px (1.25rem)
- 24px (1.5rem)
- 28px (1.75rem)
- 36px (2.25rem)

### Border Radius
- Small: 10px (inputs, buttons)
- Medium: 16px (cards, modals)
- Large: 20px (hero cards)

### Shadows
- Card: `0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.02) inset`
- Button: `0 2px 8px rgba(124, 58, 237, 0.25)`
- Elevated: `0 8px 32px rgba(0, 0, 0, 0.4)`

### Effects
**Backdrop Blur:** `blur(20px)` on translucent surfaces
**Focus Ring:** `0 0 0 3px rgba(124, 58, 237, 0.08)` + border color `rgba(124, 58, 237, 0.4)`
**Hover Lift:** `transform: translateY(-1px)` + increased shadow

## Components

### Buttons
**Primary (CTA):**
- Background: Purple gradient
- Text: White, 14px, 600 weight
- Padding: 12px horizontal
- Border radius: 10px
- Shadow on default, remove on disabled
- Hover: Slight darkening

**Secondary (Ghost):**
- Background: `rgba(255, 255, 255, 0.04)`
- Border: `1px solid rgba(148, 163, 184, 0.1)`
- Text: `#cbd5e1`
- Hover: Increased opacity

### Inputs
- Background: `rgba(15, 23, 42, 0.6)`
- Border: `1px solid rgba(148, 163, 184, 0.12)`
- Border radius: 10px
- Padding: 11px 14px
- Text: `#e2e8f0`, 14px
- Placeholder: `#64748b`
- Focus: Purple border + shadow ring

### Cards
- Background: `rgba(17, 24, 39, 0.7)` with backdrop blur
- Border: `1px solid rgba(148, 163, 184, 0.08)`
- Border radius: 16px
- Padding: 28px
- Shadow: Layered (outer + inner highlight)

### OAuth Buttons
- Flex layout, equal width
- Background: `rgba(255, 255, 255, 0.04)`
- Border: `1px solid rgba(148, 163, 184, 0.1)`
- Icon + label horizontally centered
- Hover: Increased border opacity

### Dividers
- Horizontal line: `rgba(148, 163, 184, 0.08)`
- With label: Two lines + center text (11px uppercase micro)

## Layout Conventions

### Centered Auth Flow
- Full viewport height
- Content max-width: 420px
- Vertical centering
- Padding: 24px
- Ambient glow behind card

### Data Tables
- Zebra striping with `rgba(148, 163, 184, 0.02)`
- Sticky header row
- Row hover: `rgba(148, 163, 184, 0.03)`
- Monospace for IDs, timestamps

### Dashboard Grid
- 3-column grid on desktop (1fr 1fr 1fr)
- 1-column on mobile
- Gap: 24px

### Sidebar Nav
- Fixed left sidebar, 240px width
- Dark background with subtle border
- Active state: Purple left border + background tint
- Icons + labels

## Animation

### Transitions
- Default: `0.2s ease-in-out`
- Focus rings: `0.15s ease`
- Page transitions: `0.3s cubic-bezier(0.4, 0, 0.2, 1)`

### Loading States
- Spinner: Rotating circle with purple stroke
- Skeleton: Pulsing gradient shimmer

### Micro-interactions
- Button press: Scale down to 0.98
- Card hover: Lift 1px + shadow increase
- Input focus: Border color + ring appearance

## Accessibility

- Focus indicators: Always visible with keyboard nav
- Color contrast: WCAG AA minimum
- Form labels: Always present (not placeholder-only)
- Error messages: Text + icon
- Loading states: Screen reader announcements

## Specific Patterns

### Status Badges
- Pill shape (fully rounded)
- 8px vertical padding, 12px horizontal
- Uppercase micro text
- Color-coded background (10% opacity) + border (20% opacity)
- Examples: "ACTIVE" (green), "PENDING" (amber), "REJECTED" (red)

### Data Rows
- Monospace font for technical data
- Subtle divider between rows
- Compact vertical spacing (8px padding)
- Copy-to-clipboard button on hover

### Modal Overlays
- Dark backdrop: `rgba(0, 0, 0, 0.7)` with blur
- Modal card: Same styling as main cards
- Max-width: 600px
- Centered vertically and horizontally
- Close button: Top-right, subtle

### Empty States
- Icon + heading + description + CTA
- Centered in container
- Gray monochrome palette
- Encouraging copy

## Do Not
- ❌ Use bright, saturated colors outside status indicators
- ❌ Use playful illustrations or emojis
- ❌ Use large rounded corners (>20px)
- ❌ Use light backgrounds (console is always dark)
- ❌ Use serif fonts
- ❌ Use excessive animations (professional, not flashy)
