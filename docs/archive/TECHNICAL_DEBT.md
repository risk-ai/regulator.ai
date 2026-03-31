# Vienna OS Technical Debt

**Last Updated:** 2026-03-26

---

## High Priority

### 1. Duplicate Method Definitions in state-graph.js

**Issue:** 7 methods defined twice causing build warnings

**Location:** `services/vienna-lib/state/state-graph.js`

**Duplicates:**
- `createObjective` (line 592, line 2335)
- `getObjective` (line 586, line 2395)
- `listObjectives` (line 561, line 2409)
- `updateObjective` (line 627, line 2447)
- `getPolicy` (line 2163, line 4379)
- `listPolicies` (line 2180, line 4396)
- `deletePolicy` (line 2207, line 4461)

**Root Cause:** Schema evolution - older methods use simple schema, newer methods use complex schema with reconciliation fields

**Impact:**
- 7 build warnings per compilation
- Confusion for developers (which method is actually used?)
- Potential runtime bugs (JavaScript uses last defined method)

**Recommended Fix:**
1. Determine which schema is actively used (check database migrations)
2. Remove older implementations
3. Add migration guide if schema changed
4. Test all callers of these methods

**Risk:** Medium (breaking change if wrong methods removed)

**Effort:** 2-4 hours (analysis + testing)

**Blocker for:** Clean production builds, open-source release

---

### 2. Security Vulnerabilities (npm audit)

**Issue:** 6 vulnerabilities across server and client packages

**Server (apps/console/server):**
- 3 high severity vulnerabilities
- Affected: Unknown (run `npm audit` to see details)

**Client (apps/console/client):**
- 3 vulnerabilities (2 moderate, 1 high)
- Affected: Unknown

**Impact:**
- Potential security exploits
- Compliance risk (SOC 2, ISO 27001)
- Cannot pass security audits

**Recommended Fix:**
```bash
cd apps/console/server && npm audit fix
cd apps/console/client && npm audit fix
# Review automated changes
# Run tests
```

**Risk:** Low (automated fixes are usually safe)

**Effort:** 1-2 hours (run + test)

**Blocker for:** Production deployment, enterprise customers

---

### 3. Deprecated Dependencies

**Issue:** 5 deprecated packages in use

**List:**
1. `@vercel/postgres@0.5.1` → Migrated to Neon (breaking change)
2. `prebuild-install@7.1.3` → No longer maintained
3. `inflight@1.0.6` → Memory leak, use lru-cache
4. `glob@7.2.3` → Security vulnerabilities
5. `node-domexception@1.0.0` → Use platform native

**Impact:**
- Security vulnerabilities (glob)
- Memory leaks (inflight)
- Maintenance burden (unmaintained packages)

**Recommended Fix:**
1. Replace `@vercel/postgres` with Neon SDK or remove if unused
2. Update `glob` to latest (v10+)
3. Replace `inflight` with `lru-cache` or remove dependency
4. Review `prebuild-install` dependents, update if possible
5. Replace `node-domexception` with native implementation

**Risk:** Medium (may require code changes)

**Effort:** 4-6 hours

**Blocker for:** Long-term maintainability

---

## Medium Priority

### 4. Large File Refactoring

**Issue:** `state-graph.js` is 4,752 lines (too large)

**Impact:**
- Hard to navigate
- Slow IDE performance
- Merge conflicts likely

**Recommended Fix:**
Split into modules:
- `state-graph-core.js` — Core initialization, connection
- `state-graph-objectives.js` — Objective management
- `state-graph-policies.js` — Policy management
- `state-graph-executions.js` — Execution tracking
- `state-graph-migrations.js` — Database migrations

**Risk:** Low (internal refactoring)

**Effort:** 6-8 hours

**Blocker for:** Developer experience

---

### 5. Inconsistent Error Handling

**Issue:** Mix of error patterns across codebase

**Examples:**
- Some functions `throw new Error()`
- Some return `{ error: "message" }`
- Some return `null`
- No consistent error codes

**Impact:**
- Unpredictable error handling
- Hard to write robust callers
- Poor API experience

**Recommended Fix:**
Define standard error response schema:
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}
```

Apply consistently across all API endpoints

**Risk:** Low (additive change)

**Effort:** 8-12 hours (full codebase sweep)

**Blocker for:** Production API quality

---

### 6. Missing Test Coverage

**Issue:** No unit tests for critical paths

**Coverage:** Unknown (no tests currently)

**Priority paths needing tests:**
1. Warrant system (generation, approval, expiration)
2. Policy engine (rule evaluation, condition matching)
3. Intent gateway (validation, risk classification)
4. Executor (deterministic execution, rollback)

**Impact:**
- Regressions introduced unknowingly
- Hard to refactor confidently
- Cannot validate behavior changes

**Recommended Fix:**
Add Jest tests:
```javascript
// warrant-system.test.js
describe('Warrant System', () => {
  test('generates warrant for T1 action', () => {
    const warrant = warrantSystem.generate({
      action: 'restart_service',
      risk_tier: 'T1'
    });
    expect(warrant.approved).toBe(false); // requires approval
  });
});
```

**Risk:** None (tests are additive)

**Effort:** 20-30 hours (comprehensive test suite)

**Blocker for:** Confident refactoring, CI/CD

---

## Low Priority

### 7. Docker Image Size

**Issue:** Production image is 164 MB

**Breakdown:**
- Node.js base: ~50 MB
- Dependencies: ~80 MB
- Application code: ~30 MB
- Build artifacts: ~4 MB

**Impact:**
- Slower deployments
- Higher bandwidth costs
- Longer cold starts

**Recommended Fix:**
1. Multi-stage build (already implemented)
2. Use Alpine base (already implemented)
3. Remove dev dependencies (already implemented)
4. Consider distroless image (further optimization)

**Target:** <100 MB

**Risk:** Low

**Effort:** 2-3 hours

---

### 8. Logging Improvements

**Issue:** Inconsistent log formats and levels

**Examples:**
- Mix of `console.log()` and structured logging
- No correlation IDs for request tracing
- Sensitive data may be logged (API keys, passwords)

**Impact:**
- Hard to debug production issues
- Cannot trace requests across services
- Compliance risk (PII/secrets in logs)

**Recommended Fix:**
1. Use structured logging library (winston, pino)
2. Add correlation IDs to all requests
3. Sanitize logs (remove secrets, PII)
4. Implement log levels (debug, info, warn, error)

**Risk:** Low

**Effort:** 4-6 hours

---

### 9. Performance Optimization

**Issue:** No performance benchmarks or optimizations

**Known opportunities:**
1. Add database indexes for common queries
2. Implement response caching (warrant reuse)
3. Policy evaluation caching (in-memory)
4. Async execution (background jobs)

**Impact:**
- Current latency: ~500ms p99 (acceptable)
- Could optimize to: <200ms p99
- Better scalability at high volume

**Recommended Fix:**
1. Add benchmarks (autocannon, k6)
2. Profile slow paths (Chrome DevTools, clinic.js)
3. Add indexes, caching where appropriate
4. Load test (identify bottlenecks)

**Risk:** Low

**Effort:** 8-12 hours

---

## Tracking

**Created:** 2026-03-26  
**Owner:** Vienna OS Core Team  
**Review Cadence:** Weekly

**Priority legend:**
- **High:** Blocks critical path (deployment, open-source, security)
- **Medium:** Impacts developer experience or maintainability
- **Low:** Nice-to-have optimizations

**Next review:** 2026-04-02
