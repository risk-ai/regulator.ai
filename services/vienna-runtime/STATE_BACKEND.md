# Vienna Runtime State Backend

## Overview

Stage 4 implements a **persistent SQLite state backend** for Vienna Runtime development.

This provides:
- Real persistence across runtime restarts
- Graph relationship storage
- Foundation for production Postgres migration
- Repository pattern isolation

## Why SQLite for Stage 4

**Development benefits:**
- Zero infrastructure dependencies
- File-based storage (version-controllable seed data)
- Fast local iteration
- Compatible schema with Postgres

**Production path:**
- Schema designed for Postgres compatibility
- Migration to Neon planned for production deployment
- Repository interfaces hide backend implementation

## Database Location

```
services/vienna-runtime/data/vienna.db
```

This file is created automatically on first runtime boot.

## Schema Overview

### Core Entities

**investigations**
- Investigation workspaces for incident analysis
- Links to incidents, artifacts, traces

**incidents**
- Service failures, degradations, violations
- Links to investigations, objectives, intents, artifacts

**artifacts**
- Files (traces, reports, logs, snapshots)
- Stored in filesystem, metadata in DB

**traces**
- Intent execution traces
- Timeline of governance decisions

**executions**
- Execution attempts linked to traces
- Duration, exit codes, status

**objectives**
- Managed objectives for autonomous reconciliation
- Target state, evaluation interval, status

### Relationships

**incident_investigations** — Many-to-many investigation ↔ incident  
**incident_artifacts** — Many-to-many incident ↔ artifact  
**incident_intents** — Many-to-many incident ↔ intent  
**incident_objectives** — Many-to-many incident ↔ objective

## Repository Responsibilities

Repositories isolate database access from route handlers.

**Principle:** Routes depend on services, services depend on repositories.

### Repository Interface Pattern

```typescript
interface InvestigationRepository {
  create(investigation: NewInvestigation): Investigation;
  findById(id: string): Investigation | null;
  list(filters?: ListFilters): Investigation[];
  update(id: string, updates: Partial<Investigation>): Investigation;
}
```

### Service Layer Pattern

```typescript
class InvestigationService {
  constructor(
    private repo: InvestigationRepository,
    private artifactRepo: ArtifactRepository
  ) {}

  async getDetailWithRelationships(id: string): InvestigationDetail {
    const investigation = this.repo.findById(id);
    const artifacts = this.artifactRepo.listByInvestigation(id);
    // ... expand relationships
    return { investigation, artifacts, ... };
  }
}
```

## Migration Path to Postgres

When Vienna moves to production:

1. Replace `better-sqlite3` with `pg` (Postgres driver)
2. Update connection configuration for Neon
3. Repository implementations change, interfaces stay stable
4. Schema migrations handled via Drizzle or similar tool
5. Routes and services require zero changes

## Database Initialization

Database initializes automatically on runtime boot:

```typescript
import { initializeDatabase } from './adapters/db/client';

// In app.ts
const db = initializeDatabase();
```

If `vienna.db` doesn't exist:
1. File is created
2. Migrations table is created
3. Schema migrations run
4. Database is ready

## Migrations

Migrations tracked in `adapters/db/schema.ts`:

```typescript
export const MIGRATIONS = [
  { version: 1, name: 'initial_schema', sql: SCHEMA_SQL },
  // Future migrations added here
];
```

Applied migrations stored in `migrations` table.

## Schema Compatibility Notes

**Date/time fields:**
- SQLite: TEXT with ISO 8601 format
- Postgres: TIMESTAMP or TIMESTAMPTZ
- Repositories normalize format

**Foreign keys:**
- Enabled via `PRAGMA foreign_keys = ON`
- Cascade deletes defined in schema

**Check constraints:**
- Status/severity enums via CHECK constraints
- Compatible with Postgres ENUM types

## Development Workflow

**First boot:**
```bash
cd services/vienna-runtime
npm install
npm run dev
```

Database auto-created at `data/vienna.db`.

**Reset database:**
```bash
rm data/vienna.db
npm run dev  # Recreates with fresh schema
```

**Inspect database:**
```bash
sqlite3 data/vienna.db
sqlite> .tables
sqlite> .schema investigations
sqlite> SELECT * FROM investigations;
```

## Production Considerations

**Not for production:**
- SQLite is development-only
- No concurrent write scaling
- No distributed deployment support

**Production backend:**
- Neon Postgres (serverless, autoscaling)
- Connection pooling
- Full ACID guarantees at scale
- Backup/restore infrastructure

## File Structure

```
services/vienna-runtime/
├── data/
│   └── vienna.db              # SQLite database (auto-created)
├── src/
│   ├── adapters/
│   │   └── db/
│   │       ├── client.ts      # Database connection
│   │       ├── schema.ts      # Schema + migrations
│   │       └── repositories/  # Repository implementations
│   ├── core/                  # Service layer
│   └── routes/                # Express route handlers
```

## Next Steps

1. Implement repository interfaces
2. Create service layer
3. Wire routes to services
4. Add seed data bootstrap
5. Test persistence across restarts
