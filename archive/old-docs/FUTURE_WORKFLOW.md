# Future Development Workflow (Post-Migration)

**Date:** 2026-03-14  
**Purpose:** Define how development continues after Vienna integration into regulator.ai is complete

---

## Repository Structure (Post-Migration)

### Primary Repository: `regulator.ai`

**GitHub:** `https://github.com/risk-ai/regulator.ai`

**Local clone:** `/home/maxlawai/regulator.ai/` (or wherever you clone it)

**Contents:**
```
regulator.ai/
├── src/
│   ├── app/                          # Next.js app (routes, layouts, pages)
│   ├── components/                   # React components
│   │   ├── workspace/                # Vienna workspace UI
│   │   ├── admin/                    # Admin UI (if separate from workspace)
│   │   └── shared/                   # Shared UI primitives
│   ├── lib/
│   │   ├── workspace/                # Investigation/artifact APIs
│   │   ├── vienna-runtime/           # Vienna governance core (if embedded)
│   │   │   ├── governance/           # Policy, warrant, admission
│   │   │   ├── execution/            # Executor, adapters, verification
│   │   │   ├── reconciliation/       # Objective evaluator, loops
│   │   │   └── state/                # State Graph, persistence
│   │   └── api-client.ts             # Shared API client utilities
│   └── db/
│       └── schema.ts                 # Unified Drizzle schema (all tables)
├── docs/                             # Project documentation
├── tests/                            # Test suites
├── .env.local                        # Local environment (git-ignored)
├── .env.example                      # Environment template
├── package.json
└── README.md
```

**OR (if separate backend chosen):**
```
regulator.ai/                         # Frontend + proxy
vienna-runtime/                       # Backend service (separate repo)
```

**This document assumes embedded model (Option A).** If separate backend chosen, adapt workflow accordingly.

---

## Development Loop

### Step 1: Pull Latest Changes

```bash
cd /home/maxlawai/regulator.ai

# Get latest code from GitHub
git pull origin main

# Install any new dependencies
npm install
```

**When to do this:**
- Start of new work session
- Before creating feature branch
- After someone else merges changes

---

### Step 2: Create Feature Branch

```bash
# Create branch for your work
git checkout -b feat/your-feature-name

# Examples:
git checkout -b feat/phase-15-detection
git checkout -b feat/workspace-search
git checkout -b fix/artifact-pagination
```

**Branch naming conventions:**
- `feat/` — New features
- `fix/` — Bug fixes
- `refactor/` — Code improvements
- `docs/` — Documentation updates
- `test/` — Test additions

**Never work directly on `main`**

---

### Step 3: Make Changes Locally

**Vienna/OpenClaw edits files:**
```bash
# Vienna can edit any file in the repo
# Example: Add new workspace component
code src/components/workspace/NewComponent.tsx

# Example: Update Vienna runtime logic
code src/lib/vienna-runtime/governance/policy-engine.ts

# Example: Add database migration
code src/db/schema.ts
```

**Run development server:**
```bash
npm run dev
# Open http://localhost:3000
# Test changes in browser
```

**Run tests:**
```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/vienna-runtime/governance/policy-engine.test.ts

# Run tests in watch mode
npm test -- --watch
```

**Type checking:**
```bash
# Check TypeScript types
npm run build
# OR
npx tsc --noEmit
```

**Linting:**
```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

---

### Step 4: Commit Changes

```bash
# Stage files
git add src/components/workspace/NewComponent.tsx
git add src/lib/vienna-runtime/governance/policy-engine.ts

# Or stage all changes
git add -A

# Commit with descriptive message
git commit -m "feat: Add search to workspace investigation list

- Implement fuzzy search across investigation names
- Add search input component
- Update API to support search parameter
- Add tests for search functionality"
```

**Good commit messages:**
- Start with type: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- First line is summary (< 72 chars)
- Blank line
- Detailed explanation (optional, use bullet points)

**Example:**
```
feat: Implement Phase 15 detection layer

- Add anomaly detection module
- Integrate with objective evaluator
- Create detection rules schema
- Add background detection loop
- Write comprehensive test suite

Closes #42
```

---

### Step 5: Push to GitHub

```bash
# Push your branch to GitHub
git push origin feat/your-feature-name

# First time pushing new branch:
git push -u origin feat/your-feature-name
```

**What happens:**
1. Code uploads to GitHub
2. Vercel automatically creates **preview deployment**
3. You get unique preview URL (e.g., `https://regulator-ai-git-feat-your-feature-abc123.vercel.app`)
4. You can share preview URL for review

---

### Step 6: Create Pull Request

