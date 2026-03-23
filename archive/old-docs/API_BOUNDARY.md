# API Boundary — Product Shell ↔ Vienna Runtime

**Date:** 2026-03-14  
**Stage:** Stage 2 Architecture Reconciliation  
**Purpose:** Define HTTP API contracts between Next.js and Vienna runtime

---

## Overview

Next.js product shell communicates with Vienna runtime via HTTP API.

**Base URL (development):** `http://localhost:3100`  
**Base URL (production):** `http://vienna-runtime:3100` (private network)

**Authentication:** JWT token in `Authorization: Bearer <token>` header (production only)  
**Content-Type:** `application/json`

---

## Investigation APIs

### Create Investigation

**Endpoint:** `POST /api/v1/investigations`

**Request:**

```json
{
  "name": "Gateway Failure 2026-03-14",
  "description": "Investigating repeated gateway restarts",
  "objective_id": "obj_maintain_gateway_health",
  "created_by": "operator@example.com"
}
```

**Response (201 Created):**

```json
{
  "id": "inv_20260314_001",
  "name": "Gateway Failure 2026-03-14",
  "description": "Investigating repeated gateway restarts",
  "objective_id": "obj_maintain_gateway_health",
  "status": "open",
  "created_by": "operator@example.com",
  "created_at": "2026-03-14T21:18:00Z",
  "workspace_path": "/investigations/gateway-failure-2026-03-14"
}
```

**Error (400 Bad Request):**

```json
{
  "error": "validation_failed",
  "message": "name is required",
  "details": { "field": "name" }
}
```

---

### List Investigations

**Endpoint:** `GET /api/v1/investigations`

**Query Parameters:**
- `status` (optional): `open`, `investigating`, `resolved`, `archived`
- `objective_id` (optional): filter by objective
- `created_by` (optional): filter by creator
- `limit` (optional, default 50): max results
- `offset` (optional, default 0): pagination offset

**Response (200 OK):**

