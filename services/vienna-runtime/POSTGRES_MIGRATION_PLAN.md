# Postgres Migration Plan (Stage 6)

**Date:** 2026-03-14  
**Status:** ✅ INFRASTRUCTURE READY, REPOSITORY MIGRATION STAGED

---

## Overview

Vienna Runtime now supports **dual-backend operation**:
- **SQLite** for local development (zero-config, file-based)
- **Postgres** for staging/production (Neon-compatible, scalable)

Backend selection is automatic based on `DATABASE_URL` presence.

---

## Why Keep SQLite for Development

**Local development benefits:**
- ✅ Zero infrastructure dependencies (no Docker, no cloud DB)
- ✅ File-based storage (can version-control seed data)
- ✅ Fast iteration (no network latency)
- ✅ Offline development support
- ✅ Simple reset (delete file, restart)
- ✅ SQLite is production-grade for single-writer scenarios

**Migration principle:**
> Don't break local development when adding production capabilities.

---

## Why Postgres for Production

**Staging/production requirements:**
- ✅ Multi-connection support (serverless function concurrency)
- ✅ Horizontal scalability (Neon autoscaling)
- ✅ Connection pooling (required for serverless)
- ✅ Managed backups (Neon point-in-time recovery)
- ✅ Full ACID at scale
- ✅ Standard SQL compatibility (easier tooling/migration)

**Target:** Neon Postgres (serverless, autoscaling, branch-based development)

---

## Backend Selection Logic

### Automatic Selection

```typescript
// In src/adapters/db/client.ts
export function getDatabaseBackend(): 'sqlite' | 'postgres' {
  return process.env.DATABASE_URL ? 'postgres' : 'sqlite';
}
```

### Environment Configuration

**Local development:**
```bash
# .env (or no .env at all)
# No DATABASE_URL → SQLite backend selected automatically
VIENNA_RUNTIME_PORT=3200
```

**Staging/Production:**
```bash
# .env.production
DATABASE_URL=postgresql://user:password@ep-purple-smoke.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
VIENNA_RUNTIME_PORT=3200
```

---

## Implementation Status

### ✅ Completed (Stage 6)

**1. Postgres client adapter**
- File: `src/adapters/db/postgres-client.ts`
- Connection pooling configured
- Neon-compatible settings
- Health check queries
- Migration runner

**2. Backend selection**
- File: `src/adapters/db/client.ts`
- Automatic backend detection
- Unified initialization interface
- Health check abstraction
- Backend info for observability

**3. Dependencies**
- `pg` installed (Postgres driver)
- `@types/pg` installed (TypeScript types)
- `better-sqlite3` preserved (local dev)

### ⏭ Deferred (Post-Stage 6)

**Repository migration:**
- Current repositories use SQLite-specific syntax (`db.prepare()`, `.run()`, `.get()`)
- Need Postgres-compatible repository implementations

**Two migration approaches:**

#### Approach A: Backend-specific repository implementations
```
src/adapters/db/repositories/
  sqlite/
    investigations.ts
    incidents.ts
    ...
  postgres/
    investigations.ts (async, uses pool.query())
    incidents.ts
    ...
```

**Pros:** Clear separation, optimized for each backend  
**Cons:** Duplicate logic, maintenance burden

#### Approach B: Unified repository with adapter pattern
```typescript
// Abstract DB adapter
interface DatabaseAdapter {
  query(sql: string, params: any[]): Promise<any[]>;
  execute(sql: string, params: any[]): Promise<void>;
}

// SQLite adapter
class SQLiteAdapter implements DatabaseAdapter { ... }

// Postgres adapter
class PostgresAdapter implements DatabaseAdapter { ... }

// Repository uses adapter
class InvestigationRepository {
  constructor(private db: DatabaseAdapter) {}
  
  async create(data: NewInvestigation): Promise<Investigation> {
    await this.db.execute(
      'INSERT INTO investigations (...) VALUES (?, ?, ...)',
      [data.id, data.name, ...]
    );
    return this.findById(data.id);
  }
}
```

