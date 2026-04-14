# Database Migration Status

**Status:** ⚠️ **PENDING PRODUCTION DEPLOYMENT**

## Migrations Created

### 002_integrations.sql
**Location:** `apps/console/server/migrations/002_integrations.sql`  
**Purpose:** Integrations management (Slack, Email, Webhook, GitHub)  
**Tables:**
- `integrations` - Store integration configs (type, name, config, event_filters)
- `integration_events` - Delivery log for webhook events

**Status:** ⚠️ Not applied to production  
**Required for:** `/api/v1/integrations` endpoint

### 003_team_management.sql
**Location:** `apps/console/server/migrations/003_team_management.sql`  
**Purpose:** Team management and RBAC  
**Tables:**
- `team_members` - Organization members with roles (admin/operator/viewer)
- `team_invitations` - Pending invitations with expiry

**Status:** ⚠️ Not applied to production  
**Required for:** `/api/v1/team` endpoint

## Deployment Instructions

**Prerequisites:**
- Neon database admin access
- `DATABASE_URL` environment variable

**Apply migrations:**
```bash
# Set DATABASE_URL (from Vercel environment variables)
export DATABASE_URL="postgresql://[credentials]@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb"

# Apply migrations
psql "$DATABASE_URL" -f apps/console/server/migrations/002_integrations.sql
psql "$DATABASE_URL" -f apps/console/server/migrations/003_team_management.sql
```

**Verification:**
```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('integrations', 'integration_events', 'team_members', 'team_invitations');

-- Check indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('integrations', 'team_members');
```

## Rollback (if needed)

```sql
-- Rollback 003_team_management.sql
DROP TABLE IF EXISTS team_invitations;
DROP TABLE IF EXISTS team_members;

-- Rollback 002_integrations.sql
DROP TABLE IF EXISTS integration_events;
DROP TABLE IF EXISTS integrations;
```

## Post-Deployment Verification

**Test endpoints:**
- GET https://console.regulator.ai/api/v1/integrations
- GET https://console.regulator.ai/api/v1/team/members

**Expected:** Empty arrays (not 500 errors)

---

**Action Required:** Deploy these migrations to Neon production database before the following features will work:
- Team Management page (`/team`)
- Integrations API (`/integrations`)
- Webhook Config page (`/webhooks`)

**Note:** APIs will return errors until migrations are applied.