```json
{
  "investigations": [
    {
      "id": "inv_20260314_001",
      "name": "Gateway Failure 2026-03-14",
      "status": "investigating",
      "created_by": "operator@example.com",
      "created_at": "2026-03-14T21:18:00Z",
      "artifact_count": 12,
      "trace_count": 3
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Get Investigation Details

**Endpoint:** `GET /api/v1/investigations/:id`

**Response (200 OK):**

```json
{
  "id": "inv_20260314_001",
  "name": "Gateway Failure 2026-03-14",
  "description": "Investigating repeated gateway restarts",
  "status": "investigating",
  "objective_id": "obj_maintain_gateway_health",
  "created_by": "operator@example.com",
  "created_at": "2026-03-14T21:18:00Z",
  "resolved_at": null,
  "workspace_path": "/investigations/gateway-failure-2026-03-14",
  "artifacts": [
    {
      "id": "art_20260314_001",
      "artifact_type": "trace",
      "name": "intent_trace_gateway_restart.json",
      "size_bytes": 4521
    }
  ],
  "related_objectives": [
    {
      "id": "obj_maintain_gateway_health",
      "name": "Maintain Gateway Health",
      "status": "healthy"
    }
  ],
  "related_incidents": []
}
```

**Error (404 Not Found):**

```json
{
  "error": "investigation_not_found",
  "message": "Investigation inv_20260314_999 not found"
}
```

---

### Update Investigation Status

**Endpoint:** `PATCH /api/v1/investigations/:id`

**Request:**

```json
{
  "status": "resolved",
  "resolution_notes": "Gateway stability restored after circuit breaker tuning"
}
```

**Response (200 OK):**

```json
{
  "id": "inv_20260314_001",
  "status": "resolved",
  "resolved_at": "2026-03-14T22:30:00Z"
}
```

---

## Artifact APIs

### Store Artifact

**Endpoint:** `POST /api/v1/artifacts`

**Request:**

```json
{
  "artifact_type": "trace",
  "content": "{\"intent_id\":\"int_20260314_001\",\"status\":\"completed\"}",
  "investigation_id": "inv_20260314_001",
  "intent_id": "int_20260314_001",
  "created_by": "operator@example.com"
}
```

**Response (201 Created):**

```json
{
  "id": "art_20260314_001",
  "artifact_type": "trace",
  "file_path": "/workspace/traces/2026-03-14/intent_trace_int_20260314_001.json",
  "size_bytes": 4521,
  "content_hash": "sha256:7f3a...",
  "created_at": "2026-03-14T21:20:00Z"
}
```

---

### List Artifacts

**Endpoint:** `GET /api/v1/artifacts`

**Query Parameters:**
- `artifact_type` (optional): `trace`, `execution_graph`, `timeline_export`, `investigation`, `incident`, etc.
- `investigation_id` (optional): filter by investigation
- `intent_id` (optional): filter by intent
- `limit` (optional, default 50)
- `offset` (optional, default 0)

**Response (200 OK):**

```json
{
  "artifacts": [
    {
      "id": "art_20260314_001",
      "artifact_type": "trace",
      "file_path": "/workspace/traces/2026-03-14/intent_trace_int_20260314_001.json",
      "size_bytes": 4521,
      "investigation_id": "inv_20260314_001",
      "created_at": "2026-03-14T21:20:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Get Artifact Content

**Endpoint:** `GET /api/v1/artifacts/:id`

**Response (200 OK):**

```json
{
  "id": "art_20260314_001",
  "artifact_type": "trace",
  "file_path": "/workspace/traces/2026-03-14/intent_trace_int_20260314_001.json",
  "content": "{\"intent_id\":\"int_20260314_001\",\"status\":\"completed\",\"timeline\":[...]}",
  "mime_type": "application/json",
  "size_bytes": 4521,
  "content_hash": "sha256:7f3a...",
  "created_at": "2026-03-14T21:20:00Z"
}
```

---

### Download Artifact

**Endpoint:** `GET /api/v1/artifacts/:id/download`

**Response:** Binary file download with appropriate `Content-Type` and `Content-Disposition` headers

---

## Trace APIs

### Get Trace Timeline

**Endpoint:** `GET /api/v1/traces/:id/timeline`

**Response (200 OK):**

```json
{
  "intent_id": "int_20260314_001",
  "timeline": [
    {
      "timestamp": "2026-03-14T21:18:00Z",
      "event_type": "intent_received",
      "actor": "operator@example.com",
      "details": { "action": "restart_service", "target": "openclaw-gateway" }
    },
    {
      "timestamp": "2026-03-14T21:18:01Z",
      "event_type": "plan_created",
      "details": { "plan_id": "pln_20260314_001", "steps": 3 }
    },
    {
      "timestamp": "2026-03-14T21:18:02Z",
      "event_type": "execution_started",
      "details": { "execution_id": "exe_20260314_001" }
    },
    {
      "timestamp": "2026-03-14T21:18:05Z",
      "event_type": "execution_completed",
      "details": { "status": "success" }
    }
  ]
}
```

---

### Get Trace Execution Graph

**Endpoint:** `GET /api/v1/traces/:id/graph`

**Response (200 OK):**

```json
{
  "intent_id": "int_20260314_001",
  "nodes": [
    { "id": "intent", "type": "intent", "label": "Restart Gateway" },
    { "id": "plan", "type": "plan", "label": "Gateway Recovery Plan" },
    { "id": "execution", "type": "execution", "label": "Execute Restart" },
    { "id": "verification", "type": "verification", "label": "Verify Health" }
  ],
  "edges": [
    { "from": "intent", "to": "plan", "label": "generated" },
    { "from": "plan", "to": "execution", "label": "executed" },
    { "from": "execution", "to": "verification", "label": "verified" }
  ]
}
```

---

### Export Trace

**Endpoint:** `GET /api/v1/traces/:id/export`

**Query Parameters:**
- `format` (optional, default `json`): `json`, `markdown`, `pdf`

**Response (200 OK, JSON):**

```json
{
  "intent_id": "int_20260314_001",
  "export_format": "json",
  "generated_at": "2026-03-14T22:00:00Z",
  "trace": { ... }
}
```

**Response (200 OK, Markdown):**

```markdown
# Intent Trace: int_20260314_001

**Status:** Completed  
**Created:** 2026-03-14T21:18:00Z  
...
```

---

## Incident APIs

### Create Incident

**Endpoint:** `POST /api/v1/incidents`

**Request:**

```json
{
  "title": "OpenClaw Gateway Unavailable",
  "severity": "critical",
  "service_id": "openclaw-gateway",
  "detected_by": "objective_evaluator",
  "details": { "error": "Connection refused on port 18789" }
}
```

**Response (201 Created):**

```json
{
  "id": "inc_20260314_001",
  "title": "OpenClaw Gateway Unavailable",
  "severity": "critical",
  "status": "open",
  "service_id": "openclaw-gateway",
  "detected_at": "2026-03-14T21:15:00Z",
  "resolved_at": null
}
```

---

### List Incidents

**Endpoint:** `GET /api/v1/incidents`

**Query Parameters:**
- `status` (optional): `open`, `investigating`, `resolved`
- `severity` (optional): `low`, `medium`, `high`, `critical`
- `service_id` (optional): filter by service
- `limit` (optional, default 50)
- `offset` (optional, default 0)

**Response (200 OK):**

```json
{
  "incidents": [
    {
      "id": "inc_20260314_001",
      "title": "OpenClaw Gateway Unavailable",
      "severity": "critical",
      "status": "resolved",
      "service_id": "openclaw-gateway",
      "detected_at": "2026-03-14T21:15:00Z",
      "resolved_at": "2026-03-14T21:20:00Z",
      "resolution_summary": "Automatic remediation successful"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Get Incident Details

**Endpoint:** `GET /api/v1/incidents/:id`

**Response (200 OK):**

```json
{
  "id": "inc_20260314_001",
  "title": "OpenClaw Gateway Unavailable",
  "severity": "critical",
  "status": "resolved",
  "service_id": "openclaw-gateway",
  "detected_at": "2026-03-14T21:15:00Z",
  "resolved_at": "2026-03-14T21:20:00Z",
  "detected_by": "objective_evaluator",
  "resolution_summary": "Automatic remediation successful",
  "timeline": [
    {
      "timestamp": "2026-03-14T21:15:00Z",
      "event": "incident_detected",
      "details": { "error": "Connection refused" }
    },
    {
      "timestamp": "2026-03-14T21:15:05Z",
      "event": "remediation_started",
      "details": { "plan_id": "pln_20260314_001" }
    },
    {
      "timestamp": "2026-03-14T21:20:00Z",
      "event": "incident_resolved",
      "details": { "verification_status": "healthy" }
    }
  ],
  "related_objectives": [
    { "id": "obj_maintain_gateway_health", "name": "Maintain Gateway Health" }
  ]
}
```

---

## Objective APIs

### List Objectives

**Endpoint:** `GET /api/v1/objectives`

**Query Parameters:**
- `status` (optional): `healthy`, `violation_detected`, `remediation_triggered`, etc.
- `objective_type` (optional): `service`, `endpoint`, `resource`
- `limit` (optional, default 50)
- `offset` (optional, default 0)

**Response (200 OK):**

```json
{
  "objectives": [
    {
      "id": "obj_maintain_gateway_health",
      "name": "Maintain Gateway Health",
      "objective_type": "service",
      "target_id": "openclaw-gateway",
      "status": "healthy",
      "last_evaluated_at": "2026-03-14T21:17:30Z",
      "satisfaction": true
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Get Objective Details

**Endpoint:** `GET /api/v1/objectives/:id`

**Response (200 OK):**

```json
{
  "id": "obj_maintain_gateway_health",
  "name": "Maintain Gateway Health",
  "description": "Ensure OpenClaw Gateway remains healthy and available",
  "objective_type": "service",
  "target_type": "service",
  "target_id": "openclaw-gateway",
  "desired_state": { "status": "healthy" },
  "status": "healthy",
  "satisfaction": true,
  "last_evaluated_at": "2026-03-14T21:17:30Z",
  "evaluation_interval": 30,
  "verification_strength": "strong",
  "remediation_plan_id": "pln_gateway_recovery",
  "created_at": "2026-03-10T12:00:00Z"
}
```

---

### Get Objective Evaluation History

**Endpoint:** `GET /api/v1/objectives/:id/evaluations`

**Query Parameters:**
- `limit` (optional, default 100)
- `since` (optional, ISO timestamp): only evaluations after this time

**Response (200 OK):**

```json
{
  "objective_id": "obj_maintain_gateway_health",
  "evaluations": [
    {
      "id": "eval_20260314_001",
      "evaluated_at": "2026-03-14T21:17:30Z",
      "status": "healthy",
      "observed_state": { "status": "healthy", "port": 18789 },
      "satisfaction": true
    },
    {
      "id": "eval_20260314_002",
      "evaluated_at": "2026-03-14T21:15:00Z",
      "status": "unhealthy",
      "observed_state": { "status": "degraded", "error": "Connection refused" },
      "satisfaction": false,
      "remediation_triggered": "pln_20260314_001"
    }
  ],
  "total": 2
}
```

---

## Ledger APIs

### Query Ledger Events

**Endpoint:** `GET /api/v1/ledger/events`

**Query Parameters:**
- `objective_id` (optional): filter by objective
- `risk_tier` (optional): 0, 1, 2, 3
- `status` (optional): `completed`, `failed`, `denied`
- `target_id` (optional): filter by service/endpoint
- `since` (optional, ISO timestamp): events after this time
- `until` (optional, ISO timestamp): events before this time
- `limit` (optional, default 100)
- `offset` (optional, default 0)

**Response (200 OK):**

```json
{
  "events": [
    {
      "id": "evt_20260314_001",
      "execution_id": "exe_20260314_001",
      "event_type": "intent_received",
      "timestamp": "2026-03-14T21:18:00Z",
      "actor": "operator@example.com",
      "payload": { "action": "restart_service", "target": "openclaw-gateway" }
    },
    {
      "id": "evt_20260314_002",
      "execution_id": "exe_20260314_001",
      "event_type": "execution_completed",
      "timestamp": "2026-03-14T21:18:05Z",
      "actor": "vienna_executor",
      "payload": { "status": "success", "exit_code": 0 }
    }
  ],
  "total": 2,
  "limit": 100,
  "offset": 0
}
```

---

### Get Execution Summary

**Endpoint:** `GET /api/v1/ledger/executions/:execution_id`

**Response (200 OK):**

```json
{
  "execution_id": "exe_20260314_001",
  "intent_id": "int_20260314_001",
  "plan_id": "pln_20260314_001",
  "objective_id": "obj_maintain_gateway_health",
  "risk_tier": 1,
  "target_id": "openclaw-gateway",
  "status": "completed",
  "created_at": "2026-03-14T21:18:00Z",
  "completed_at": "2026-03-14T21:18:10Z",
  "duration_ms": 10000,
  "approval_status": "auto_approved",
  "execution_result": { "status": "success", "exit_code": 0 },
  "verification_result": { "objective_achieved": true, "confidence": 1.0 },
  "workflow_outcome": { "status": "success", "summary": "Gateway health restored" }
}
```

---

## Health & Status APIs

### Runtime Health

**Endpoint:** `GET /api/v1/health`

**Response (200 OK):**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "components": {
    "state_graph": { "status": "healthy", "type": "sqlite" },
    "objective_evaluator": { "status": "healthy", "last_cycle": "2026-03-14T21:17:30Z" },
    "execution_watchdog": { "status": "healthy", "last_check": "2026-03-14T21:17:35Z" },
    "artifact_storage": { "status": "healthy", "disk_usage": "12%" }
  }
}
```

---

### System Metrics

**Endpoint:** `GET /api/v1/metrics`

**Response (200 OK):**

```json
{
  "objectives": {
    "total": 10,
    "healthy": 9,
    "unhealthy": 0,
    "remediating": 1
  },
  "executions": {
    "total_today": 42,
    "succeeded": 40,
    "failed": 2,
    "denied": 0
  },
  "incidents": {
    "open": 0,
    "resolved_today": 3
  },
  "evaluations": {
    "total_today": 1440,
    "violations_detected": 3
  }
}
```

---

## Error Response Format

All errors follow consistent schema:

```json
{
  "error": "error_code",
  "message": "Human-readable error description",
  "details": { "field": "additional_context" }
}
```

**Common error codes:**
- `validation_failed` (400): Request validation error
- `not_found` (404): Resource not found
- `unauthorized` (401): Authentication required
- `forbidden` (403): Insufficient permissions
- `internal_error` (500): Server error

---

## Authentication

**Development:** No authentication required (localhost only)

**Production:** JWT-based authentication

**Header:**

```
Authorization: Bearer <jwt_token>
```

**Token Payload:**

```json
{
  "sub": "operator@example.com",
  "role": "operator",
  "iat": 1710450000,
  "exp": 1710453600
}
```

**Vienna validates:**
- Token signature (HMAC SHA-256)
- Token expiration
- Token issuer

---

## Rate Limiting

**Development:** No rate limiting

**Production:**
- 100 requests per minute per IP
- 1000 requests per hour per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Versioning

**API Version:** `/api/v1/*`

**Future versions:** `/api/v2/*` (additive changes only, no breaking changes in v1)

---

**Status:** API boundary defined  
**Next:** DOMAIN_MODEL_MAPPING.md
