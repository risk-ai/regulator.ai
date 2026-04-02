# Vienna OS Adapter Configuration Guide

**Version:** 1.0  
**Last Updated:** April 2026

---

## Overview

Vienna OS adapters enable secure, governed connections to external services and APIs. This guide covers creating, configuring, and managing adapter configurations through the Vienna governance framework.

## Table of Contents

1. [Adapter Types](#adapter-types)
2. [Authentication Modes](#authentication-modes)
3. [Creating Adapter Configs](#creating-adapter-configs)
4. [Security & Encryption](#security--encryption)
5. [Real-World Examples](#real-world-examples)
6. [Credential Rotation](#credential-rotation)
7. [Troubleshooting](#troubleshooting)

---

## Adapter Types

Vienna OS supports several adapter patterns:

- **HTTP/REST APIs** — Connect to external REST services
- **Webhooks** — Receive events from external systems
- **Database Connectors** — Query external databases
- **Message Queues** — Integrate with pub/sub systems
- **Custom Protocols** — Extend with your own adapters

---

## Authentication Modes

### 1. Bearer Token (`bearer`)

Used for OAuth2, JWT tokens, and other bearer authentication.

```json
{
  "auth_mode": "bearer",
  "credentials": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Use cases:** GitHub API, Slack API, OAuth2 services

### 2. API Key Header (`api_key_header`)

Adds an API key to request headers.

```json
{
  "auth_mode": "api_key_header",
  "credentials": {
    "api_key": "ak_live_123456789abcdef",
    "header_name": "X-API-Key"
  }
}
```

**Use cases:** Stripe, SendGrid, most SaaS APIs

### 3. Basic Authentication (`basic`)

HTTP Basic Auth with username/password.

```json
{
  "auth_mode": "basic",
  "credentials": {
    "username": "myuser",
    "password": "mypassword"
  }
}
```

**Use cases:** Legacy APIs, internal services

### 4. HMAC Signing (`hmac`)

Cryptographic request signing for enhanced security.

```json
{
  "auth_mode": "hmac",
  "credentials": {
    "key_id": "my-key-id",
    "secret_key": "supersecret123",
    "algorithm": "sha256"
  }
}
```

**Use cases:** Webhook verification, high-security APIs

---

## Creating Adapter Configs

### API Endpoint

```
POST /api/v1/adapter-configs
```

### Basic Request Structure

```json
{
  "name": "my-service-adapter",
  "description": "Connect to my external service",
  "type": "http",
  "base_url": "https://api.external-service.com",
  "auth_mode": "bearer",
  "credentials": {
    "token": "your-secret-token"
  },
  "headers": {
    "Content-Type": "application/json",
    "User-Agent": "ViennaOS/1.0"
  },
  "timeout_ms": 30000,
  "retry_config": {
    "max_retries": 3,
    "backoff_ms": 1000
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "ac_1234567890",
    "name": "my-service-adapter",
    "type": "http",
    "status": "active",
    "created_at": "2026-04-02T14:30:00Z",
    "credentials_encrypted": true,
    "last_used_at": null
  }
}
```

---

## Security & Encryption

### AES-256-GCM Encryption

Vienna OS encrypts all adapter credentials using **AES-256-GCM** encryption:

1. **Unique Key Per Tenant:** Each tenant has its own encryption key
2. **Initialization Vector (IV):** Random IV for each credential set
3. **Authentication Tag:** Ensures data integrity
4. **Key Rotation:** Automatic key rotation every 90 days

### Storage Security

```
Credential Storage Flow:
1. Raw credentials → AES-256-GCM encryption
2. Encrypted blob → Secure database storage
3. Decryption key → Separate key management service
4. Access logs → Comprehensive audit trail
```

### Access Control

- **Tenant Isolation:** Adapters cannot cross tenant boundaries
- **Role-Based Access:** Create/Read/Update/Delete permissions
- **Audit Logging:** Every credential access is logged
- **TTL Support:** Set expiration times for temporary credentials

---

## Real-World Examples

### Example 1: Slack Webhook Adapter

Connect to Slack for notifications and bot interactions.

```bash
curl -X POST https://console.regulator.ai/api/v1/adapter-configs \
  -H "Authorization: Bearer vos_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "slack-notifications",
    "description": "Send notifications to Slack channels",
    "type": "webhook",
    "base_url": "https://hooks.slack.com/services",
    "auth_mode": "bearer",
    "credentials": {
      "token": "xoxb-your-slack-bot-token"
    },
    "headers": {
      "Content-Type": "application/json"
    },
    "timeout_ms": 15000,
    "retry_config": {
      "max_retries": 2,
      "backoff_ms": 500
    }
  }'
```

**Usage in Intent:**

```json
{
  "action": "http_request",
  "adapter_id": "ac_slack_notifications",
  "payload": {
    "path": "/T1234567890/B0987654321/abcdef123456789",
    "method": "POST",
    "body": {
      "text": "Deployment completed successfully!",
      "channel": "#deployments"
    }
  }
}
```

### Example 2: GitHub API Adapter

Interact with GitHub repositories, issues, and pull requests.

```bash
curl -X POST https://console.regulator.ai/api/v1/adapter-configs \
  -H "Authorization: Bearer vos_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "github-api",
    "description": "GitHub API integration for repository management",
    "type": "http",
    "base_url": "https://api.github.com",
    "auth_mode": "bearer",
    "credentials": {
      "token": "ghp_your_github_personal_access_token"
    },
    "headers": {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "ViennaOS-Agent/1.0"
    },
    "timeout_ms": 30000,
    "retry_config": {
      "max_retries": 3,
      "backoff_ms": 1000
    }
  }'
```

**Usage in Intent:**

```json
{
  "action": "http_request",
  "adapter_id": "ac_github_api",
  "payload": {
    "path": "/repos/myorg/myrepo/issues",
    "method": "POST",
    "body": {
      "title": "Automated issue from Vienna OS",
      "body": "This issue was created by an AI agent through Vienna governance.",
      "labels": ["automation", "vienna-os"]
    }
  }
}
```

### Example 3: Custom REST API Adapter

Connect to your own internal API with API key authentication.

```bash
curl -X POST https://console.regulator.ai/api/v1/adapter-configs \
  -H "Authorization: Bearer vos_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "internal-user-service",
    "description": "Internal user management API",
    "type": "http",
    "base_url": "https://users.internal.company.com/api/v2",
    "auth_mode": "api_key_header",
    "credentials": {
      "api_key": "uk_live_abcdef123456789",
      "header_name": "X-API-Key"
    },
    "headers": {
      "Content-Type": "application/json",
      "X-Service": "vienna-os"
    },
    "timeout_ms": 20000,
    "retry_config": {
      "max_retries": 2,
      "backoff_ms": 2000
    }
  }'
```

**Usage with Policy Restrictions:**

```json
{
  "action": "http_request",
  "adapter_id": "ac_internal_user_service",
  "payload": {
    "path": "/users/search",
    "method": "POST",
    "body": {
      "query": "department:engineering",
      "limit": 50
    }
  }
}
```

---

## Credential Rotation

### Automatic Rotation

Vienna OS supports automatic credential rotation for supported services:

```json
{
  "name": "auto-rotate-github",
  "description": "GitHub with automatic token rotation",
  "type": "http",
  "base_url": "https://api.github.com",
  "auth_mode": "bearer",
  "credentials": {
    "token": "ghp_current_token"
  },
  "rotation_config": {
    "enabled": true,
    "interval_days": 30,
    "webhook_url": "https://your-app.com/webhook/credential-rotated"
  }
}
```

### Manual Rotation

Update credentials through the API:

```bash
curl -X PUT https://console.regulator.ai/api/v1/adapter-configs/ac_1234567890/credentials \
  -H "Authorization: Bearer vos_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "token": "new_rotated_token_here"
    },
    "previous_token_expires_at": "2026-04-15T12:00:00Z"
  }'
```

### Rotation Best Practices

1. **Graceful Transition:** Keep old credentials active during transition
2. **Webhook Notifications:** Get notified when rotation occurs
3. **Test New Credentials:** Validate before fully switching over
4. **Emergency Rotation:** Support for immediate credential replacement

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Problem:** `401 Unauthorized` responses

**Solutions:**
- Verify credential format matches auth_mode
- Check token expiration dates
- Ensure proper header names for API key auth
- Test credentials directly with the target API

```bash
# Test adapter configuration
curl -X POST https://console.regulator.ai/api/v1/adapter-configs/ac_1234567890/test \
  -H "Authorization: Bearer vos_your_api_key"
```

#### 2. Connection Timeouts

**Problem:** Requests hanging or timing out

**Solutions:**
- Increase `timeout_ms` value
- Check network connectivity
- Verify target service availability
- Review retry configuration

```json
{
  "timeout_ms": 60000,
  "retry_config": {
    "max_retries": 5,
    "backoff_ms": 2000,
    "exponential_backoff": true
  }
}
```

#### 3. Rate Limiting

**Problem:** `429 Too Many Requests` responses

**Solutions:**
- Implement request throttling
- Add retry logic with exponential backoff
- Consider request queuing for high-volume scenarios

```json
{
  "rate_limit_config": {
    "requests_per_minute": 60,
    "burst_size": 10,
    "queue_overflow_strategy": "drop_oldest"
  }
}
```

#### 4. SSL/TLS Issues

**Problem:** SSL certificate verification failures

**Solutions:**
- Verify certificate chain
- Update CA certificates
- For internal services, consider certificate pinning

```json
{
  "tls_config": {
    "verify_ssl": true,
    "ca_bundle": "/path/to/custom/ca.pem",
    "client_cert": "/path/to/client.crt",
    "client_key": "/path/to/client.key"
  }
}
```

### Debug Mode

Enable detailed logging for troubleshooting:

```json
{
  "debug_config": {
    "log_requests": true,
    "log_responses": true,
    "log_headers": false,
    "log_body": false
  }
}
```

### Monitoring & Alerts

Set up monitoring for adapter health:

```json
{
  "monitoring_config": {
    "health_check_interval": 300,
    "success_rate_threshold": 0.95,
    "alert_webhook": "https://your-monitoring.com/webhook"
  }
}
```

---

## Need Help?

- **Documentation:** https://docs.regulator.ai
- **Support Email:** support@regulator.ai
- **Discord Community:** https://discord.gg/vienna-os
- **GitHub Issues:** https://github.com/vienna-os/vienna/issues

---

*This guide covers the most common adapter patterns. For advanced configurations or custom adapter development, see the [Vienna OS Adapter SDK Documentation](https://docs.regulator.ai/adapters/sdk).*