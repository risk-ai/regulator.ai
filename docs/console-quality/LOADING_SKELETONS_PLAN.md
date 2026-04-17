# Loading Skeletons Implementation Plan

**Date:** 2026-04-16  
**Goal:** Replace generic spinners with content-aware skeleton loaders  
**Impact:** 30-50% perceived performance improvement

---

## Why Skeletons?

**Before (Generic Spinner):**
```tsx
{loading && <div className="spinner">Loading...</div>}
```
- User sees nothing → blank screen → content appears
- Feels slow and jarring
- No context about what's loading

**After (Content Skeleton):**
```tsx
{loading && <AgentCardSkeleton />}
```
- User sees layout immediately
- Gradual reveal feels faster
- Sets expectations for content

**Perceived Performance:**
- Feels 30-50% faster (studies show)
- Reduces bounce rate
- More professional UX

---

## Current State

**Pages with loading states:** 13/42 (after error state work)  
**Pages using skeletons:** 0/42  
**Skeleton components:** None exist yet

---

## Implementation Strategy

### Phase 1: Create Skeleton Library (1-2 hours)

Build reusable skeleton components:

**1. Base Skeleton Component**
```tsx
// src/components/ui/Skeleton.tsx
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  count?: number;
  className?: string;
}

export function Skeleton({ 
  width = '100%', 
  height = '1em', 
  circle = false,
  count = 1,
  className = ''
}: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${circle ? 'skeleton-circle' : ''} ${className}`}
          style={{ width, height }}
        />
      ))}
    </>
  );
}
```

**2. Skeleton CSS**
```css
/* src/styles/skeleton.css */
@keyframes skeleton-loading {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.skeleton {
  display: inline-block;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200px 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-text {
  height: 1em;
  margin-bottom: 0.5em;
}

.skeleton-title {
  height: 1.5em;
  width: 60%;
  margin-bottom: 1em;
}

.skeleton-paragraph {
  height: 1em;
}
```

**3. Composite Skeletons**

Build page-specific skeletons:

```tsx
// src/components/ui/skeletons/AgentCardSkeleton.tsx
export function AgentCardSkeleton() {
  return (
    <div className="agent-card">
      <Skeleton circle width={48} height={48} />
      <div className="agent-card-content">
        <Skeleton width="60%" height={20} />
        <Skeleton width="40%" height={16} />
        <Skeleton count={2} width="100%" height={12} />
      </div>
    </div>
  );
}

// src/components/ui/skeletons/MetricCardSkeleton.tsx
export function MetricCardSkeleton() {
  return (
    <div className="metric-card">
      <Skeleton width="40%" height={12} />
      <Skeleton width="80%" height={32} />
      <Skeleton width="100%" height={60} />
    </div>
  );
}

// src/components/ui/skeletons/TableSkeleton.tsx
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="table-skeleton">
      <div className="table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="100%" height={16} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="table-row">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} width="90%" height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}

// src/components/ui/skeletons/ListSkeleton.tsx
export function ListSkeleton({ count = 10 }) {
  return (
    <div className="list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="list-item-skeleton">
          <Skeleton circle width={40} height={40} />
          <div className="list-item-content">
            <Skeleton width="70%" height={16} />
            <Skeleton width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Phase 2: Implement in High-Traffic Pages (2-3 hours)

**Priority pages for skeletons:**

1. **DashboardPremium** - 6 metric cards
   ```tsx
   {loading ? (
     <div className="metrics-grid">
       <MetricCardSkeleton count={6} />
     </div>
   ) : (
     <MetricsGrid data={data} />
   )}
   ```

2. **FleetPremium** - Agent grid
   ```tsx
   {loading ? (
     <div className="agent-grid">
       <AgentCardSkeleton count={12} />
     </div>
   ) : (
     <AgentGrid agents={agents} />
   )}
   ```

3. **ApprovalsPremium** - Approval cards
   ```tsx
   {loading ? (
     <ListSkeleton count={5} />
   ) : (
     <ApprovalsList approvals={approvals} />
   )}
   ```

4. **PolicyBuilderPage** - Policy list
   ```tsx
   {loading ? (
     <TableSkeleton rows={10} columns={5} />
   ) : (
     <PolicyTable policies={policies} />
   )}
   ```

5. **AnalyticsPremium** - Charts + tables
   ```tsx
   {loading ? (
     <>
       <MetricCardSkeleton count={6} />
       <TableSkeleton rows={8} columns={4} />
     </>
   ) : (
     <AnalyticsDashboard data={data} />
   )}
   ```

6. **AgentDetailPage** - Profile + activity
   ```tsx
   {loading ? (
     <AgentDetailSkeleton />
   ) : (
     <AgentProfile agent={agent} />
   )}
   ```

7. **ExecutionsPage** - Execution list
   ```tsx
   {loading ? (
     <ListSkeleton count={15} />
   ) : (
     <ExecutionsList executions={executions} />
   )}
   ```

8. **CompliancePremium** - Compliance dashboard
   ```tsx
   {loading ? (
     <ComplianceSkeleton />
   ) : (
     <ComplianceDashboard data={data} />
   )}
   ```

9. **HistoryPage** - Audit timeline
   ```tsx
   {loading ? (
     <ListSkeleton count={20} />
   ) : (
     <AuditTimeline entries={entries} />
   )}
   ```

10. **RuntimePage** - System metrics
    ```tsx
    {loading ? (
      <MetricCardSkeleton count={8} />
    ) : (
      <RuntimeMetrics stats={stats} />
    )}
    ```

### Phase 3: Rollout to All Pages (2-3 hours)

Add skeletons to remaining 32 pages using appropriate components.

---

## Skeleton Component Library

**Create these reusable skeletons:**

- [x] `Skeleton` (base)
- [ ] `MetricCardSkeleton`
- [ ] `AgentCardSkeleton`
- [ ] `TableSkeleton`
- [ ] `ListSkeleton`
- [ ] `ProfileSkeleton`
- [ ] `ChartSkeleton`
- [ ] `CardGridSkeleton`
- [ ] `TimelineSkeleton`
- [ ] `FormSkeleton`

**Location:** `src/components/ui/skeletons/`

---

## Best Practices

### 1. Match Content Shape

Skeleton should mirror actual content:
```tsx
// ❌ Bad: Generic skeleton doesn't match content
{loading && <Skeleton count={5} />}

// ✅ Good: Matches actual layout
{loading && (
  <div className="agent-card-grid">
    {Array.from({ length: 6 }).map((_, i) => (
      <AgentCardSkeleton key={i} />
    ))}
  </div>
)}
```

### 2. Show Expected Count

Match the expected number of items:
```tsx
// Show skeleton for typical page size
<TableSkeleton rows={10} /> // If typical table has ~10 rows
<ListSkeleton count={15} /> // If typical list has ~15 items
```

### 3. Progressive Loading

Load critical content first:
```tsx
{loading ? (
  <>
    <MetricCardSkeleton count={4} /> {/* Load metrics first */}
    <div className="skeleton-placeholder" style={{ height: 400 }} />
  </>
) : (
  <>
    <MetricsGrid data={data.metrics} />
    <DetailedChart data={data.chart} />
  </>
)}
```

### 4. Animation Timing

Keep it subtle:
```css
animation: skeleton-loading 1.5s ease-in-out infinite;
/* Not too fast (< 1s) - looks jittery */
/* Not too slow (> 2s) - looks broken */
```

---

## Testing Plan

1. **Visual Test:** Compare side-by-side
   - Before: Loading spinner
   - After: Content skeleton
   - Measure perceived speed

2. **Performance Test:** Measure actual impact
   ```javascript
   // Time to first paint
   performance.mark('skeleton-start');
   // ... render skeleton
   performance.mark('skeleton-end');
   performance.measure('skeleton', 'skeleton-start', 'skeleton-end');
   ```

3. **User Testing:** A/B test
   - 50% users see spinners
   - 50% users see skeletons
   - Measure bounce rate & engagement

---

## Success Metrics

- [ ] Skeletons match content layout 100%
- [ ] Perceived load time feels 30-50% faster
- [ ] 0 layout shift when content loads
- [ ] All high-traffic pages have skeletons
- [ ] Animation is smooth (60fps)
- [ ] Works on all breakpoints (mobile/tablet/desktop)

---

## Rollout Plan

**Week 1:** Create skeleton library (5-10 components)  
**Week 2:** Implement in top 10 pages  
**Week 3:** Rollout to all 42 pages  
**Week 4:** Polish & optimize

**Total Effort:** ~8-12 hours

---

**Status:** 📋 Planned, not started  
**Priority:** Medium (nice-to-have, not critical)  
**Impact:** High (perceived performance boost)
