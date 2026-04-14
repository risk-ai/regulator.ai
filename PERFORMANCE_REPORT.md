# Performance Optimization Report

**Date:** 2026-04-14  
**Scope:** Console + Marketing site  
**Tool:** Vite bundle analyzer

---

## Bundle Analysis

### Current Stats (Console)

**Total Bundle Size:**
- Uncompressed: 294.08 KB (main chunk)
- Gzipped: 90.86 KB ✅ **Under 100KB target**

**Largest Dependencies:**
- `html2canvas`: 48.08 KB gzipped (used for screenshot exports)
- `index` (vendor): 90.86 KB gzipped (React, React Router, Lucide icons)

**Code Splitting:**
- ✅ 37 lazy-loaded page chunks
- ✅ Average page chunk: 5-10 KB gzipped
- ✅ Route-based splitting functional

### Optimization Opportunities

#### 1. Icon Tree-Shaking ✅ ALREADY OPTIMIZED
Lucide icons are imported individually:
```tsx
import { Activity, Shield, Users } from 'lucide-react';
```
**Status:** ✅ Optimal (not importing full icon library)

#### 2. html2canvas Usage
**Location:** CompliancePremium (PDF export)  
**Size:** 48 KB gzipped  
**Impact:** Only loaded when CompliancePremium page is accessed  
**Status:** ✅ Acceptable (lazy-loaded)  
**Alternative:** Could replace with server-side PDF generation (future optimization)

#### 3. Shared Component Chunking ✅ GOOD
Vite automatically extracts common dependencies:
- AnimatedGlobeBackground: 2 KB (shared across premium pages)
- PageLayout: 0.78 KB (shared across all pages)
**Status:** ✅ Optimal

---

## Load Time Analysis

### Lighthouse Scores (Target vs Actual)

**Console (console.regulator.ai):**

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Performance | ≥90 | TBD | ⏳ Run audit |
| Accessibility | ≥95 | TBD | ⏳ Run audit |
| Best Practices | ≥95 | TBD | ⏳ Run audit |
| SEO | ≥90 | TBD | ⏳ Run audit |

**Marketing (regulator.ai):**

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Performance | ≥90 | TBD | ⏳ Run audit |
| Accessibility | ≥95 | TBD | ⏳ Run audit |
| Best Practices | ≥95 | TBD | ⏳ Run audit |
| SEO | ≥90 | TBD | ⏳ Run audit |

**Action:** Run Lighthouse CI in production deployment

---

## Image Optimization

### Marketing Site Images

**Current Images:**
```bash
# Find all images
find apps/marketing/public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.svg" \)
```

**Optimization Strategy:**
1. Convert PNGs to WebP (50-80% size reduction)
2. Serve responsive sizes (srcset)
3. Lazy load images below fold
4. Use blur placeholders

**Tools:**
```bash
# Convert to WebP
for img in *.png; do
  cwebp -q 85 "$img" -o "${img%.png}.webp"
done

# Optimize SVGs
npx svgo -r apps/marketing/public/images
```

**Status:** ⏳ Needs implementation

---

## API Response Caching

### Current Caching Strategy

**Client-Side:**
- ✅ React Query used in some pages (DashboardPremium)
- ❌ Not consistent across all pages
- ❌ No global cache config

**Server-Side:**
- ❌ No HTTP cache headers on API responses
- ❌ No CDN caching
- ❌ No Redis/memory cache

### Recommended Caching

**1. Add HTTP Cache Headers**

```javascript
// apps/console-proxy/lib/cache.js
function setCacheHeaders(res, maxAge) {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  res.setHeader('Vary', 'Authorization');
}

// Usage in API routes
if (req.method === 'GET' && req.url.includes('/policies')) {
  setCacheHeaders(res, 60); // Cache for 1 minute
}
```

**2. Implement React Query Globally**

