# Vienna OS Backend API Documentation

**Base URL:** `https://console.regulator.ai/api/v1`

All authenticated endpoints require `Authorization: Bearer <token>` header.

---

## Authentication

### POST /auth/login
Login and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "tenant_id": "uuid",
    "role": "admin"
  }
}
```

---

## Execution Engine

### POST /execute
Execute an action with policy validation and warrant issuance.

**Request:**
```json
{
  "action": "send_email",
  "agent_id": "marketing-agent",
  "context": {
    "to": "customer@example.com",
    "tier": "T0"
  }
}
```

**Response (T0 - Auto-approved):**
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_1774897771557_n473bnivz",
    "warrant_id": "warrant_1774897771649_na0rl4zr0",
    "status": "executed",
    "tier": "T0",
    "policies_applied": ["policy_1", "policy_2"],
    "requires_approval": false,
    "timestamp": "2026-03-30T19:09:31.658Z"
  }
}
```

**Response (T1/T2 - Requires Approval):**
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_1774897855271_vrw5i7kw6",
    "warrant_id": null,
    "status": "pending_approval",
    "tier": "T1",
    "policies_applied": [],
    "requires_approval": true,
    "timestamp": "2026-03-30T19:43:22.810Z"
  }
}
```

---

## Approvals

### GET /approvals?status=pending&tier=T1
List approval requests.

**Query Parameters:**
- `status` - Filter by status (pending, approved, rejected)
- `tier` - Filter by tier (T0, T1, T2, T3)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "approval_id": "approval_1774897855278",
      "execution_id": "exec_1774897855271_vrw5i7kw6",
      "required_tier": "T1",
      "status": "pending",
      "action_summary": "delete_database by admin-agent",
      "risk_summary": "Tier T1 action requiring manual approval",
      "requested_at": "2026-03-30T19:10:55.278Z",
      "requested_by": "system",
      "expires_at": "2026-03-31T19:10:55.278Z"
    }
  ]
}
```

### GET /approvals/:id
Get specific approval details with full audit trail.

### POST /approvals/:id/approve
Approve a pending action.

**Request:**
```json
{
  "reviewer_id": "max@law.ai",
  "notes": "Approved after security review"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "approval_id": "approval_1774897855278",
    "execution_id": "exec_1774897855271_vrw5i7kw6",
    "warrant_id": "warrant_1774897900123_abc123",
    "status": "approved",
    "reviewed_by": "max@law.ai"
  }
}
```

### POST /approvals/:id/reject
Reject a pending action.

**Request:**
```json
{
  "reviewer_id": "max@law.ai",
  "reason": "Insufficient justification"
}
```

---

## Warrants

### GET /warrants?limit=50
List issued warrants.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "warrant_id": "warrant_1774897771649_na0rl4zr0",
      "execution_id": "exec_1774897771557_n473bnivz",
      "issued_at": "2026-03-30T19:09:31.649Z"
    }
  ]
}
```

### GET /warrants/:id
Get warrant details with audit trail.

### POST /warrants/verify
Verify warrant cryptographic signature.

**Request:**
```json
{
  "warrant_id": "warrant_1774897771649_na0rl4zr0",
  "signature": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "warrant_id": "warrant_1774897771649_na0rl4zr0",
    "valid": true,
    "expired": false,
    "issued_at": "2026-03-30T19:09:31.649Z",
    "age_minutes": 15,
    "execution_id": "exec_1774897771557_n473bnivz"
  }
}
```

---

## Executions

### GET /executions?limit=50&status=completed&tier=T1
List executions with filtering.

**Query Parameters:**
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset
- `status` - Filter by status
- `tier` - Filter by tier
- `from_date` - Start date (ISO 8601)
- `to_date` - End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "execution_id": "exec_1774897771557_n473bnivz",
      "status": "completed",
      "required_tier": "T0",
      "action_summary": "send_email",
      "has_warrant": true,
      "started_at": "2026-03-30T19:09:31.557Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### GET /executions/:id
Get execution details with full audit trail.

**Response:**
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_1774897771557_n473bnivz",
    "status": "completed",
    "has_warrant": true,
    "approval": null,
    "audit_trail": [
      {
        "event_id": "exec_1774897771557_n473bnivz_intent",
        "event_type": "execution_requested",
        "stage": "intent",
        "event_timestamp": "2026-03-30T19:09:31.557Z",
        "sequence_num": 1
      },
      {
        "event_id": "warrant_1774897771649_na0rl4zr0",
        "event_type": "warrant_issued",
        "stage": "warrant",
        "event_timestamp": "2026-03-30T19:09:31.649Z",
        "sequence_num": 2
      },
      {
        "event_id": "exec_1774897771557_n473bnivz_exec",
        "event_type": "execution_completed",
        "stage": "execution",
        "event_timestamp": "2026-03-30T19:09:31.810Z",
        "sequence_num": 3
      }
    ],
    "started_at": "2026-03-30T19:09:31.557Z",
    "updated_at": "2026-03-30T19:09:31.810Z"
  }
}
```