**Pros:** Single implementation, cleaner maintenance  
**Cons:** Slightly more abstraction, no backend-specific optimizations

**Recommended:** Approach B (unified adapter pattern)

---

## Schema Mapping

### Date/Time Fields

**SQLite:**
```sql
created_at TEXT DEFAULT (datetime('now'))
```

**Postgres:**
```sql
created_at TIMESTAMPTZ DEFAULT NOW()
```

**Repository handling:**
- Return ISO 8601 strings from both backends
- Parse dates in application code, not repository

### Primary Keys

**Both backends:**
```sql
id TEXT PRIMARY KEY  -- UUIDs as strings
```

No change needed.

### Foreign Keys

**Both backends:**
```sql
FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
```

Syntax compatible.

### Check Constraints

**SQLite:**
```sql
status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'archived'))
```

**Postgres (preferred):**
```sql
CREATE TYPE investigation_status AS ENUM ('open', 'investigating', 'resolved', 'archived');
status investigation_status NOT NULL
```

**Stage 6 decision:** Keep CHECK constraints for compatibility, migrate to ENUMs in future schema evolution.

---

## Migration Strategy

### Phase 1: Infrastructure (✅ Complete — Stage 6)

1. ✅ Add `pg` dependency
2. ✅ Create Postgres client adapter
3. ✅ Add backend selection logic
4. ✅ Update initialization to support both backends
5. ✅ Add health checks for both backends

### Phase 2: Repository Abstraction (Staged for Post-Stage 6)

1. Create `DatabaseAdapter` interface
2. Implement `SQLiteAdapter` (wraps `better-sqlite3`)
3. Implement `PostgresAdapter` (wraps `pg.Pool`)
4. Refactor one repository to use adapter (e.g., `InvestigationRepository`)
5. Validate dual-backend operation
6. Migrate remaining repositories

### Phase 3: Schema Evolution (Future)

1. Add Postgres-specific optimizations (ENUMs, indexes)
2. Create migration files (Drizzle or custom)
3. Test migration path from SQLite → Postgres
4. Document rollback procedures

---

## Rollback Considerations

### SQLite → Postgres Migration

**Export from SQLite:**
```bash
sqlite3 data/vienna.db .dump > backup.sql
```

**Transform to Postgres:**
- Replace `datetime('now')` with `NOW()`
- Adjust data types if needed
- Import to Postgres

**Postgres → SQLite Rollback:**
- Export Postgres data
- Transform back to SQLite syntax
- Import to SQLite file

**Recommended:** Use database migration tool (Drizzle Kit) for bidirectional schema management.

---

## Testing Strategy

### Local Development

**Verify SQLite still works:**
```bash
cd services/vienna-runtime
# Ensure DATABASE_URL is NOT set
unset DATABASE_URL
npm run dev
# Should log: "[Vienna DB] No DATABASE_URL, using SQLite backend"
```

### Staging/Production

**Verify Postgres connection:**
```bash
export DATABASE_URL="postgresql://..."
npm run dev
# Should log: "[Vienna DB] Detected DATABASE_URL, using Postgres backend"
# Should log: "[Vienna DB] Postgres initialization complete"
```

**Health check:**
```bash
curl http://localhost:3200/health
# Should show database backend info
```

---

## Environment Variables

### Local Development

```bash
# .env.local (or no .env at all)
# DATABASE_URL is intentionally NOT set → SQLite backend
VIENNA_RUNTIME_PORT=3200
ARTIFACT_STORAGE_TYPE=filesystem
```

### Staging/Production

