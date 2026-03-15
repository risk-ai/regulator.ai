# Artifact Storage

## Overview

Stage 4 implements **filesystem-based artifact storage** for local development.

Production will migrate to **S3** or **Vercel Blob** for scalable object storage.

## Local Filesystem Layout

```
services/vienna-runtime/data/artifacts/
  art_001
  art_002
  ...
```

Each artifact is stored as a file named by its artifact ID.

## Metadata Model

Artifact metadata is stored in SQLite `artifacts` table:

- `id` — Unique artifact identifier
- `artifact_type` — Type classification
- `content_type` — MIME type
- `size_bytes` — File size in bytes
- `storage_path` — Reference path (for migration tracking)
- `investigation_id` — Link to investigation (nullable)
- `intent_id` — Link to intent trace (nullable)
- `execution_id` — Link to execution (nullable)
- `created_by` — Vienna actor identifier
- `created_at` — Creation timestamp

## Adapter Interface

Defined in `src/adapters/artifacts/filesystem.ts`:

```typescript
ensureArtifactsDir(): void
writeArtifact(artifactId: string, content: Buffer | string): string
readArtifact(artifactId: string): Buffer | null
artifactExists(artifactId: string): boolean
deleteArtifact(artifactId: string): boolean
getArtifactStats(artifactId: string): fs.Stats | null
```

## Migration Path to Object Storage

**Stage 4:** Filesystem (`data/artifacts/`)  
**Production:** S3 or Vercel Blob

**Migration strategy:**

1. Create S3/Blob adapter implementing same interface
2. Update artifact creation to use object storage
3. Migrate existing artifacts via batch upload script
4. Update `storage_path` references in database
5. Remove filesystem adapter

**Interface stability:** Adapter interface remains unchanged, only implementation swaps.

## Security Considerations

**Development (filesystem):**
- Files stored in `data/artifacts/` (gitignored)
- No public HTTP serving
- Access controlled via runtime API

**Production (object storage):**
- Pre-signed URLs for time-limited access
- Bucket access restricted to runtime service role
- No public bucket policy
- Audit logging enabled

## Content Type Support

Supported artifact types:

- `application/json` — Traces, execution graphs, state snapshots
- `text/markdown` — Investigation notes, postmortems
- `text/plain` — Logs, stdout, stderr
- `application/yaml` — Config snapshots

## File Size Limits

**Development:** No enforced limit  
**Production:** 10 MB per artifact (enforced at API layer)

Large artifacts (logs, recordings) will require chunking or streaming support.

## Artifact Serving

**Current:** Metadata-only API (no content serving)  
**Future:** Add `GET /api/artifacts/:id/content` endpoint with:
- Content-Type header from metadata
- Content-Disposition for downloads
- Pre-signed URLs for object storage

## Backup and Retention

**Development:** No automatic backup (local files only)  
**Production:** S3 bucket lifecycle policies for retention/archival