### GET /executions/stats
Get execution statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_executions": 250,
    "with_warrant": 200,
    "pending_approval": 10,
    "approved": 180,
    "rejected": 20,
    "completed": 190
  }
}
```

---

## Policies

### GET /policies?enabled=true&tier=T1
List policies.

### GET /policies/:id
Get policy details.

### POST /policies
Create new policy.

**Request:**
```json
{
  "name": "Cost Control",
  "description": "Limit spending per action",
  "tier": "T1",
  "rules": {
    "max_cost": 100,
    "requires_approval_above": 50
  },
  "enabled": true,
  "priority": 100
}
```

### PUT /policies/:id
Update policy.

### DELETE /policies/:id
Delete policy.

---

## Agents

### GET /agents?status=active
List registered agents.

### GET /agents/:id
Get agent details with execution stats.

### POST /agents
Register new agent.

**Request:**
```json
{
  "name": "Marketing Agent",
  "type": "autonomous",
  "description": "Email marketing automation",
  "default_tier": "T0",
  "capabilities": ["email", "analytics"],
  "config": {
    "max_emails_per_day": 1000
  }
}
```

### PUT /agents/:id
Update agent.

### DELETE /agents/:id
Delete agent.

---

## Audit Export

### GET /audit/executions?format=json&from_date=2026-03-01
Export execution audit trail.

**Query Parameters:**
- `format` - json or csv (default: json)
- `from_date` - Start date
- `to_date` - End date
- `tier` - Filter by tier

**Response (JSON):**
```json
{
  "success": true,
  "format": "json",
  "count": 1500,
  "data": [...]
}
```

**Response (CSV):** Downloads CSV file

### GET /audit/approvals?format=csv&status=approved
Export approval audit trail.

### GET /audit/warrants?format=json
Export warrant audit trail.

---

## Real-time Events (SSE)

### GET /events
Server-Sent Events stream for real-time updates.

**Event Format:**
```json
{
  "type": "execution_requested",
  "execution_id": "exec_...",
  "stage": "intent",
  "timestamp": "2026-03-30T19:09:31.557Z",
  "approval": {
    "id": "approval_...",
    "tier": "T1",
    "status": "pending"
  }
}
```

**Client Example:**
```javascript
const evtSource = new EventSource('https://console.regulator.ai/api/v1/events');
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New event:', data);
};
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `UNAUTHORIZED` - Missing or invalid token
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `INTERNAL_ERROR` - Server error
- `EXECUTION_ERROR` - Execution failed
- `APPROVAL_ERROR` - Approval operation failed

---

## Rate Limiting

All endpoints are rate-limited:
- Authenticated: 1000 requests/minute
- Unauthenticated: 100 requests/minute

Rate limit headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Webhooks (Coming Soon)

Configure webhooks to receive events:
- Execution completed
- Approval requested
- Warrant issued
- Policy violation

---

**For support:** support@regulator.ai  
**API Status:** https://status.regulator.ai
