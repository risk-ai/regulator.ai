# Governed DevOps Agent — Vienna OS Example

**A production-ready DevOps agent showing Vienna OS governance patterns**

## What it does

Demonstrates real-world DevOps operations with proper governance:

| Operation | Risk Tier | Approval Flow | Example |
|-----------|-----------|---------------|---------|
| Health checks | T0 | Auto-approved | Service status, disk usage, memory |
| Config updates | T1 | Policy-based | Environment variables, feature flags |
| Service restarts | T1 | Policy-based | Rolling restart, graceful shutdown |
| Production deploys | T2 | Human approval | New releases, database migrations |
| Data operations | T2+ | Multi-party | Backups, data deletion, schema changes |

## Prerequisites

1. **Vienna OS running** (see main README.md)
2. **Node.js 20+**
3. **API key configured**

## Quick Start

```bash
# Clone the repository
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai/examples/governed-devops-agent

# Install dependencies 
npm install

# Configure environment
echo "VIENNA_API_URL=http://localhost:3100" > .env
echo "VIENNA_API_KEY=your_key_here" >> .env

# Run the agent
npm start
```

## What you'll see

```
🤖 Governed DevOps Agent starting...
✅ Registered with Vienna OS

━━━ Task: Check service status ━━━
  Action: check_status
  Risk Tier: T0
  Status: auto-approved
  ✅ Approved — Warrant: wrt_abc123
  ⚡ Executing: check_status...
  📋 Execution reported to audit trail

━━━ Task: Deploy to production ━━━
  Action: deploy_code
  Risk Tier: T2
  Status: pending
  ⏳ Awaiting human approval...
  🔗 Approve at: console.regulator.ai
```

## Key concepts

- **Every action goes through Vienna** — even reads
- **Risk tiers determine approval flow** — T0 is instant, T2 needs a human
- **Warrants are scoped and time-limited** — the agent can only do what's approved
- **Everything is audited** — full trail for compliance