```tsx
// apps/console/client/src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Wrap app
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

**3. Add CDN Caching (Vercel)**

```javascript
// vercel.json
{
  "headers": [
    {
      "source": "/api/v1/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=60, stale-while-revalidate=30"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Status:** ⏳ Needs implementation

---

## Database Query Optimization

### N+1 Query Prevention

**Audit Results:**

✅ **Already Optimized:**
- `/api/v1/governance` uses JOIN queries (no N+1)
- `/api/v1/fleet/agents` single query with aggregates
- `/api/v1/analytics` uses batch queries

**Common Pattern (Good):**
```sql
SELECT 
  i.*,
  (SELECT json_agg(pe.*) FROM policy_evaluations pe WHERE pe.intent_id = i.id) AS evaluations
FROM intents i
WHERE tenant_id = $1;
```

**Status:** ✅ No N+1 queries found

### Index Coverage

**Existing Indexes (from migrations):**
```sql
-- Good coverage
idx_team_members_tenant (tenant_id)
idx_integrations_tenant (tenant_id)
idx_agent_registry_tenant (tenant_id)
```

**Potential Additions:**
```sql
-- Add composite indexes for common queries
CREATE INDEX idx_intents_tenant_created ON intents(tenant_id, created_at DESC);
CREATE INDEX idx_warrants_tenant_status ON warrants(tenant_id, status);
CREATE INDEX idx_audit_log_tenant_created ON audit_log(tenant_id, created_at DESC);
```

**Status:** ⏳ Recommended for future

---

## Lazy Loading Images

### Current Implementation

**Marketing site:**
- ❌ No lazy loading on hero images
- ❌ All images load on page load

**Console:**
- ✅ Globe background uses canvas (renders on demand)
- ❌ Avatar images not lazy loaded

### Recommended Implementation

```tsx
// Use native lazy loading
<img 
  src="/hero-image.png" 
  loading="lazy" 
  decoding="async"
  alt="Vienna OS Dashboard"
/>

// Or use Next.js Image component (marketing site)
import Image from 'next/image';

<Image 
  src="/hero-image.png"
  width={1200}
  height={600}
  loading="lazy"
  placeholder="blur"
  alt="Vienna OS Dashboard"
/>
```

**Status:** ⏳ Needs implementation

---

## Compression

### Current Compression

**Vercel (automatic):**
- ✅ Brotli compression enabled
- ✅ Gzip fallback
- ✅ Applies to JS, CSS, HTML, JSON

**Status:** ✅ Optimal

### Custom Assets

**SVGs:**
```bash
# Optimize SVG files
npx svgo -r apps/marketing/public --config '{
  "plugins": [
    "removeDoctype",
    "removeComments",
    "removeMetadata",
    "removeViewBox": false
  ]
}'
```

**Status:** ⏳ Needs one-time run

---

## Performance Checklist

### Build Optimization
- [x] Code splitting enabled (Vite default)
- [x] Tree shaking enabled
- [x] Minification enabled
- [x] Icon tree-shaking (Lucide individual imports)
- [ ] Image optimization (WebP conversion)
- [ ] SVG optimization

### Runtime Optimization
- [x] Lazy loading routes
- [ ] Lazy loading images
- [ ] React Query global setup
- [ ] HTTP cache headers
- [ ] CDN caching config

### Backend Optimization
- [x] No N+1 queries
- [x] Connection pooling (Neon)
- [ ] Redis caching (future)
- [ ] Database index optimization
- [x] Gzip/Brotli compression

### Monitoring
- [ ] Lighthouse CI setup
- [ ] Real User Monitoring (RUM)
- [ ] Core Web Vitals tracking
- [ ] Bundle size budget alerts

---

## Recommendations

### High Priority (Do Now)
1. Run Lighthouse audits on production
2. Add lazy loading to marketing images
3. Optimize SVG files

### Medium Priority (This Week)
4. Implement React Query globally
5. Add HTTP cache headers to APIs
6. Convert hero images to WebP

### Low Priority (Future)
7. Set up Lighthouse CI in GitHub Actions
8. Add database indexes for analytics queries
9. Consider Redis caching for high-traffic endpoints
10. Replace html2canvas with server-side PDF generation

---

## Performance Budget

| Resource | Budget | Current | Status |
|----------|--------|---------|--------|
| Main JS bundle | <100 KB gzip | 90.86 KB | ✅ |
| Total page size | <500 KB | ~350 KB est | ✅ |
| First Contentful Paint | <1.5s | TBD | ⏳ |
| Time to Interactive | <3s | TBD | ⏳ |
| Largest Contentful Paint | <2.5s | TBD | ⏳ |

---

**Status:** Priority 4 analysis complete. Ready for implementation of recommendations.
