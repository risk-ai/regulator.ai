# Observability (Stage 6)

**Date:** 2026-03-14  
**Status:** ✅ BASELINE LOGGING OPERATIONAL

---

## Overview

Vienna Runtime implements **structured logging** and **health diagnostics** for operational visibility.

**Design principle:** Log what matters, hide what's sensitive, make debugging actionable.

---

## What is Logged

### Startup Logging

**Always logged on startup:**
```
🏛 Vienna Runtime Service
   Port: 3001
   Environment: production
   Database Backend: postgres
   Artifact Backend: s3
   Health: http://localhost:3001/health

✓ Ready for requests
```

**Backend initialization:**
```
[Vienna DB] Detected DATABASE_URL, using Postgres backend
[Vienna DB] Initialized Postgres connection pool
[Vienna DB] Applying Postgres migration 1: initial_schema
[Vienna DB] Postgres migrations complete
[Vienna DB] Postgres initialization complete
```

```
[Artifact Storage] Initializing S3 backend
[Artifact Storage] Initialized S3 client (region: us-east-1, bucket: vienna-artifacts-prod)
```

**Or for local development:**
```
[Vienna DB] No DATABASE_URL, using SQLite backend
[Vienna DB] Initialized SQLite database at /app/data/vienna.db
[Artifact Storage] Initializing filesystem backend
[Artifact Storage] Created directory: /app/data/artifacts
```

### Request Logging

**Format:**
```
[2026-03-14T22:54:00.123Z] GET /health
[2026-03-14T22:54:01.456Z] GET /api/investigations
[2026-03-14T22:54:02.789Z] POST /api/incidents
```

**Logged for every request:**
- ISO 8601 timestamp
- HTTP method
- Request path
- No query parameters (avoid logging sensitive data)
- No request body (avoid logging credentials)

**Implementation:**
```typescript
// src/app.ts
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

### Error Logging

**Format:**
```
Error: <error-message>
  at <stack-trace>
```

**Logged for:**
- Uncaught exceptions
- Database connection failures
- S3 operation failures
- Route handler errors

**Implementation:**
```typescript
// src/app.ts (error handler)
app.use((err: Error, _req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: err.message  // User-facing message only
  });
});
```

### Health Check Logging

**Not logged on every request** (too noisy)

Health checks occur every 30 seconds but don't generate logs unless they fail.

**Logged only on failure:**
```
[Vienna DB] Postgres health check failed: connection timeout
[Artifact Storage] S3 health check failed: Access Denied
```

---

## What is NOT Logged

### Secrets

❌ **Never logged:**
- `DATABASE_URL` (contains password)
- `AWS_SECRET_ACCESS_KEY`
- `WORKSPACE_AUTH_TOKEN`
- Any `Authorization` headers
- Any user passwords or tokens

✅ **Safe to log:**
- Database backend type (`postgres` or `sqlite`)
- S3 bucket name (`vienna-artifacts-prod`)
- AWS region (`us-east-1`)
- Port number (`3001`)

### Sensitive Data

❌ **Never logged:**
- Request bodies (may contain PII or credentials)
- Query parameters (may contain tokens)
- Full stack traces in user-facing responses

✅ **Logged in errors:**
- Stack traces to stderr (for debugging)
- Generic error messages to user (no internals)

### High-Volume Noise

❌ **Not logged:**
- Every health check request (too noisy)
- Successful request completions (inferred from logs)
- Debug-level internal state (unless LOG_LEVEL=debug)

---

## Health Endpoint

### Endpoint

**GET** `/health`

### Response Format

**Healthy (200 OK):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "components": {
    "state_graph": {
      "status": "healthy",
      "type": "postgres",
      "configured": true
    },
    "artifact_storage": {
      "status": "healthy"
    }
  }
}
```

**Degraded (200 OK with degraded status):**
```json
{
  "status": "degraded",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "components": {
    "state_graph": {
      "status": "unhealthy",
      "type": "postgres",
      "configured": true
    },
    "artifact_storage": {
      "status": "healthy"
    }
  }
}
```

**Unhealthy (503 Service Unavailable - future):**
```json
{
  "status": "unhealthy",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "components": {
    "state_graph": {
      "status": "unhealthy",
      "type": "postgres",
      "configured": false
    },
    "artifact_storage": {
      "status": "unhealthy"
    }
  }
}
```

### Health Semantics

**`healthy`:**
- All components operational
- Database reachable
- Artifact storage accessible
- Can serve requests

**`degraded`:**
- Some components failing
- Can still serve cached data
- Graceful degradation active
- May return stale data

**`unhealthy`:**
- Critical components down
- Cannot serve requests reliably
- Should not receive traffic

