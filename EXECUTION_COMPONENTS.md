# Vienna OS Execution Components Documentation

## Quick Reference

### ExecutionStatusBadge
```typescript
import { ExecutionStatusBadge } from '../components/executions/ExecutionStatusBadge';

// Basic usage
<ExecutionStatusBadge status="executed" riskTier="T0" />

// With all options
<ExecutionStatusBadge 
  status="denied"
  riskTier="T3"
  size="lg"
  showIcon={true}
/>
```

**Props:**
- `status`: `'executed' | 'denied' | 'failed' | 'pending' | 'approving' | 'complete' | 'executing'`
- `riskTier?`: `'T0' | 'T1' | 'T2' | 'T3'`
- `size?`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `showIcon?`: `boolean` (default: `true`)

**Status-Color Mapping:**
| Status | Color | Icon |
|--------|-------|------|
| executed/complete | Green (#10b981) | ✓ |
| denied | Amber (#fbbf24) | ⊘ |
| failed | Red (#ef4444) | ✕ |
| pending | Blue (#3b82f6) | ⊙ |
| approving | Amber (#f59e0b) | ◐ |
| executing | Amber (#f59e0b) | ⟳ |

---

### WarrantTimeline
```typescript
import { WarrantTimeline } from '../components/executions/WarrantTimeline';

// Basic usage
<WarrantTimeline 
  stages={[
    { stage: 'requested', status: 'complete', timestamp: '2026-04-07T17:30:00Z' },
    { stage: 'evaluated', status: 'complete', timestamp: '2026-04-07T17:31:00Z' },
    { stage: 'approved', status: 'complete', timestamp: '2026-04-07T17:32:00Z' },
    { stage: 'executed', status: 'complete', timestamp: '2026-04-07T17:33:00Z' },
  ]}
  warrantsId="warrant-123"
/>
```

**Props:**
- `stages`: Array of `TimelineStage` objects
  - `stage`: `'requested' | 'evaluated' | 'approved' | 'denied' | 'executed' | 'blocked'`
  - `status`: `'complete' | 'pending' | 'failed'`
  - `timestamp?`: ISO 8601 timestamp string
  - `actor?`: Actor name/ID for audit trail
- `warrantsId?`: Warrant ID for display
- `vertical?`: Boolean for layout (default: `false` = horizontal)

**Stage Progression:**
```
Requested → Evaluated → (Approved|Denied) → (Executed|Blocked)
```

**Status Colors:**
| Status | Color |
|--------|-------|
| complete | Green (#10b981) |
| failed | Red (#ef4444) |
| pending | Amber (#f59e0b) |

---

### ExecutionStatsRow
```typescript
import { ExecutionStatsRow } from '../components/executions/ExecutionStatsRow';

// Basic usage
<ExecutionStatsRow stats={statsData} loading={isLoading} />
```

**Props:**
- `stats`: Optional stats object with:
  - `total_executions?`: number
  - `executed?`: number
  - `denied?`: number
  - `failed?`: number
  - `pending?`: number
  - `executing?`: number
  - `avg_latency_ms?`: number
  - `avg_duration_ms?`: number
- `loading?`: Boolean to show loading state (default: `false`)

**Displayed Metrics:**
1. **Total Executions** (blue) - Total count with completion %
2. **Executed** (green) - Count with % of total
3. **Denied** (amber) - Count with % of total
4. **Failed** (red) - Count with % of total
5. **In Progress** (amber) - Queued + Executing breakdown
6. **Avg Duration** (cyan) - Auto-formatted (ms, s, m)

---

## Integration Examples

### ExecutionsPage - Stats Row
```typescript
// At top of executions list
<ExecutionStatsRow stats={stats} loading={loading} />
```

### ExecutionPage - Warrant Timeline
```typescript
// For active execution
{activeExecutions.length > 0 && (
  <WarrantTimeline
    stages={[
      { stage: 'requested', status: 'complete', timestamp: startTime },
      { stage: 'evaluated', status: 'complete', timestamp: startTime },
      { stage: 'approved', status: 'complete', timestamp: approveTime },
      { stage: 'executed', status: 'complete', timestamp: endTime },
    ]}
    warrantsId={executionId}
  />
)}
```

### ExecutionDetailPage - Status Badge
```typescript
// In header
<ExecutionStatusBadge 
  status={execution.state}
  riskTier={execution.risk_tier}
  size="md"
/>

// In timeline entries
<ExecutionStatusBadge 
  status={entry.state}
  size="sm"
/>
```

---

## Design System Integration

All components use **design system tokens** from `variables.css`:

### Color Tokens
```css
/* Semantic colors */
--success-text: #10b981      /* Green badges */
--warning-text: #f59e0b      /* Amber badges */
--warning-bright: #fbbf24    /* Bright amber for tiers */
--error-text: #ef4444        /* Red badges */
--info-text: #3b82f6         /* Blue badges */

/* Backgrounds & Borders */
--bg-primary: #12131a
--bg-secondary: #1a1b26
--border-subtle: rgba(255,255,255,0.06)
```

### Typography Tokens
```css
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI'
--text-primary: #ffffff
--text-secondary: rgba(255,255,255,0.7)
--text-tertiary: rgba(255,255,255,0.55)
```

### Spacing & Sizes
```css
--space-1: 4px    /* Gaps, padding */
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-6: 24px
--radius-md: 6px  /* Border radius */
--radius-lg: 8px
```

---

## Marketing Tier Colors

All tier colors match marketing specifications:

```typescript
const TIER_COLORS = {
  'T0': '#10b981',  // Emerald (Safe/Unrestricted)
  'T1': '#3b82f6',  // Blue (Monitored)
  'T2': '#fbbf24',  // Amber (Restricted)
  'T3': '#ef4444',  // Red (Critical)
};
```

---

## Animations

### Pulse Animation (Loading/Pending)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

Used for:
- Loading state in ExecutionStatsRow
- Pending timeline stages in WarrantTimeline
- Pulsing timeline dots

---

## Responsive Behavior

### ExecutionStatsRow
- Grid: `repeat(auto-fit, minmax(200px, 1fr))`
- Adapts from 2-6 cards per row based on screen width
- Maintains aspect ratio on mobile

### WarrantTimeline
- Horizontal scrolling on overflow
- Touch-friendly on mobile
- Readable labels even at small sizes

### ExecutionsPage
- Table scrolls horizontally on mobile
- Stats grid collapses to 2 columns
- Filter bar remains accessible

---

## Performance Considerations

### Component Optimization
- **WarrantTimeline**: Uses `useMemo` for timeline sequence calculation
- **ExecutionStatusBadge**: Pure component, no state
- **ExecutionStatsRow**: Simple map/render, no expensive operations

### Animation Performance
- CSS `@keyframes` for pulse (GPU accelerated)
- Optional animations (can be disabled in motion-reduced preferences)
- No JavaScript animation loops

### Bundle Impact
- Total new components: ~600 lines
- No external dependencies beyond React
- Tree-shakeable exports

---

## Accessibility

### WCAG Compliance
- ✅ Color not sole indicator (icons + text)
- ✅ Contrast ratios meet AA standards
- ✅ Semantic HTML structure
- ✅ Title attributes for tooltips

### Keyboard Navigation
- ✅ Focusable status badges (when in tables)
- ✅ Readable labels
- ✅ No keyboard traps

### Screen Reader Support
- ✅ Semantic status text
- ✅ Title attributes for tier colors
- ✅ Proper heading hierarchy

---

## Error Handling

### WarrantTimeline
- Gracefully handles missing stages
- Returns empty message if no stages provided
- Handles missing timestamps

### ExecutionStatsRow
- Returns null if no stats provided
- Shows loading state with pulse
- Handles NaN/undefined values

### ExecutionStatusBadge
- Default fallback for unknown statuses
- Fallback to pending state
- Safe color lookups

---

## Testing Checklist

### Visual Testing
- [ ] All status colors display correctly
- [ ] Tier colors appear as left borders
- [ ] Timeline connectors render properly
- [ ] Icons display correctly
- [ ] Responsive layouts work on mobile
- [ ] Animations are smooth

### Functional Testing
- [ ] Props update correctly
- [ ] Size variations work
- [ ] Loading states display
- [ ] Data flows through hierarchy
- [ ] No console errors
- [ ] Performance is acceptable

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] Contrast ratios pass WCAG AA
- [ ] Color is not sole indicator
- [ ] Focus indicators visible

---

## Migration Guide

### From Old StateBadge to ExecutionStatusBadge

**Before:**
```typescript
<StateBadge state={execution.state} />
```

**After:**
```typescript
<ExecutionStatusBadge 
  status={execution.state as any}
  riskTier={execution.risk_tier}
/>
```

### From Inline Stats to ExecutionStatsRow

**Before:**
```typescript
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
  <StatCard ... />
  <StatCard ... />
  ...
</div>
```

**After:**
```typescript
<ExecutionStatsRow stats={stats} loading={loading} />
```

---

## Future Enhancements

1. **Dynamic Stages**: Allow arbitrary stage configuration
2. **Animations**: Add entrance animations for timeline
3. **Tooltips**: Rich tooltip on metrics
4. **Export**: Include status badges in CSV/JSON export
5. **Theming**: Dark/light mode variants
6. **Internationalization**: i18n support for labels
7. **Accessibility**: ARIA live regions for updates
8. **Mobile**: Optimize timeline for touch

---

## Support & Maintenance

### Getting Help
- Check component JSDoc comments
- Review usage examples in pages
- Check design system docs in `variables.css`

### Reporting Issues
- Include component name
- Provide status/tier values used
- Describe expected vs. actual behavior
- Include screenshot if visual issue

### Contributing
- Follow existing component patterns
- Use design system tokens
- Add JSDoc comments
- Test on multiple browsers
- Update this documentation

---

**Last Updated:** April 7, 2026  
**Component Version:** 1.0.0  
**Design System Version:** 2.0  
**Status:** Production Ready ✅
