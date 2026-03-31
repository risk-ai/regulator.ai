# Safe Database Migration Plan

**Date:** 2026-03-31  
**Purpose:** Add OAuth and Stripe columns to production database safely  
**Coordination:** Vienna + Aiden

---

## Migration Overview

**Changes Needed:**
- Add 3 columns to `users` table (OAuth support)
- Add 1 column to `tenants` table (Stripe integration)
- Add 1 index for OAuth lookups

**Risk Level:** LOW (additive changes only, no data modification)

**Estimated Time:** 5 minutes  
**Downtime:** None (columns added with `IF NOT EXISTS`)

---

## Safety Principles

1. **Additive Only:** Only adding columns, never modifying existing data
2. **Non-Breaking:** `IF NOT EXISTS` prevents errors if columns already exist
3. **Nullable Columns:** All new columns allow NULL (no default values required)
4. **Backward Compatible:** Existing code continues to work
5. **Rollback Plan:** No rollback needed (columns can stay even if unused)

---

## Pre-Migration Checklist

**Before running any SQL:**

- [ ] **Verify database connection** — Test read access first
- [ ] **Check current schema** — Document existing columns
- [ ] **Backup recommended** — Neon provides automatic backups, verify they exist
- [ ] **Coordinate with Aiden** — Ensure no conflicting migrations in progress
- [ ] **Test in staging first** (if staging environment exists)

---

## Migration Script (Safe Version)

```sql
-- ============================================================================
-- Vienna OS Database Migration
-- Date: 2026-03-31
-- Purpose: Add OAuth and Stripe support
-- Risk: LOW (additive only)
-- ============================================================================

-- Step 1: Verify current schema (read-only check)
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'tenants')
ORDER BY table_name, ordinal_position;

-- Step 2: Add OAuth columns to users table
-- (IF NOT EXISTS ensures safe re-run if migration partially completed)
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS oauth_provider_id VARCHAR(255);

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 3: Add Stripe column to tenants table
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Step 4: Create index for OAuth lookups (improves performance)
CREATE INDEX IF NOT EXISTS idx_users_oauth 
  ON users(oauth_provider, oauth_provider_id);

-- Step 5: Verify migration completed successfully
SELECT 
  'users' as table_name,
  COUNT(*) FILTER (WHERE column_name = 'oauth_provider') as has_oauth_provider,
  COUNT(*) FILTER (WHERE column_name = 'oauth_provider_id') as has_oauth_provider_id,
  COUNT(*) FILTER (WHERE column_name = 'avatar_url') as has_avatar_url
FROM information_schema.columns 
WHERE table_name = 'users'

UNION ALL

SELECT 
  'tenants' as table_name,
  COUNT(*) FILTER (WHERE column_name = 'stripe_customer_id') as has_stripe_customer_id,
  0 as placeholder1,
  0 as placeholder2
FROM information_schema.columns 
WHERE table_name = 'tenants';

-- Expected output:
-- table_name | has_oauth_provider | has_oauth_provider_id | has_avatar_url
-- -----------+--------------------+-----------------------+----------------
-- users      |                  1 |                     1 |              1
-- tenants    |                  1 |                     0 |              0
```

---

## Execution Steps (Coordinated Approach)

### Option A: Aiden Runs Migration (Recommended if Aiden has DB access)

**Why:** Aiden has context on existing database state and can verify no conflicts

**Steps:**
1. Aiden connects to production database
2. Runs Step 1 (verification query) to check current schema
3. Shares output in #agent-coordination
4. Runs Steps 2-4 (migration commands)
5. Runs Step 5 (verification query) to confirm success
6. Reports completion status

**Vienna's Role:**
- Standby for questions
- Verify backend code expects these columns (already done)
- Test OAuth flow after migration completes

---

### Option B: Vienna Runs Migration (If Max provides DB credentials)

**Why:** Vienna wrote the migration script and knows expected schema

**Steps:**
1. Max shares `DATABASE_URL` securely (DM or environment variable)
2. Vienna connects: `psql $DATABASE_URL`
3. Vienna runs Step 1 (verification)
4. Vienna runs Steps 2-4 (migration)
5. Vienna runs Step 5 (confirmation)
6. Vienna reports status in #agent-coordination
7. Vienna tests OAuth flow

**Aiden's Role:**
- Review migration script beforehand
- Monitor for any conflicts with existing work
- Verify no ongoing database changes

---

### Option C: Max Runs Migration (Self-Service)

**Why:** Max has full control and visibility

**Steps:**
1. Open Neon dashboard → SQL Editor
2. Copy entire migration script from above
3. Run Step 1 first (verification only)
4. Review output, confirm tables exist
5. Run Steps 2-4 (migration)
6. Run Step 5 (confirmation)
7. Share confirmation output in thread