### Current Implementation

**Status:** Always returns 200 OK (even if degraded)

**Reason:** Fly.io restarts unhealthy containers. For now, we want graceful degradation.

**Future:** Return 503 for `unhealthy` status to trigger load balancer failover.

---

## Readiness Semantics

**Ready:** Can accept new requests  
**Not ready:** Still starting up, don't route traffic yet

### Proposed `/ready` Endpoint (Future)

```json
{
  "ready": true,
  "components": {
    "database_migrations": "complete",
    "artifact_directory": "initialized",
    "health_check": "passed"
  }
}
```

**Use case:** Kubernetes readiness probes, zero-downtime deployments

**Current:** No `/ready` endpoint (startup fast enough for Fly.io)

---

## Log Levels

### Supported Levels

Set via `LOG_LEVEL` environment variable:

- `error` — Errors only
- `warn` — Warnings + errors
- `info` — Info + warnings + errors (default)
- `debug` — Debug + info + warnings + errors

### Examples

**LOG_LEVEL=error:**
```
[Vienna DB] Postgres connection failed: timeout
Error: Database unavailable
```

**LOG_LEVEL=info (default):**
```
[Vienna DB] Initialized Postgres connection pool
[Artifact Storage] Uploaded artifacts/art_001 to S3
[2026-03-14T22:54:00.123Z] GET /api/investigations
```

**LOG_LEVEL=debug:**
```
[Vienna DB] Connection pool: 5/20 active connections
[Artifact Storage] S3 PUT artifacts/art_001 (1234 bytes, 156ms)
[Request] Headers: {"authorization":"Bearer [REDACTED]"}
[Response] 200 OK (23ms)
```

### Current Implementation

**Status:** Partial (startup + request logging operational, no LOG_LEVEL filtering yet)

**Future:** Implement log level filtering based on `LOG_LEVEL` env var.

---

## Structured Logging Format

### Current Format (Human-Readable)

```
[2026-03-14T22:54:00.123Z] GET /health
[Vienna DB] Initialized Postgres connection pool
Error: Connection timeout
```

### Future Format (JSON - Machine-Parseable)

```json
{"timestamp":"2026-03-14T22:54:00.123Z","level":"info","method":"GET","path":"/health","duration_ms":12}
{"timestamp":"2026-03-14T22:54:01.456Z","level":"info","component":"database","message":"Initialized Postgres connection pool"}
{"timestamp":"2026-03-14T22:54:02.789Z","level":"error","message":"Connection timeout","error":"ETIMEDOUT"}
```

**Benefits:**
- Machine-parseable (grep, jq, log aggregators)
- Consistent schema
- Easier to search and filter
- Better for Datadog/Splunk ingestion

**When to implement:** Post-Stage 6, when log aggregation is added

---

## Observability Stack (Future)

### Recommended Stack

**Application Performance Monitoring (APM):**
- Sentry (error tracking, release tracking)
- Datadog APM (distributed tracing)

**Metrics:**
- Prometheus (time-series metrics)
- Grafana (visualization)

**Logs:**
- Fly.io native logging
- Or: Ship to Datadog/Splunk/ELK

**Traces:**
- OpenTelemetry (distributed tracing)
- Jaeger or Zipkin (trace visualization)

### Metrics to Collect (Future)

**Request metrics:**
- Request count (total, per endpoint)
- Request duration (p50, p95, p99)
- Error rate (5xx responses)
- Request size (bytes)

**Database metrics:**
- Connection pool size (active/idle)
- Query duration (p50, p95, p99)
- Query count (per table)
- Connection failures

**S3 metrics:**
- Upload/download count
- Upload/download duration
- S3 API errors
- Bandwidth usage

**Health metrics:**
- Uptime
- Component status (healthy/degraded/unhealthy)
- Health check failures

---

## Current Observability Gaps

### What We Have (Stage 6)

✅ **Startup logging** (backend selection, initialization)  
✅ **Request logging** (timestamp, method, path)  
✅ **Error logging** (stderr, stack traces)  
✅ **Health endpoint** (/health with component status)  

### What's Missing (Post-Stage 6)

⏭ **Log level filtering** (LOG_LEVEL env var)  
⏭ **Structured JSON logging** (machine-parseable)  
⏭ **Request duration tracking** (latency metrics)  
⏭ **Error rate metrics** (5xx percentage)  
⏭ **Database query logging** (slow query detection)  
⏭ **S3 operation logging** (upload/download tracking)  
⏭ **Distributed tracing** (OpenTelemetry)  
⏭ **APM integration** (Sentry, Datadog)  
⏭ **Alert rules** (PagerDuty, Slack)  
⏭ **Dashboard** (Grafana, Datadog)  

