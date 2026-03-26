# Vienna OS API Reference

**Version:** 8.0.0  
**Base URL:** `https://console.regulator.ai/api/v1` (production) or `http://localhost:3100/api/v1` (local)  
**Authentication:** Session-based (cookie)  
**Rate Limits:**
- General: 100 requests / 15 minutes
- Auth: 5 requests / 15 minutes
- Agent intents: 1000 requests / 15 minutes

---

## Table of Contents

1. [Authentication](#authentication)
2. [Intent Submission](#intent-submission)
3. [Policy Management](#policy-management)
4. [Agent Fleet](#agent-fleet)
5. [Custom Actions](#custom-actions)
6. [Executions](#executions)
7. [Investigations](#investigations)
8. [System Status](#system-status)

---

## Authentication

### POST /api/v1/auth/login

**Description:** Create authenticated session

**Request Body:**
```json
{
  "username": "operator@company.com",
  "password": "secure_password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "operator": {
      "id": "op_abc123",
      "username": "operator@company.com",
      "name": "Jane Operator",
      "role": "operator",
      "tenant_id": "tenant_xyz"
    },
    "session": {
      "id": "sess_def456",
      "expires_at": "2026-03-27T11:24:00Z"
    }
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

**Rate Limit:** 5 requests / 15 minutes

---

### POST /api/v1/auth/logout

**Description:** End authenticated session

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### GET /api/v1/auth/session

**Description:** Check current session status

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "operator": {
      "id": "op_abc123",
      "username": "operator@company.com",
      "name": "Jane Operator",
      "role": "operator",
      "tenant_id": "tenant_xyz"
    }
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "data": {
    "authenticated": false
  }
}
```

---

## Intent Submission

### POST /api/v1/intent

**Description:** Submit governed intent for execution

**Authentication:** Required

**Request Body:**
```json
{
  "action": "check_system_health",
  "description": "Verify all services operational before deployment",
  "parameters": {
    "services": ["api", "database", "queue"]
  },
  "simulation": false,
  "source": "web",
  "metadata": {
    "operator_id": "op_abc123",
    "session_id": "sess_def456",
    "ip_address": "10.0.1.50"
  }
}
```

**Request Fields:**
- `action` (string, required) — Action type (must be registered)
- `description` (string, required) — Human-readable intent description
- `parameters` (object, optional) — Action-specific parameters
- `simulation` (boolean, optional) — If true, no side effects (dry-run)
- `source` (string, optional) — Intent source (`web`, `api`, `openclaw`, `try`)
- `metadata` (object, optional) — Additional context for audit trail

**Response (200 OK — Executed):**
```json
{
  "success": true,
  "data": {
    "result": {
      "execution_id": "exec_ghi789",
      "tenant_id": "tenant_xyz",
      "action": "check_system_health",
      "status": "success",
      "result": {
        "services_checked": 3,
        "all_healthy": true,
        "details": [
          {"service": "api", "status": "healthy", "latency_ms": 45},
          {"service": "database", "status": "healthy", "connections": 12},
          {"service": "queue", "status": "healthy", "depth": 3}
        ]
      },
      "timestamp": "2026-03-26T15:30:00Z",
      "duration_ms": 523
    },
    "explanation": "Performed health check on 3 services. All systems operational.",
    "cost": 0.001,
    "attestation": {
      "attestation_id": "att_jkl012",
      "status": "success",
      "attested_at": "2026-03-26T15:30:00Z"
    }
  }
}
```

**Response (200 OK — Simulated):**
```json
{
  "success": true,
  "data": {
    "result": {
      "execution_id": null,
      "tenant_id": "tenant_xyz",
      "action": "check_system_health",
      "status": "simulated",
      "result": {
        "message": "Simulation: Would check 3 services"
      },
      "timestamp": "2026-03-26T15:30:00Z",
      "duration_ms": 12
    },
    "explanation": "Simulation: Would perform health check on 3 services.",
    "cost": null,
    "attestation": null
  }
}
```

**Response (403 Forbidden — Quota Exceeded):**
```json
{
  "success": false,
  "error": "Insufficient quota",
  "details": {
    "tenant_id": "tenant_xyz",
    "quota_available": -5,
    "quota_used": 105,
    "quota_limit": 100
  }
}
```

**Response (403 Forbidden — Policy Block):**
```json
{
  "success": false,
  "error": "Blocked by policy",
  "details": {
    "policy_id": "pol_mno345",
    "policy_name": "Block production restarts during trading hours",
    "reason": "Condition matched: time_window AND action == restart_service"
  }
}
```

**Response (400 Bad Request — Invalid Action):**
```json
{
  "success": false,
  "error": "Unknown action",
  "details": {
    "action": "unknown_action",
    "allowed_actions": ["check_system_health", "restart_service", ...]
  }
}
```

**Rate Limit:** 100 requests / 15 minutes

---

### POST /api/v1/agent/intent

**Description:** Submit governed intent from external agent (e.g., OpenClaw)

**Authentication:** Required (agent API key or session)

**Request Body:**
```json
{
  "action": "check_health",
  "description": "Automated health check from monitoring agent",
  "parameters": {},
  "simulation": false,
  "source": "openclaw",
  "metadata": {
    "agent_id": "agent_monitoring",
    "hostname": "mon-01.company.com"
  }
}
```

**Response:** Same as `/api/v1/intent`

**Rate Limit:** 1000 requests / 15 minutes

---

## Policy Management

### GET /api/v1/policies

**Description:** List all governance policies

**Authentication:** Required

**Query Parameters:**
- `tenant_id` (string, optional) — Filter by tenant
- `status` (string, optional) — Filter by status (`active`, `inactive`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "policies": [
      {
        "id": "pol_abc123",
        "tenant_id": "tenant_xyz",
        "name": "Block trading restarts during market hours",
        "description": "Prevent service restarts on trading-critical systems during active trading",
        "conditions": [
          {"field": "action", "operator": "==", "value": "restart_service"},
          {"field": "target", "operator": "in", "value": ["kalshi-api", "nba-data-feed"]},
          {"field": "time_window", "operator": "in", "value": ["09:30-16:00"]}
        ],
        "action": "block",
        "notification": {
          "channels": ["slack"],
          "message": "Attempted restart of trading service during market hours"
        },
        "created_at": "2026-03-20T10:00:00Z",
        "updated_at": "2026-03-25T14:30:00Z",
        "status": "active"
      }
    ],
    "total": 15,
    "page": 1,
    "per_page": 20
  }
}
```

---

### POST /api/v1/policies

**Description:** Create new governance policy

**Authentication:** Required (role: operator or admin)

**Request Body:**
```json
{
  "name": "Rate limit data exports",
  "description": "Prevent more than 5 data exports per hour per tenant",
  "conditions": [
    {"field": "action", "operator": "==", "value": "export_data"},
    {"field": "rate_limit", "operator": ">", "value": 5}
  ],
  "action": "block",
  "notification": {
    "channels": ["email"],
    "recipients": ["compliance@company.com"]
  }
}
```

**Supported Operators:**
- `==` — Equals
- `!=` — Not equals
- `>` — Greater than
- `<` — Less than
- `>=` — Greater than or equal
- `<=` — Less than or equal
- `contains` — String contains substring
- `starts_with` — String starts with prefix
- `ends_with` — String ends with suffix
- `in` — Value in list
- `not_in` — Value not in list

**Supported Actions:**
- `block` — Prevent execution
- `approve` — Allow execution
- `notify` — Allow but send notification
- `require_approval` — Pause for operator review

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "policy": {
      "id": "pol_new789",
      "tenant_id": "tenant_xyz",
      "name": "Rate limit data exports",
      "status": "active",
      "created_at": "2026-03-26T15:45:00Z"
    }
  }
}
```

---

### POST /api/v1/policies/:id/test

**Description:** Test policy against sample intent (dry-run)

**Authentication:** Required

**Request Body:**
```json
{
  "intent": {
    "action": "export_data",
    "parameters": {"format": "csv", "rows": 10000},
    "metadata": {"timestamp": "2026-03-26T15:50:00Z"}
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "matched": true,
    "policy": {
      "id": "pol_new789",
      "name": "Rate limit data exports"
    },
    "action": "block",
    "reason": "Rate limit exceeded: 6 exports in past hour (limit: 5)"
  }
}
```

---

## Agent Fleet

### GET /api/v1/fleet

**Description:** Get agent fleet overview and statistics

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_agents": 12,
      "active_agents": 8,
      "inactive_agents": 4,
      "total_executions_24h": 1543,
      "success_rate_24h": 0.987,
      "avg_latency_ms": 342
    },
    "agents": [
      {
        "agent_id": "agent_monitoring",
        "tenant_id": "tenant_xyz",
        "last_seen": "2026-03-26T15:50:00Z",
        "total_executions": 523,
        "success_rate": 0.995,
        "avg_latency_ms": 120,
        "status": "active"
      }
    ]
  }
}
```

---

### GET /api/v1/fleet/agents/:agent_id

**Description:** Get detailed agent information

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "agent": {
      "agent_id": "agent_monitoring",
      "tenant_id": "tenant_xyz",
      "first_seen": "2026-03-20T10:00:00Z",
      "last_seen": "2026-03-26T15:50:00Z",
      "total_executions": 523,
      "success_rate": 0.995,
      "failure_rate": 0.005,
      "avg_latency_ms": 120,
      "status": "active",
      "metadata": {
        "hostname": "mon-01.company.com",
        "version": "1.2.3"
      }
    },
    "recent_executions": [
      {
        "execution_id": "exec_xyz123",
        "action": "check_health",
        "status": "success",
        "timestamp": "2026-03-26T15:50:00Z",
        "duration_ms": 118
      }
    ]
  }
}
```

---

## Custom Actions

### GET /api/v1/actions

**Description:** List all registered actions

**Authentication:** Required

**Query Parameters:**
- `tenant_id` (string, optional) — Filter by tenant
- `status` (string, optional) — Filter by status (`active`, `inactive`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "actions": [
      {
        "id": "act_abc123",
        "tenant_id": "tenant_xyz",
        "action_type": "custom_health_check",
        "name": "Custom Health Check",
        "description": "Check health of custom internal services",
        "parameters_schema": {
          "type": "object",
          "properties": {
            "services": {
              "type": "array",
              "items": {"type": "string"}
            }
          },
          "required": ["services"]
        },
        "risk_tier": "T0",
        "created_at": "2026-03-25T10:00:00Z",
        "status": "active"
      }
    ],
    "total": 8
  }
}
```

---

### POST /api/v1/actions

**Description:** Register new custom action

**Authentication:** Required (role: admin)

**Request Body:**
```json
{
  "action_type": "backup_database",
  "name": "Backup Database",
  "description": "Create full database backup to S3",
  "parameters_schema": {
    "type": "object",
    "properties": {
      "bucket": {"type": "string"},
      "retention_days": {"type": "number", "minimum": 1, "maximum": 90}
    },
    "required": ["bucket"]
  },
  "risk_tier": "T1"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "action": {
      "id": "act_new456",
      "tenant_id": "tenant_xyz",
      "action_type": "backup_database",
      "status": "active",
      "created_at": "2026-03-26T16:00:00Z"
    }
  }
}
```

---

## Executions

### GET /api/v1/executions

**Description:** List execution history

**Authentication:** Required

**Query Parameters:**
- `tenant_id` (string, optional) — Filter by tenant
- `status` (string, optional) — Filter by status (`success`, `failure`, `blocked`, `pending`)
- `action` (string, optional) — Filter by action type
- `since` (ISO 8601, optional) — Start timestamp
- `until` (ISO 8601, optional) — End timestamp
- `limit` (number, optional) — Max results (default: 50, max: 500)
- `offset` (number, optional) — Pagination offset

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "execution_id": "exec_abc123",
        "tenant_id": "tenant_xyz",
        "action": "check_system_health",
        "status": "success",
        "agent_id": "agent_monitoring",
        "timestamp": "2026-03-26T15:30:00Z",
        "duration_ms": 523,
        "cost": 0.001
      }
    ],
    "total": 1543,
    "page": 1,
    "per_page": 50
  }
}
```

---

### GET /api/v1/executions/:execution_id

**Description:** Get detailed execution information

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "execution": {
      "execution_id": "exec_abc123",
      "tenant_id": "tenant_xyz",
      "action": "check_system_health",
      "description": "Automated health check from monitoring agent",
      "status": "success",
      "agent_id": "agent_monitoring",
      "timestamp": "2026-03-26T15:30:00Z",
      "duration_ms": 523,
      "cost": 0.001,
      "parameters": {
        "services": ["api", "database", "queue"]
      },
      "result": {
        "services_checked": 3,
        "all_healthy": true,
        "details": [...]
      },
      "attestation": {
        "attestation_id": "att_def456",
        "status": "success",
        "attested_at": "2026-03-26T15:30:00Z"
      },
      "metadata": {
        "hostname": "mon-01.company.com",
        "version": "1.2.3"
      }
    },
    "ledger_events": [
      {
        "event_type": "intent_received",
        "timestamp": "2026-03-26T15:30:00.100Z"
      },
      {
        "event_type": "policy_evaluated",
        "timestamp": "2026-03-26T15:30:00.250Z",
        "details": {"policies_evaluated": 3, "outcome": "allow"}
      },
      {
        "event_type": "execution_started",
        "timestamp": "2026-03-26T15:30:00.300Z"
      },
      {
        "event_type": "execution_completed",
        "timestamp": "2026-03-26T15:30:00.823Z"
      },
      {
        "event_type": "attestation_created",
        "timestamp": "2026-03-26T15:30:00.850Z"
      }
    ]
  }
}
```

---

## Investigations

### GET /api/v1/investigations

**Description:** List active investigations

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "investigations": [
      {
        "id": "inv_abc123",
        "tenant_id": "tenant_xyz",
        "title": "Excessive API failures on 2026-03-25",
        "status": "open",
        "created_at": "2026-03-25T16:00:00Z",
        "created_by": "op_xyz789",
        "executions_linked": 45,
        "artifacts_count": 12
      }
    ]
  }
}
```