```bash
# Create PR via GitHub CLI
gh pr create --title "Add workspace search functionality" --body "Description of changes"

# Or create PR in GitHub web UI:
# https://github.com/risk-ai/regulator.ai/compare/feat/your-feature-name
```

**PR description should include:**
- What changed
- Why it changed
- How to test it
- Screenshots (if UI changes)
- Related issues (e.g., "Closes #42")

**Example PR body:**
```markdown
## What Changed
Implemented search functionality for workspace investigation list.

## Why
Users need to quickly find investigations by name without scrolling through long lists.

## How to Test
1. Open preview deployment
2. Navigate to /workspace
3. Type in search box
4. Verify results filter correctly

## Screenshots
[screenshot of search in action]

## Checklist
- [x] Tests added
- [x] Types updated
- [x] Documentation updated
- [x] Preview deployment verified

Closes #42
```

---

### Step 7: Review and Merge

**Automated checks run:**
- Build (Next.js production build)
- Tests (Jest/Vitest)
- Linting (ESLint)
- Type checking (TypeScript)
- Preview deployment (Vercel)

**Manual review:**
- Code review by team member
- Test preview deployment
- Verify changes match requirements

**After approval:**
```bash
# Merge via GitHub UI (squash and merge recommended)
# OR via CLI:
gh pr merge --squash
```

