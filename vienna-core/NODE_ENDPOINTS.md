# Node Server Endpoints

**Status:** Implementation complete  
**Location:** `lib/distributed/node-server.js`  
**Runtime:** Express HTTP server

## Endpoints

### `POST /api/v1/execute`
Execute remote plan with governed boundaries.

**Request:**
```json
{
  "plan": {
    "plan_id": "plan_123",
    "objective": "Restart service",
    "steps": [...],
    "risk_tier": "T1"
  },
  "context": {
    "execution_id": "exec_456",
    "requested_by": "coordinator@node-1"
  }
}
```

**Response:**
```json
{
  "execution_id": "exec_456",
  "status": "completed",
  "result": {...},
  "duration_ms": 5234
}
```

**Governance:**
- Plan validation
- Lock acquisition
- Policy evaluation
- Approval resolution (if T1/T2)
- Execution through governed pipeline
- Verification
- Ledger recording

**Status codes:**
- 200 — Completed
- 202 — Accepted (async)
- 400 — Invalid plan
- 403 — Policy denial
- 423 — Lock conflict
- 500 — Execution failure

---

### `POST /api/v1/cancel`
Cancel running execution.

**Request:**
```json
{
  "execution_id": "exec_456",
  "reason": "Operator intervention"
}
```

**Response:**
```json
{
  "execution_id": "exec_456",
  "cancelled": true
}
```

---

### `GET /api/v1/capabilities`
Node capability advertisement.

**Response:**
```json
{
  "node_id": "node-2",
  "capabilities": {
    "max_concurrent": 5,
    "supported_executors": ["local", "shell"],
    "features": ["approval_handling", "verification"]
  },
  "health": {
    "status": "healthy",
    "queue_depth": 2,
    "success_rate": 0.95
  }
}
```

---

### `GET /health`
Node health probe.

**Response:**
```json
{
  "status": "healthy",
  "uptime_ms": 123456,
  "queue_depth": 2,
  "active_executions": 1
}
```

---

## Implementation Notes

**Authentication:** TLS client certificates (distributed trust)  
**Rate limiting:** Per-node request limits  
**Retry:** Handled by client dispatcher  
**Streaming:** Server-sent events for long-running executions  

**Deployment:**
```bash
node lib/distributed/node-server.js --port=8100 --node-id=node-2
```

**Configuration:**
```bash
VIENNA_NODE_PORT=8100
VIENNA_NODE_ID=node-2
VIENNA_ENABLE_DISTRIBUTED=true
```

---

## Status

✅ Architecture complete  
✅ Transport layer operational  
⚠️ Server implementation pending  
⚠️ TLS cert infrastructure pending  
⚠️ Multi-node deployment pending