---

### POST /api/v1/investigations

**Description:** Create new investigation

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Database latency spike investigation",
  "description": "Investigating 2x increase in query latency starting 2026-03-26 14:00",
  "execution_ids": ["exec_abc123", "exec_def456"],
  "tags": ["database", "performance", "p1"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "investigation": {
      "id": "inv_new789",
      "tenant_id": "tenant_xyz",
      "title": "Database latency spike investigation",
      "status": "open",
      "created_at": "2026-03-26T16:10:00Z"
    }
  }
}
```

---

## System Status

### GET /health

**Description:** System health check (unauthenticated)

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-26T16:15:00Z",
  "version": "8.0.0",
  "uptime_seconds": 3456789
}
```

---

### GET /api/v1/system/status

**Description:** Detailed system status (authenticated)

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "system": {
      "status": "operational",
      "version": "8.0.0",
      "environment": "production",
      "uptime_seconds": 3456789
    },
    "services": {
      "state_graph": {"status": "healthy", "latency_ms": 12},
      "policy_engine": {"status": "healthy", "policies_active": 15},
      "executor": {"status": "healthy", "queue_depth": 3}
    },
    "providers": {
      "anthropic": {"status": "healthy", "model": "claude-sonnet-4-5"},
      "local_ollama": {"status": "healthy", "model": "qwen2.5:0.5b"}
    }
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common HTTP Status Codes