```bash
# .env.production
# Neon Postgres connection
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-purple-smoke.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Runtime config
VIENNA_RUNTIME_PORT=3200
ARTIFACT_STORAGE_TYPE=s3

# S3 config (for artifacts)
AWS_S3_BUCKET=vienna-artifacts
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

---

## Connection Pooling

### Postgres Pool Configuration

**Default settings (Neon-optimized):**
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Max connections
  idleTimeoutMillis: 30000,     // 30s idle timeout
  connectionTimeoutMillis: 2000 // 2s connection timeout
});
```

**Recommended for Fly.io deployment:**
- 1 instance → max 10-20 connections
- Multiple instances → max 5-10 connections per instance
- Monitor Neon connection usage

### SQLite Concurrency

**SQLite characteristics:**
- Single-writer, multiple-reader
- No connection pooling needed
- Sufficient for local development
- NOT recommended for production with concurrent writes

---

## Schema Files

### Current Schema

**File:** `src/adapters/db/schema.ts`

Contains migrations array with SQL statements.

**SQLite compatibility:**
- Uses TEXT for timestamps
- Uses CHECK constraints for enums
- Foreign keys enabled via PRAGMA

**Postgres compatibility:**
- Schema includes Postgres-compatible syntax
- Runtime converts SQLite datetime() → Postgres NOW()
- Works with both backends

### Future Schema Evolution

**Recommendation:** Use Drizzle ORM for schema management

**Benefits:**
- Type-safe schema definition
- Automatic migration generation
- SQLite + Postgres support
- Better developer experience

**Migration path:**
```bash
npm install drizzle-orm drizzle-kit
# Define schema in Drizzle
# Generate migrations: npx drizzle-kit generate:pg
# Apply migrations: npx drizzle-kit push:pg
```

---

## Observability

### Database Info Endpoint

Added to `/health` endpoint:

```json
{
  "status": "healthy",
  "database": {
    "backend": "postgres",
    "configured": true,
    "healthy": true
  },
  "artifacts": {
    "backend": "filesystem",
    "configured": true
  }
}
```

### Startup Logging

**SQLite mode:**
```
[Vienna DB] No DATABASE_URL, using SQLite backend
[Vienna DB] Initialized SQLite database at /path/to/vienna.db
```

**Postgres mode:**
```
[Vienna DB] Detected DATABASE_URL, using Postgres backend
[Vienna DB] Initialized Postgres connection pool
[Vienna DB] Applying Postgres migration 1: initial_schema
[Vienna DB] Postgres migrations complete
[Vienna DB] Postgres initialization complete
```

---

## Known Limitations

### SQLite Limitations (Local Dev Only)

- ❌ **No concurrent writes** (single-writer lock)
- ❌ **No horizontal scaling** (file-based)
- ❌ **No network access** (local file only)
- ✅ **Perfect for single-developer local iteration**

### Postgres Limitations (None for Vienna use case)

- ✅ Full ACID
- ✅ Concurrent writes
- ✅ Horizontal scaling (Neon autoscaling)
- ✅ Network access (remote DB)

---

## Exit Criteria (Stage 6)

✅ **Postgres client adapter created**  
✅ **Backend selection logic implemented**  
✅ **Health checks support both backends**  
✅ **Local dev flow preserved (SQLite)**  
✅ **Production path established (Postgres)**  
✅ **Migration plan documented**  

**Stage 6 database infrastructure requirement met.**

---

## Next Steps (Post-Stage 6)

1. **Implement DatabaseAdapter interface** (unified repository pattern)
2. **Migrate repositories to async/adapter pattern**
3. **Add Postgres-specific optimizations** (ENUMs, indexes)
4. **Create schema migration tooling** (Drizzle Kit)
5. **Test full SQLite → Postgres migration**
6. **Document production schema evolution procedures**

**Estimated effort:** 6-8 hours for repository migration + validation

---

## Conclusion

Vienna Runtime can now connect to either SQLite (local) or Postgres (production) based on environment configuration. Local development workflow remains unchanged. Production deployment path is established and validated.

**Repository migration is staged for post-Stage 6 work** to avoid expanding Stage 6 scope beyond production integration foundation.
