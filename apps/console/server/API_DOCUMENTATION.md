# Vienna OS API Documentation

**Version:** 1.0.0  
**Base URL:** `https://console.regulator.ai/api/v1`  
**Authentication:** JWT Bearer Token or API Key

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Resources](#core-resources)
3. [Governance](#governance)
4. [Execution](#execution)
5. [Monitoring](#monitoring)
6. [Error Handling](#error-handling)
7. [Rate Limits](#rate-limits)
8. [Examples](#examples)

---

## Authentication

### JWT Authentication

All API requests require authentication via JWT token in the `Authorization` header.

**Header:**
```
Authorization: Bearer <jwt_token>
```

### API Key Authentication

Alternative authentication via API key:

**Header:**
```
X-API-Key: <api_key>
```

### Obtain JWT Token

**POST** `/api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "refresh_token_here"
    },
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "name": "John Doe",
      "tenantId": "tenant_abc"
    }
  }
}
```

### Refresh Token

**POST** `/api/v1/auth/refresh`

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

---

## Core Resources

### Agents

#### List Agents

**GET** `/api/v1/agents`

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `idle`, `suspended`)
- `limit` (optional): Number of results (default: 50, max: 200)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "agent_123",
      "agent_id": "legal-research-agent",
      "display_name": "Legal Research Agent",
      "status": "active",
      "tenant_id": "tenant_abc",
      "trust_score": 95,
      "last_seen": "2026-03-29T21:00:00Z",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

#### Get Agent Details

**GET** `/api/v1/agents/:agent_id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agent_123",
    "agent_id": "legal-research-agent",
    "display_name": "Legal Research Agent",
    "description": "Researches legal precedents",
    "status": "active",
    "tenant_id": "tenant_abc",
    "trust_score": 95,
    "capabilities": ["research", "analysis"],
    "config": {},
    "last_seen": "2026-03-29T21:00:00Z",
    "created_at": "2026-03-01T10:00:00Z"
  }
}
```

#### Register Agent

**POST** `/api/v1/agents/register`

**Request:**
```json
{
  "agent_id": "my-custom-agent",
  "display_name": "My Custom Agent",
  "description": "Agent description",
  "capabilities": ["action1", "action2"],
  "config": {
    "max_retries": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agent_124",
    "agent_id": "my-custom-agent",
    "api_key": "ak_secret_key_here",
    "created_at": "2026-03-29T21:10:00Z"
  }
}
```

---

### Policies

#### List Policies

**GET** `/api/v1/policies`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "policy_123",
      "name": "Financial Transaction Review",
      "description": "Requires approval for transactions > $10k",
      "enabled": true,
      "priority": 100,
      "rules": [
        {
          "condition": "amount > 10000",
          "action": "require_approval"
        }
      ],
      "tenant_id": "tenant_abc",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

#### Create Policy

**POST** `/api/v1/policies`

**Request:**
```json
{
  "name": "High-Risk Action Policy",
  "description": "Requires approval for high-risk actions",
  "enabled": true,
  "priority": 200,
  "rules": [
    {
      "condition": "risk_tier >= 3",
      "action": "require_approval",
      "approvers": ["user_123"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "policy_124",
    "name": "High-Risk Action Policy",
    "created_at": "2026-03-29T21:10:00Z"
  }
}
```

#### Update Policy

**PUT** `/api/v1/policies/:policy_id`

**Request:** Same as Create Policy

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "policy_124",
    "updated_at": "2026-03-29T21:15:00Z"
  }
}
```

#### Delete Policy

**DELETE** `/api/v1/policies/:policy_id`

**Response:**
```json
{
  "success": true,
  "message": "Policy deleted successfully"
}
```

---

## Governance

### Approval Requests

#### List Approval Requests

**GET** `/api/v1/approvals`

**Query Parameters:**
- `status` (optional): `pending`, `approved`, `denied`, `expired`
- `agent_id` (optional): Filter by agent
- `limit` (optional): Default 50, max 200

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "approval_123",
      "execution_id": "exec_456",
      "plan_id": "plan_789",
      "step_index": 2,
      "action_type": "send_email",
      "context": {
        "to": "customer@example.com",
        "subject": "Order Confirmation"
      },
      "status": "pending",
      "requested_at": "2026-03-29T20:00:00Z",
      "expires_at": "2026-03-29T22:00:00Z",
      "approvers": ["user_123"],
      "tenant_id": "tenant_abc"
    }
  ]
}
```

#### Approve Request

**POST** `/api/v1/approvals/:approval_id/approve`

**Request:**
```json
{
  "comment": "Approved after review"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "approval_123",
    "status": "approved",
    "approved_at": "2026-03-29T21:10:00Z",
    "approved_by": "user_123"
  }
}
```

#### Deny Request

**POST** `/api/v1/approvals/:approval_id/deny`

**Request:**
```json
{
  "reason": "Policy violation detected"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "approval_123",
    "status": "denied",
    "denied_at": "2026-03-29T21:10:00Z",
    "denied_by": "user_123"
  }
}
```

---

## Execution

### Executions

#### List Executions

**GET** `/api/v1/executions`

**Query Parameters:**
- `status` (optional): `pending`, `running`, `completed`, `failed`
- `agent_id` (optional): Filter by agent
- `limit` (optional): Default 50
- `offset` (optional): Pagination

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "execution_id": "exec_123",
      "objective": "Process customer order",
      "status": "completed",
      "agent_id": "order-processor",
      "started_at": "2026-03-29T20:00:00Z",
      "completed_at": "2026-03-29T20:05:00Z",
      "duration_ms": 300000,
      "outcome": "success",
      "tenant_id": "tenant_abc"
    }
  ]
}
```

#### Get Execution Details

**GET** `/api/v1/executions/:execution_id`

**Response:**
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_123",
    "objective": "Process customer order",
    "status": "completed",
    "agent_id": "order-processor",
    "plan": {
      "steps": [
        {
          "action": "validate_order",
          "status": "completed"
        },
        {
          "action": "charge_payment",
          "status": "completed"
        }
      ]
    },
    "events": [
      {
        "timestamp": "2026-03-29T20:00:00Z",
        "event_type": "execution_started",
        "data": {}
      }
    ],
    "outcome": {
      "success": true,
      "result": "Order #1234 processed"
    }
  }
}
```

---

## Monitoring

### Fleet Dashboard

**GET** `/api/v1/fleet`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAgents": 25,
    "activeAgents": 20,
    "idleAgents": 4,
    "suspendedAgents": 1,
    "actionsToday": 1250,
    "actionsThisHour": 87,
    "avgLatencyMs": 45,
    "unresolvedAlerts": 3,
    "topAgents": [
      {
        "agent_id": "legal-research",
        "count": 450
      }
    ]
  }
}
```

### Agent Activity

**GET** `/api/v1/fleet/agents/:agent_id/activity`

**Query Parameters:**
- `hours` (optional): Hours of history (default: 24)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-03-29T20:00:00Z",
      "action_type": "research",
      "result": "completed",
      "duration_ms": 1200,
      "execution_id": "exec_123"
    }
  ]
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Example Error Response

```json
{
  "success": false,
  "error": "Agent not found",
  "code": "NOT_FOUND",
  "details": {
    "agent_id": "nonexistent-agent"
  }
}
```

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| Agent Actions | 1000 requests | 15 minutes |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1711750800
```

