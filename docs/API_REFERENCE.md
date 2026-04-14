# Vienna OS API Reference

**Base URL:** `https://console.regulator.ai/api/v1`  
**Authentication:** JWT Bearer token (obtained via `/api/v1/auth/login`)

---

## Authentication

### POST /auth/login
Login with email/password

**Request:**
```json
{
  "email": "user@company.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_123",
    "email": "user@company.com",
    "name": "John Doe",
    "tenant_id": "tenant_abc"
  }
}
```

### POST /auth/refresh
Refresh expired JWT token

### POST /auth/logout
Invalidate current session

---

## Governance

### POST /agent/intent
Submit agent intent for governance evaluation

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "agent_id": "agent_marketing_bot",
  "action_type": "send_email",
  "payload": {
    "to": "customer@example.com",
    "subject": "Welcome",
    "body": "Thank you for signing up"
  }
}
```

**Response:**
```json
{
  "success": true,
  "intent_id": "int_xyz789",
  "status": "approved",
  "risk_tier": "T0",
  "warrant": {
    "id": "war_abc123",
    "signature": "0x1234...",
    "expires_at": "2026-04-14T20:00:00Z"
  }
}
```

### GET /governance
Get governance overview with chain stats

**Query Parameters:**
- `range` (optional): `24h`, `7d`, `30d` (default: `24h`)

**Response:**
```json
{
  "success": true,
  "data": {
    "chainStats": {
      "total_intents": "1247",
      "completed_chains": "1189",
      "rejected_chains": "32",
      "pending_chains": "26"
    },
    "recentChains": [...],
    "policyViolations": [...],
    "warrantStatus": [...],
    "escalationPaths": [...]
  }
}
```

### GET /governance/chain/:id
Get full governance chain for intent/warrant/execution

**Parameters:**
- `id`: Intent ID, Warrant ID, or Execution ID
- `type` (optional): `intent`, `warrant`, `execution`, `auto`

---

## Fleet Management

### GET /fleet/agents
List all agents in fleet

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "agent_id": "marketing_bot",
      "display_name": "Marketing Bot",
      "trust_score": 87,
      "status": "active",
      "last_heartbeat": "2026-04-14T19:00:00Z"
    }
  ]
}
```

### GET /fleet/summary
Get fleet metrics and statistics

### GET /fleet/health
Get agent health matrix

### POST /fleet/agents/:id/suspend
Suspend an agent

### POST /fleet/agents/:id/activate
Activate a suspended agent

---

## Policies

### GET /policies
List policy rules

**Query Parameters:**
- `enabled` (optional): `true`, `false`
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pol_123",
      "name": "Financial Transaction Policy",
      "description": "Require approval for charges > $1000",
      "conditions": {
        "action_types": ["charge_card"],
        "min_amount": 1000
      },
      "actions": {
        "action": "require_approval",
        "risk_tier": "T2"
      },
      "enabled": true,
      "priority": 100
    }
  ]
}
```

### POST /policies
Create new policy rule

### PATCH /policies/:id
Update policy rule

### DELETE /policies/:id
Delete policy rule

---

## Approvals

### GET /approvals/pending
Get pending approval requests

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "approval_id": "apr_456",
      "intent_id": "int_789",
      "agent_id": "finance_agent",
      "action_type": "charge_card",
      "risk_tier": "T2",
      "status": "pending",
      "required_approvers": 2,
      "current_approvers": 0,
      "created_at": "2026-04-14T18:30:00Z",
      "expires_at": "2026-04-14T20:30:00Z"
    }
  ]
}
```

### POST /approvals/:id/approve
Approve a pending request

### POST /approvals/:id/deny
Deny a pending request

**Request:**
```json
{
  "reason": "Budget exceeded for this month"
}
```

---

## Analytics

### GET /analytics/metrics
Get system-wide analytics

**Query Parameters:**
- `range`: `7d`, `30d`, `90d` (default: `30d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_proposals": 4523,
    "approval_rate": 0.94,
    "avg_approval_time_seconds": 145,
    "top_agents": [
      {"agent_id": "marketing_bot", "count": 1247}
    ],
    "proposals_by_tier": {
      "T0": 3891,
      "T1": 512,
      "T2": 98,
      "T3": 22
    }
  }
}
```

### GET /analytics/risk-heatmap
Get risk heatmap (agent × tier action counts)

**Query Parameters:**
- `range`: `7d`, `30d`, `90d`

---

## Team Management

### GET /team/members
List organization members

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mem_123",
      "user_id": "usr_456",
      "email": "admin@company.com",
      "name": "Alice Admin",
      "role": "admin",
      "status": "active",
      "invited_at": "2026-03-01T00:00:00Z",
      "last_login": "2026-04-14T18:00:00Z"
    }
  ]
}
```

### POST /team/invite
Invite new team member (admin only)

**Request:**
```json
{
  "email": "newuser@company.com",
  "role": "operator"
}
```

### PATCH /team/members/:id/role
Update member role (admin only)

### DELETE /team/members/:id
Remove team member (admin only)

---

## Integrations

### GET /integrations
List configured integrations

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "int_slack_001",
      "type": "slack",
      "name": "Slack Approvals Channel",
      "enabled": true,
      "config": {
        "webhook_url": "https://hooks.slack.com/...***4a2b",
        "channel": "#governance"
      },
      "event_filters": ["approval_required", "approval_resolved"]
    }
  ]
}
```

### POST /integrations
Create new integration

**Request:**
```json
{
  "type": "slack",
  "name": "Slack Approvals",
  "config": {
    "webhook_url": "https://hooks.slack.com/services/...",
    "channel": "#governance"
  },
  "event_filters": ["approval_required"]
}
```

### POST /integrations/:id/toggle
Enable/disable integration

### POST /integrations/:id/test
Send test notification

### DELETE /integrations/:id
Delete integration

---

## Simulation

### POST /simulation/run
Test proposal against policies (dry-run)

**Request:**
```json
{
  "agent_id": "marketing_bot",
  "action_type": "send_email",
  "payload": {
    "to": "test@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "policy_evaluations": [
      {
        "policy_id": "pol_123",
        "policy_name": "Email Policy",
        "result": "allow",
        "conditions_matched": ["action_type"],
        "risk_tier": "T0"
      }
    ],
    "final_decision": "auto_approve",
    "risk_tier": "T0",
    "warnings": []
  }
}
```

---

## Usage Metrics

### GET /usage/metrics
Get usage statistics for current billing period

**Query Parameters:**
- `range`: `7d`, `30d`, `90d`

**Response:**
```json
{
  "success": true,
  "data": {
    "proposals_today": 127,
    "proposals_this_month": 4523,
    "warrants_issued_today": 89,
    "api_calls_today": 635,
    "agents_active": 8,
    "plan_limits": {
      "proposals_per_month": 10000,
      "agents_max": 10
    },
    "trend_data": [
      {"date": "2026-04-01", "proposals": 142, "warrants": 95, "api_calls": 710}
    ]
  }
}
```

---

## Health & Status

### GET /health
Health check (unauthenticated)

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-04-14T19:30:00Z",
  "uptime_seconds": 345600
}
```

---

## Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Admin role required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Not found",
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limits

- **API endpoints:** 5000 requests per 15 minutes per tenant
- **Auth endpoints:** 50 requests per 15 minutes per IP

**Headers:**
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4987
X-RateLimit-Reset: 1712775600
```

---

## SDKs

**Python:**
```bash
pip install vienna-os
```

**Node.js:**
```bash
npm install vienna-os
```

**Documentation:** https://regulator.ai/sdk
