# Governed DevOps Agent — Vienna OS Example

A simple DevOps agent that demonstrates Vienna OS governance in action.

## What it does

Runs 4 simulated DevOps tasks through the Vienna governance pipeline:

| Task | Risk Tier | Expected Result |
|------|-----------|-----------------|
| Check service status | T0 | Auto-approved |
| Deploy to production | T2 | Requires human approval |
| Restart worker | T1 | Policy auto-approved |
| Delete old logs | T1 | Policy auto-approved |

## Run it

```bash
# Install SDK
npm install @vienna-os/sdk

# Run with your API key
VIENNA_API_KEY=vos_your_key node agent.js

# Or against local instance
VIENNA_API_URL=http://localhost:3100 VIENNA_API_KEY=vos_dev node agent.js
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
