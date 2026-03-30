# Vienna OS API Quick Start

**Version:** 1.0  
**Base URL:** `https://console.regulator.ai/api/v1`  
**Status:** Production

---

## 🚀 **Getting Started**

### **1. Create an Account**

Sign up at: https://console.regulator.ai

### **2. Get Your API Key**

```bash
# Login to get JWT token
curl -X POST https://console.regulator.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your-password"
  }'

# Response includes access token
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "eyJhbGci..."
    },
    "user": { ... }
  }
}
```

### **3. Submit Your First Proposal**

```bash
# Use your access token
curl -X POST https://console.regulator.ai/api/v1/proposals \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "objective": "Read customer database",
    "actions": [
      {
        "type": "database_query",
        "params": {
          "query": "SELECT * FROM customers LIMIT 10"
        }
      }
    ],
    "risk_tier": "T0"
  }'

# Response includes proposal ID and warrant (if auto-approved)
{
  "success": true,
  "data": {
    "proposal_id": "prop_123",
    "status": "approved",
    "warrant": {
      "id": "warrant_456",
      "signature": "...",
      "expires_at": "2026-03-29T21:15:00Z"
    }
  }
}
```

---

## 📚 **Core Endpoints**

### **Authentication**

```bash
# Register
POST /auth/register
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "User Name"
}

# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "secure-password"
}

# Refresh Token
POST /auth/refresh
{
  "refreshToken": "eyJhbGci..."
}
```

### **Proposals**

```bash
# Submit proposal
POST /proposals
{
  "objective": "Description of what you want to do",
  "actions": [
    {
      "type": "action_type",
      "params": { ... }
    }
  ],
  "risk_tier": "T0|T1|T2"
}

# Get proposal status
GET /proposals/:id

# List proposals
GET /proposals?status=pending&limit=10
```

### **Policies**

```bash
# List policies
GET /policies

# Create policy
POST /policies
{
  "name": "Auto-approve reads",
  "conditions": {
    "risk_tier": "T0",
    "action_type": "database_query"
  },
  "action": "approve"
}
```

### **Agents**

```bash
# Register agent
POST /agents
{
  "name": "My Agent",
  "type": "autonomous"
}

# Agent heartbeat
POST /agents/:id/heartbeat

# List agents
GET /agents
```

---

## 🔐 **Authentication Methods**

### **Option 1: JWT Tokens (Recommended)**

```bash
# Include in Authorization header
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Lifetime:**
- Access token: 15 minutes
- Refresh token: 7 days

### **Option 2: API Keys (Machine-to-Machine)**

```bash
# Generate API key in console
# Include in x-api-key header
x-api-key: vos_YOUR_API_KEY
```

---

## 📊 **Risk Tiers**

**T0 (Low Risk)** - Auto-approved
- Read operations
- Query operations
- Status checks

**T1 (Medium Risk)** - Policy evaluation
- Write operations
- Configuration changes
- Resource allocation

**T2 (High Risk)** - Always requires approval
- Delete operations
- Security changes
- Production deployments

**T3 (Critical)** - Blocked by default
- Irreversible operations
- Safety-critical changes

---

## 🎯 **Example: Agent Integration**

```typescript
// TypeScript example
import axios from 'axios';

const VIENNA_API = 'https://console.regulator.ai/api/v1';
const ACCESS_TOKEN = process.env.VIENNA_ACCESS_TOKEN;

async function submitProposal(objective: string, actions: any[]) {
  const response = await axios.post(
    `${VIENNA_API}/proposals`,
    {
      objective,
      actions,
      risk_tier: 'T0'
    },
    {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.success && response.data.data.status === 'approved') {
    const warrant = response.data.data.warrant;
    console.log('Warrant received:', warrant.id);
    
    // Execute action with warrant
    return warrant;
  }
  
  throw new Error('Proposal not approved');
}

// Use it
const warrant = await submitProposal(
  'Read user data',
  [{ type: 'database_query', params: { query: 'SELECT * FROM users LIMIT 1' } }]
);
```

---

## 📖 **Full Documentation**

Coming Week 1:
- [ ] Complete API reference (Swagger/OpenAPI)
- [ ] TypeScript SDK guide
- [ ] Python SDK guide
- [ ] Agent integration examples
- [ ] Policy builder tutorial

---

## 🆘 **Support**

- **Twitter:** [@Vienna_OS](https://twitter.com/Vienna_OS)
- **Slack:** #agent-coordination (for design partners)
- **Email:** support@regulator.ai (coming soon)

---

**Status:** Production (launched 2026-03-29)  
**Last Updated:** 2026-03-29