**Rate Limit Exceeded:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 300
}
```

---

## Examples

### Complete Workflow: Register Agent & Execute Action

#### 1. Authenticate

```bash
curl -X POST https://console.regulator.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

**Save the `accessToken` from response.**

#### 2. Register Agent

```bash
curl -X POST https://console.regulator.ai/api/v1/agents/register \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-agent",
    "display_name": "My Agent",
    "description": "Does useful things",
    "capabilities": ["email", "research"]
  }'
```

**Save the `api_key` from response.**

#### 3. Create Policy

```bash
curl -X POST https://console.regulator.ai/api/v1/policies \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Approval Policy",
    "description": "Requires approval for all emails",
    "enabled": true,
    "priority": 100,
    "rules": [{
      "condition": "action_type == \"send_email\"",
      "action": "require_approval"
    }]
  }'
```

#### 4. Execute Action (as Agent)

```bash
curl -X POST https://console.regulator.ai/api/v1/actions/execute \
  -H "X-API-Key: <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "send_email",
    "context": {
      "to": "customer@example.com",
      "subject": "Hello",
      "body": "This is a test"
    }
  }'
```

**Response (if approval required):**
```json
{
  "success": false,
  "error": "Approval required",
  "code": "APPROVAL_REQUIRED",
  "approval_id": "approval_123"
}
```

#### 5. Approve Request (as Human)

```bash
curl -X POST https://console.regulator.ai/api/v1/approvals/approval_123/approve \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Looks good, approved"
  }'
```

#### 6. List Executions

```bash
curl -X GET "https://console.regulator.ai/api/v1/executions?limit=10" \
  -H "Authorization: Bearer <access_token>"
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_URL = 'https://console.regulator.ai/api/v1';
const TOKEN = 'your_jwt_token';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// List agents
const agents = await client.get('/agents');
console.log(agents.data);

// Create policy
const policy = await client.post('/policies', {
  name: 'My Policy',
  rules: [/* rules */]
});

// Approve request
await client.post(`/approvals/${approvalId}/approve`, {
  comment: 'Approved'
});
```

### Python

```python
import requests

API_URL = "https://console.regulator.ai/api/v1"
TOKEN = "your_jwt_token"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# List agents
response = requests.get(f"{API_URL}/agents", headers=headers)
agents = response.json()
print(agents)

# Create policy
policy_data = {
    "name": "My Policy",
    "rules": [...]
}
response = requests.post(f"{API_URL}/policies", json=policy_data, headers=headers)
policy = response.json()

# Approve request
approval_id = "approval_123"
response = requests.post(
    f"{API_URL}/approvals/{approval_id}/approve",
    json={"comment": "Approved"},
    headers=headers
)
```

---

## Webhooks (Coming Soon)

Subscribe to events:
- `agent.registered`
- `execution.started`
- `execution.completed`
- `approval.requested`
- `policy.violated`

---

## Support

**Documentation:** https://docs.regulator.ai  
**API Status:** https://status.regulator.ai  
**Support:** support@regulator.ai  
**GitHub:** https://github.com/vienna-os

---

**Last Updated:** 2026-03-29  
**API Version:** 1.0.0
