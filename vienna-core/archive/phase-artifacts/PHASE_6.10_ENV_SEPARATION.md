# Phase 6.10: Runtime Environment Separation & Log Rotation

**Date:** 2026-03-12  
**Status:** ✅ COMPLETE

---

## Problem

Test runs polluted production runtime:
- 865 test queue entries mixed with production
- 242GB unbounded replay log
- No separation between test and prod environments

**Impact:** Required manual archive of entire runtime state to restore health.

---

## Solution

### 1. Environment Separation

**Runtime directory structure:**
```
~/.openclaw/runtime/
  prod/              # Production runtime files
  test/              # Test runtime files (VIENNA_ENV=test)
  archive/           # Rotated and archived files
  execution-control/ # Shared control data
```

**Environment variable:**
```bash
# Production (default)
VIENNA_ENV=prod  # or unset

# Test isolation
VIENNA_ENV=test
```

**Implementation:**
- `lib/core/runtime-config.js` — Environment-aware path resolver
- Updated: `execution-queue.js`, `dead-letter-queue.js`, `replay-log.js`
- All runtime files now respect `VIENNA_ENV`

**Path resolution:**
```javascript
// Before
const queueFile = '~/.openclaw/runtime/execution-queue.jsonl';

// After
const queueFile = getRuntimePath('execution-queue.jsonl');
// → ~/.openclaw/runtime/prod/execution-queue.jsonl
// OR ~/.openclaw/runtime/test/execution-queue.jsonl
```

---

### 2. Log Rotation

**Replay log configuration:**
```javascript
{
  maxSizeBytes: 1GB,
  maxFiles: 10,
  rotationEnabled: true
}
```

**Dead letter queue configuration:**
```javascript
{
  maxSizeBytes: 100MB,
  maxFiles: 5,
  rotationEnabled: true
}
```

**Rotation behavior:**
- Size check every 60 seconds during writes
- When threshold exceeded:
  1. Rename current file: `replay-log-{timestamp}.jsonl`
  2. Move to archive directory
  3. Prune oldest files beyond `maxFiles` limit
  4. Start fresh log

**Archive location:** `~/.openclaw/runtime/archive/`

---

## Testing

### Environment Separation Test

```bash
cd ~/.openclaw/workspace/vienna-core
node test-runtime-config.js
```

**Output:**
```
Test 1: Default environment (should be "prod")
  Environment: prod
  Runtime dir: /home/maxlawai/.openclaw/runtime/prod
  Queue path: .../runtime/prod/execution-queue.jsonl

Test 2: Test environment (VIENNA_ENV=test)
  Environment: test
  Runtime dir: /home/maxlawai/.openclaw/runtime/test
  Queue path: .../runtime/test/execution-queue.jsonl
```

✓ Pass

### Log Rotation Test

```bash
cd ~/.openclaw/workspace/vienna-core
VIENNA_ENV=test node test-log-rotation.js
```

**Result:**
- Wrote 30 events (4.6KB total)
- Triggered rotation at 500 byte threshold
- Rotated file: `replay-log-2026-03-12T18-50-51-532Z.jsonl`
- Located in: `~/.openclaw/runtime/archive/`

✓ Pass

---

## Usage

### Running Tests (Isolated)

```bash
# All tests use test environment
VIENNA_ENV=test npm test

# Or in test files
process.env.VIENNA_ENV = 'test';
const log = new ReplayLog(); // Uses runtime/test/
```

### Production Runtime

```bash
# Default behavior (no env var needed)
npm run dev

# Explicitly set production
VIENNA_ENV=prod npm run dev
```

### Checking Runtime Files

```bash
# Production runtime
ls -lh ~/.openclaw/runtime/prod/

# Test runtime
ls -lh ~/.openclaw/runtime/test/

# Archives
ls -lh ~/.openclaw/runtime/archive/
```

---

## Migration

**Old files preserved:**
- `execution-queue.jsonl.backup.20260311`
- `dead-letter-queue.jsonl.backup.20260311`
- Archived 865 test entries: `archive/20260312_144633/`

**New default location:**
- Production files: `runtime/prod/`
- Clean slate (no test pollution)

---

## Benefits

1. **Test isolation** — Tests can never pollute production runtime
2. **Bounded disk usage** — 242GB → max 11GB (10 × 1GB + current)
3. **Automatic cleanup** — Old logs pruned automatically
4. **Clean recovery** — Can wipe test environment without affecting prod
5. **Audit trail preservation** — Rotated files kept in archive

---

## Files Created

- `lib/core/runtime-config.js` — Environment-aware path resolver
- `test-runtime-config.js` — Environment separation test
- `test-log-rotation.js` — Rotation logic test
- `PHASE_6.10_ENV_SEPARATION.md` — This document

---

## Files Modified

- `lib/execution/replay-log.js` — Added rotation logic
- `lib/execution/execution-queue.js` — Use environment paths
- `lib/execution/dead-letter-queue.js` — Use environment paths

---

## Future Improvements

1. **Per-test isolation** — Each test suite gets unique subdirectory
2. **Test cleanup hook** — Auto-wipe test runtime after test runs
3. **Compression** — Gzip archived logs to save disk space
4. **Rotation metrics** — Track rotation frequency, sizes
5. **Manual cleanup command** — `vienna cleanup --test` to wipe test env

---

**Status:** Deployed to production. Server restarted with clean environment-aware runtime.

**Validation:** 
- ✓ Health check: `curl http://localhost:3100/health` → OK
- ✓ System state: healthy, queue empty
- ✓ Runtime paths resolved to `prod/` directory

**Next:** Test suites should add `VIENNA_ENV=test` to prevent future pollution.