**Vienna + Aiden Role:**
- Standing by to help if errors occur
- Test features after migration completes

---

## What Could Go Wrong (and How to Fix)

### Error: "column already exists"

**Cause:** Column was added in a previous migration attempt

**Impact:** None (harmless error)

**Fix:** The `IF NOT EXISTS` clause prevents this, but if it happens:
```sql
-- Just verify the column is there
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'oauth_provider';
```

If it returns a row, migration is already complete. Continue.

---

### Error: "permission denied"

**Cause:** Database user lacks ALTER TABLE permission

**Impact:** Migration cannot proceed

**Fix:**
1. Check database user permissions
2. Use superuser account or owner role
3. If using Neon, use the default admin user

---

### Error: "relation does not exist"

**Cause:** Table name mismatch (wrong schema or table name)

**Impact:** Migration fails

**Fix:**
1. Check exact table names:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_type = 'BASE TABLE';
   ```
2. Verify `users` and `tenants` tables exist
3. If tables are in different schema (e.g., `regulator.users`), update script:
   ```sql
   ALTER TABLE regulator.users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
   ```

---

## Post-Migration Verification

**After migration completes, verify:**

1. **Schema check:**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'users'
   AND column_name IN ('oauth_provider', 'oauth_provider_id', 'avatar_url');
   ```
   Should return 3 rows.

2. **No data loss:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM tenants;
   ```
   Counts should match pre-migration values.

3. **Index created:**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'users' 
   AND indexname = 'idx_users_oauth';
   ```
   Should return 1 row.

4. **Application still works:**
   - Visit https://console.regulator.ai
   - Existing email/password login should still work
   - No errors in Sentry

---

## Rollback Plan

**If something goes wrong:**

**Option 1: Drop the columns (not recommended unless critical issue)**
```sql
ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider;
ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider_id;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_customer_id;
DROP INDEX IF EXISTS idx_users_oauth;
```

**Option 2: Leave columns, disable features**
- Columns can stay even if unused (no harm)
- Disable OAuth buttons in frontend (code change)
- Remove OAuth env vars from Vercel (features won't initialize)

**Option 3: Restore from backup**
- Neon provides point-in-time recovery
- Can restore to 5 minutes before migration
- Only needed for catastrophic failure (very unlikely)

---

## Coordination Protocol

**Before migration:**
1. Vienna: "Ready to migrate, waiting for coordination"
2. Aiden: Reviews script, confirms no conflicts
3. Max: Approves migration timing
4. Designated person: Runs migration

**During migration:**
5. Executor: Pastes verification output in thread
6. Vienna + Aiden: Review output, confirm looks good
7. Executor: Runs migration commands
8. Executor: Pastes confirmation output

**After migration:**
9. Vienna: Tests OAuth flow (Google + GitHub)
10. Vienna: Tests billing portal
11. Aiden: Confirms no errors in their console
12. All: Mark migration complete in thread

---

## Migration Timeline

**Estimated Duration:**
- Step 1 (Verification): 1 minute
- Steps 2-4 (Migration): 2 minutes
- Step 5 (Confirmation): 1 minute
- Testing (OAuth + Billing): 5 minutes
- **Total:** ~10 minutes

**Recommended Timing:**
- Off-peak hours (if possible)
- When all three (Max, Vienna, Aiden) are available
- Not during active user sessions (if any users exist)

---

## Success Criteria

Migration is successful when:

✅ All 4 columns added without errors  
✅ Index created successfully  
✅ Verification query shows all columns present  
✅ Existing user accounts still accessible  
✅ OAuth login buttons appear in UI  
✅ Google OAuth redirects correctly  
✅ GitHub OAuth redirects correctly  
✅ Billing portal link works  
✅ No errors in Sentry dashboard  

---

## Final Checklist

**Before executing:**
- [ ] Aiden reviews migration script
- [ ] No conflicting database changes in progress
- [ ] Backup confirmed available (Neon auto-backup)
- [ ] All team members available in #agent-coordination
- [ ] Vercel environment variables already configured

**Ready to migrate:**
- [ ] Designated executor identified (Aiden/Vienna/Max)
- [ ] Database credentials accessible
- [ ] Migration script copied and ready
- [ ] Verification query prepared
- [ ] All team members standing by

**After migration:**
- [ ] Verification query run and output shared
- [ ] OAuth tested by Vienna
- [ ] Billing tested by Vienna
- [ ] No errors reported
- [ ] Migration marked complete in logs

---

**Status:** Ready to execute pending team coordination

**Next Step:** Designate executor (Aiden/Vienna/Max) and run migration when ready

**Communication:** Use #agent-coordination thread for real-time coordination