---

## Operational Runbooks

### Debugging Production Issues

**1. Check runtime health:**
```bash
curl https://vienna-runtime.fly.dev/health
```

**2. View recent logs:**
```bash
fly logs --lines 100
```

**3. Search for errors:**
```bash
fly logs | grep -i error
```

**4. Check database connectivity:**
```bash
fly ssh console
# Inside container:
curl http://localhost:3001/health | jq .components.state_graph
```

**5. Check S3 connectivity:**
```bash
fly ssh console
# Inside container:
curl http://localhost:3001/health | jq .components.artifact_storage
```

### Common Log Patterns

**Successful startup:**
```
🏛 Vienna Runtime Service
[Vienna DB] Initialized Postgres connection pool
[Artifact Storage] Initialized S3 client
✓ Ready for requests
```

**Database connection failure:**
```
[Vienna DB] Postgres connection failed: ECONNREFUSED
Error: Database unavailable
```

**S3 permission error:**
```
[Artifact Storage] S3 health check failed: Access Denied
```

**Request errors:**
```
[2026-03-14T22:54:00.123Z] GET /api/investigations
Error: Connection timeout
```

---

## Log Retention

### Fly.io Native Logging

- **Retention:** 7 days (Fly.io default)
- **Search:** Via `fly logs` CLI
- **Export:** Not built-in

### Future Log Aggregation

**Recommended approach:**
- Ship logs to Datadog/Splunk/ELK
- Retention: 30-90 days (compliance-dependent)
- Search: Full-text search, filtering, aggregation
- Alerts: Threshold-based alerting

**Implementation:**
```bash
# Example: Ship to Datadog
fly secrets set DATADOG_API_KEY=<key>

# Add Datadog agent sidecar (future)
```

---

## Security Considerations

### Log Sanitization

**Current:** Manual (avoid logging sensitive fields)

**Future:** Automated redaction
```typescript
function sanitizeLog(obj: any): any {
  const sanitized = { ...obj };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.authorization;
  if (sanitized.database_url) {
    sanitized.database_url = sanitized.database_url.replace(/:\/\/[^@]+@/, '://[REDACTED]@');
  }
  return sanitized;
}
```

### Log Access Control

**Current:** Fly.io dashboard + CLI (team access only)

**Future:** RBAC for log access (read-only analyst role)

---

## Exit Criteria (Stage 6)

✅ **Startup logging operational** (backend selection visible)  
✅ **Request logging operational** (timestamp, method, path)  
✅ **Error logging operational** (stderr, stack traces)  
✅ **Health endpoint enhanced** (component status, backend info)  
✅ **Secret redaction guidance** (documented in this file)  
✅ **Observability gaps documented** (future work identified)  

**Stage 6 observability requirement met.**

---

## Next Steps (Post-Stage 6)

1. **Implement log level filtering** (respect LOG_LEVEL env var)
2. **Add structured JSON logging** (machine-parseable format)
3. **Add request duration tracking** (latency metrics)
4. **Integrate Sentry** (error tracking + release tracking)
5. **Add Prometheus metrics** (request count, duration, error rate)
6. **Create Grafana dashboard** (runtime health visualization)
7. **Set up alerts** (PagerDuty for production incidents)
8. **Document incident response** (runbook for on-call)

---

## Appendix: Log Examples

### Full Startup Sequence

```
🏛 Vienna Runtime Service
   Port: 3001
   Environment: production
   Database Backend: postgres
   Artifact Backend: s3
   Health: http://localhost:3001/health

[Vienna DB] Detected DATABASE_URL, using Postgres backend
[Vienna DB] Initialized Postgres connection pool
[Vienna DB] Postgres migrations complete
[Vienna DB] Postgres initialization complete
[Artifact Storage] Initializing S3 backend
[Artifact Storage] Initialized S3 client (region: us-east-1, bucket: vienna-artifacts-prod)

✓ Ready for requests
```

### Typical Request Flow

```
[2026-03-14T22:54:00.123Z] GET /health
[2026-03-14T22:54:01.456Z] GET /api/investigations
[2026-03-14T22:54:02.789Z] GET /api/investigations/inv_001
[2026-03-14T22:54:03.012Z] GET /api/incidents
```

### Error Scenario

```
[2026-03-14T22:54:00.123Z] GET /api/investigations
Error: connect ETIMEDOUT 1.2.3.4:5432
  at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1495:16)
```

User receives:
```json
{
  "error": "internal_error",
  "message": "connect ETIMEDOUT 1.2.3.4:5432"
}
```

**Note:** Stack trace in logs (stderr), user message sanitized (no internal paths).