**What happens on merge:**
1. Code merges into `main` branch
2. Vercel automatically deploys to **production** (https://regulator.ai)
3. Feature branch can be deleted

---

### Step 8: Cleanup

```bash
# Switch back to main
git checkout main

# Pull latest (includes your merged changes)
git pull origin main

# Delete feature branch locally
git branch -d feat/your-feature-name

# Delete feature branch on GitHub (optional, GitHub does this automatically)
git push origin --delete feat/your-feature-name
```

---

## Where Future Work Happens

### Phase 15: Detection Layer

**Goal:** Add anomaly detection for objective monitoring

**Location:**
```
src/lib/vienna-runtime/detection/
├── anomaly-detector.ts
├── detection-rules.ts
├── pattern-recognizer.ts
└── tests/
```

**Workflow:**
1. Create `feat/phase-15-detection` branch
2. Implement detection modules
3. Add to objective evaluator
4. Write tests
5. Push, PR, review, merge

---

### Workspace Improvements

**Goal:** Enhance investigation UI (search, filters, exports)

**Location:**
```
src/components/workspace/
├── InvestigationSearch.tsx
├── ArtifactFilters.tsx
├── ExportButton.tsx
└── ...
```

**Workflow:**
1. Create `feat/workspace-search` branch
2. Build React components
3. Update API client if needed
4. Test in dev server
5. Push, PR, review, merge

---

### Governance Enhancements

**Goal:** Add new policy constraint types

**Location:**
```
src/lib/vienna-runtime/governance/
├── policy-engine.ts
├── constraint-evaluator.ts
└── tests/
```

**Workflow:**
1. Create `feat/new-constraint-types` branch
2. Update constraint evaluator
3. Add tests
4. Update schema if needed
5. Push, PR, review, merge

---

### Schema Changes

**Goal:** Add new tables or columns

**Location:**
```
src/db/schema.ts
```

**Workflow:**
1. Create `feat/add-detection-schema` branch
2. Update `schema.ts` with new tables/columns
3. Push schema to Neon:
   ```bash
   npx drizzle-kit push
   ```
4. Update TypeScript types (auto-generated by Drizzle)
5. Push, PR, review, merge

---

## Environment Management

### Local Development

**File:** `.env.local` (git-ignored)

**Required variables:**
```bash
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from GCP console>
GOOGLE_CLIENT_SECRET=<from GCP console>

# Optional: If Vienna backend separate
VIENNA_BACKEND_URL=http://localhost:3100

# Optional: If using external storage
BLOB_STORAGE_URL=<Vercel Blob or S3>
```

**Get values from:**
- Project admin (Whit)
- `.env.example` template
- Vercel dashboard environment variables

---

### Preview Deployments

**Automatic on PR:**
- Vercel reads env vars from project settings
- Preview uses same Neon database (separate schema or database recommended)
- Preview URL: `https://regulator-ai-git-<branch>-<hash>.vercel.app`

**Test preview:**
1. Open preview URL from Vercel comment on PR
2. Verify changes work
3. Check console for errors
4. Test auth flow (Google OAuth must allow preview domain)

---

### Production Deployment

**Automatic on merge to `main`:**
- Vercel builds and deploys to https://regulator.ai
- Uses production environment variables
- SSL certificate auto-managed
- CDN-distributed

**Monitor deployment:**
```bash
# Via Vercel CLI
npx vercel logs --production

# Via Vercel dashboard
# https://vercel.com/ai-ventures-portfolio/regulator-ai
```

---

## Testing Strategy

### Unit Tests

**Location:** Colocated with source files (`.test.ts` suffix)

**Example:**
```typescript
// src/lib/vienna-runtime/governance/policy-engine.test.ts
import { evaluatePolicy } from './policy-engine'

describe('PolicyEngine', () => {
  test('approves T0 actions without policy check', async () => {
    const result = await evaluatePolicy({
      risk_tier: 0,
      action: 'query_status'
    })
    expect(result.approved).toBe(true)
  })
})
```

**Run:**
```bash
npm test -- policy-engine.test.ts
```

---

### Integration Tests

**Location:** `tests/integration/`

**Example:**
```typescript
// tests/integration/workspace-api.test.ts
import { testClient } from '@/lib/test-utils'

describe('Workspace API', () => {
  test('GET /api/workspace/investigations returns list', async () => {
    const res = await testClient.get('/api/workspace/investigations')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
```

**Run:**
```bash
npm test -- tests/integration/
```

---

### End-to-End Tests (Future)

**Tool:** Playwright or Cypress

**Location:** `tests/e2e/`

**Example:**
```typescript
// tests/e2e/workspace-flow.spec.ts
import { test, expect } from '@playwright/test'

test('operator can view investigation', async ({ page }) => {
  await page.goto('/workspace')
  await page.click('text=Investigation 1')
  await expect(page).toHaveURL(/\/workspace\/inv_.*/)
})
```

---

## Database Migrations

### Schema Changes

**Update schema:**
```typescript
// src/db/schema.ts
export const newTable = regulator.table('new_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
```

**Push to Neon:**
```bash
# Preview changes
npx drizzle-kit push --check

# Apply changes
npx drizzle-kit push
```

**Commit schema:**
```bash
git add src/db/schema.ts
git commit -m "feat: Add new_table schema"
```

---

### Data Migrations (if needed)

**Location:** `migrations/` (custom scripts)

**Example:**
```typescript
// migrations/2026-03-15-migrate-artifacts.ts
import { db } from '@/db'

export async function up() {
  // Migrate data
  await db.execute(`
    UPDATE artifacts 
    SET storage_type = 'blob' 
    WHERE storage_type IS NULL
  `)
}
```

**Run manually:**
```bash
node migrations/2026-03-15-migrate-artifacts.ts
```

---

## Debugging

### Local Development

**Console logs:**
```typescript
console.log('[PolicyEngine]', { plan, result })
```

**VS Code debugger:**
1. Set breakpoints in code
2. Run dev server in debug mode: `F5`
3. Attach debugger

**Network inspection:**
- Browser DevTools → Network tab
- Check API requests/responses
- Verify payload structure

---

### Preview Deployment

**Vercel logs:**
```bash
# Real-time logs
npx vercel logs --follow

# Specific deployment
npx vercel logs <deployment-url>
```

**Error tracking (if added):**
- Sentry integration (optional)
- Error pages with stack traces

---

### Production Debugging

**Vercel dashboard:**
- https://vercel.com/ai-ventures-portfolio/regulator-ai
- Functions → View logs
- Errors → Stack traces

**Database queries:**
```bash
# Connect to Neon
psql $DATABASE_URL

# Run queries
SELECT * FROM regulator.investigations ORDER BY created_at DESC LIMIT 10;
```

---

## Common Tasks

### Add New Workspace Component

```bash
# 1. Create component file
code src/components/workspace/NewComponent.tsx

# 2. Add to workspace page
code src/app/workspace/page.tsx

# 3. Test locally
npm run dev

# 4. Commit and push
git add -A
git commit -m "feat: Add NewComponent to workspace"
git push origin feat/new-component
```

---

### Add New API Endpoint

```bash
# 1. Create route handler
mkdir -p src/app/api/workspace/endpoint
code src/app/api/workspace/endpoint/route.ts

# 2. Implement handler
# src/app/api/workspace/endpoint/route.ts
export async function GET(req: Request) {
  // ... implementation
  return Response.json(data)
}

# 3. Test with curl or Postman
curl http://localhost:3000/api/workspace/endpoint

# 4. Commit and push
git add -A
git commit -m "feat: Add endpoint API"
git push origin feat/new-endpoint
```

---

### Update Policy Engine

```bash
# 1. Edit policy engine
code src/lib/vienna-runtime/governance/policy-engine.ts

# 2. Add tests
code src/lib/vienna-runtime/governance/policy-engine.test.ts

# 3. Run tests
npm test -- policy-engine.test.ts

# 4. Commit and push
git add -A
git commit -m "feat: Add new policy constraint type"
git push origin feat/policy-enhancement
```

---

## Collaboration Workflow

### Working with Others

**Scenario:** Someone else is working on related code

**Strategy:**
1. Communicate on what you're changing
2. Work on separate branches
3. Merge `main` into your branch frequently:
   ```bash
   git checkout feat/your-feature
   git fetch origin
   git merge origin/main
   # Resolve any conflicts
   git push
   ```
4. Coordinate timing of merges to avoid conflicts

---

### Code Review

**As reviewer:**
1. Check out PR branch locally:
   ```bash
   gh pr checkout <PR-number>
   npm install
   npm run dev
   ```
2. Test changes manually
3. Review code in GitHub UI
4. Leave comments/suggestions
5. Approve or request changes

**As author:**
1. Address review feedback
2. Push fixes to same branch
3. PR updates automatically
4. Request re-review

---

## Security and Access

### What Vienna/OpenClaw Needs

**Local machine:**
- Read/write access to repo directory
- Git configured with your credentials
- Node.js and npm installed

**GitHub:**
- Your account has write access to repo
- Git credential helper configured (HTTPS or SSH)

**What Vienna/OpenClaw DOES NOT need:**
- GitHub API token (for basic push/PR)
- Vercel credentials
- Database admin access
- Production secrets

---

### Credential Management

**GitHub authentication:**
```bash
# Via GitHub CLI (easiest)
gh auth login

# Via SSH key
ssh-keygen -t ed25519 -C "max@law.ai"
# Add key to GitHub account
```

**Environment secrets:**
- Never commit `.env.local`
- Store in 1Password or similar
- Share securely with team members

---

## Rollback Procedures

### Revert Last Deployment

**Via Vercel dashboard:**
1. Go to project deployments
2. Find previous working deployment
3. Click "Promote to Production"

**Via git:**
```bash
# Revert last commit
git revert HEAD
git push origin main
# Vercel auto-deploys reverted state

# OR rollback to specific commit
git reset --hard <commit-hash>
git push --force origin main
# ⚠️ Use force push carefully
```

---

### Fix Production Bug

**Hotfix workflow:**
```bash
# 1. Create hotfix branch from main
git checkout main
git pull
git checkout -b hotfix/critical-bug

# 2. Fix bug
code src/lib/vienna-runtime/...

# 3. Test locally
npm test
npm run build

# 4. Push and merge immediately
git add -A
git commit -m "hotfix: Fix critical bug in policy engine"
git push origin hotfix/critical-bug
gh pr create --title "Hotfix: Critical bug" --body "Emergency fix"
# Get quick review and merge

# 5. Vercel deploys to production automatically
```

---

## Performance Monitoring

### Vercel Analytics (if enabled)

- Real-time traffic
- Page load times
- Core Web Vitals
- User geography

**Dashboard:** https://vercel.com/ai-ventures-portfolio/regulator-ai/analytics

---

### Custom Metrics (if added)

**Example:**
```typescript
// src/lib/metrics.ts
export function trackGovernanceDecision(decision: PolicyDecision) {
  // Send to analytics service
  analytics.track('governance.decision', {
    approved: decision.approved,
    risk_tier: decision.risk_tier,
    duration_ms: decision.evaluation_time
  })
}
```

---

## Documentation Updates

### When to Update Docs

- New features added
- API contracts change
- Architecture decisions made
- Workflow changes

### Where Docs Live

```
regulator.ai/
├── README.md                    # Project overview
├── CONTRIBUTING.md              # How to contribute
├── docs/
│   ├── architecture/            # System architecture
│   ├── api/                     # API documentation
│   ├── deployment/              # Deployment guides
│   └── workflows/               # Development workflows
```

**Update docs in same PR as code changes**

---

## Summary

**Primary repo:** `regulator.ai` (Next.js app + Vienna runtime)

**Development loop:**
1. Pull latest `main`
2. Create feature branch
3. Make changes locally
4. Run tests/build
5. Commit and push
6. Create PR
7. Review preview deployment
8. Merge to `main`
9. Auto-deploys to production

**No special GitHub access needed** — normal push/PR workflow

**Vienna/OpenClaw edits locally** — same as current workflow

**Future phases happen in same repo** — organized by module

**Rollback available** — via Vercel or git revert

**Production deploys automatically** — on merge to `main`

---

**Workflow is simple and safe.** Vienna continues development exactly as before, just in `regulator.ai` repo instead of separate Vienna repo.