- `200 OK` — Request succeeded
- `201 Created` — Resource created
- `400 Bad Request` — Invalid request format or parameters
- `401 Unauthorized` — Authentication required or invalid
- `403 Forbidden` — Insufficient permissions or policy block
- `404 Not Found` — Resource does not exist
- `429 Too Many Requests` — Rate limit exceeded
- `500 Internal Server Error` — Server error (contact support)

---

## Rate Limiting

**Headers (all responses):**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1711462800
```

**Rate limit exceeded response (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retry_after_seconds": 300
}
```

---

## Webhooks (Coming Soon)

Vienna OS will support webhooks for real-time event notifications:
- Execution completed
- Policy violation detected
- Agent status changed
- Quota threshold reached

**Documentation:** See `docs/WEBHOOKS.md` (when available)

---

## SDK Support

**Official SDKs:**
- Node.js: `@vienna/sdk` (TypeScript support)
- Python: `vienna-sdk` (planned)
- Go: `vienna-go` (planned)

**Installation:**
```bash
npm install @vienna/sdk
```

**Usage:**
```typescript
import { ViennaClient } from '@vienna/sdk';

const client = new ViennaClient({
  baseUrl: 'https://console.regulator.ai/api/v1',
  apiKey: process.env.VIENNA_API_KEY
});

const result = await client.submitIntent({
  action: 'check_system_health',
  description: 'Automated health check',
  parameters: { services: ['api', 'database'] }
});

console.log(result.status); // 'success'
```

---

## Support

**Documentation:** https://docs.regulator.ai  
**GitHub:** https://github.com/risk-ai/vienna-os  
**Discord:** https://discord.gg/vienna-os  
**Email:** support@regulator.ai

---

**Last Updated:** 2026-03-26  
**API Version:** 8.0.0
