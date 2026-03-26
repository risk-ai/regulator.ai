# Vienna OS × OpenClaw Integration Guide

> Govern your OpenClaw AI agents with cryptographic warrants, risk-tiered approval workflows, and immutable audit trails.

## Overview

Vienna OS sits between your OpenClaw agents and tool execution. Every tool call flows through the governance pipeline:

```
Agent → Tool Call → Vienna Plugin → Policy Check → Approval → Warrant → Execute → Verify → Audit
```

**Three modes:**
- **`enforce`** — Block T2/T3 actions until approved (production)
- **`audit`** — Log everything, block nothing (monitoring)
- **`dry-run`** — Classify risk, no API calls (testing)

## Quick Start

### 1. Install

```bash
npm install @vienna-os/sdk
```

### 2. Configure

Set environment variables:

```bash
VIENNA_API_URL=https://api.regulator.ai
VIENNA_API_KEY=vos_your_api_key
```

### 3. Add to OpenClaw

```javascript
const { createOpenClawPlugin } = require('@vienna/lib/adapters/openclaw-plugin');

const governance = createOpenClawPlugin({
  apiUrl: process.env.VIENNA_API_URL,
  apiKey: process.env.VIENNA_API_KEY,
  agentId: 'my-openclaw-agent',
  mode: 'enforce' // or 'audit' or 'dry-run'
});
```

### 4. Wrap Tool Calls

```javascript
// Before tool execution
const check = await governance.beforeToolCall('exec', {
  command: 'git push origin main'
}, { sessionKey: 'agent:main' });

if (!check.allowed) {
  console.log(`Blocked: ${check.reason} (${check.tier})`);
  // Handle: show approval URL, notify operator, etc.
  return;
}

// Execute the tool
const result = await originalToolCall('exec', params);

// After execution — report result
await governance.afterToolCall(check.intent_id, {
  success: true,
  output: result.output
});
```

## Risk Classification

Every OpenClaw tool is automatically classified:

| Tier | Tools | Approval |
|------|-------|----------|
| **T0** (Info) | `read`, `web_search`, `web_fetch`, `image`, `memory_search`, `pdf` | Auto ✅ |
| **T1** (Low) | `write`, `edit`, `message`, `browser`, `sessions_spawn`, `tts` | Policy auto ✅ |
| **T2** (Medium) | `exec`, `process` | Human required 🧑 |
| **T3** (Critical) | Any tool with dangerous patterns (`rm -rf`, `DROP TABLE`, etc.) | 2+ humans 🧑🧑 |

### Escalation Patterns

Even T0/T1 tools escalate to T2/T3 if parameters match dangerous patterns:

**→ T3 (Critical):**
- `rm -rf`, `DROP TABLE`, `DELETE FROM ... WHERE 1`, `curl -X DELETE`, `wire transfer`

**→ T2 (Elevated):**
- `sudo`, `chmod 777`, `git push --force`, `kill -9`, `systemctl stop`

### Custom Overrides

```javascript
const governance = createOpenClawPlugin({
  overrides: {
    'exec': 'T3',      // Always require multi-party for exec
    'browser': 'T0',   // Downgrade browser to informational
  }
});
```

## Modes

### Enforce (Production)

```javascript
const governance = createOpenClawPlugin({ mode: 'enforce' });
```

- T0/T1: Auto-approved, warrant issued
- T2: **Blocked** until human approves via console
- T3: **Blocked** until 2+ humans approve
- On API error: **fail-closed** (blocks execution)

### Audit (Monitoring)

```javascript
const governance = createOpenClawPlugin({ mode: 'audit' });
```

- All actions allowed
- Everything logged to Vienna audit trail
- T2/T3 flagged but not blocked
- Great for onboarding — see what WOULD be blocked before enforcing

### Dry-Run (Testing)

```javascript
const governance = createOpenClawPlugin({ mode: 'dry-run' });
```

- No API calls
- Risk classification only
- Console logging of all classifications
- Zero latency impact

## Callbacks

```javascript
const governance = createOpenClawPlugin({
  mode: 'enforce',
  
  onApprovalRequired: ({ intent_id, tool, tier, poll_url }) => {
    // Notify operator via Slack, email, etc.
    slack.send(`⚠️ ${tier} approval needed: ${tool} — ${poll_url}`);
  },
  
  onDenied: ({ intent_id, tool, reason }) => {
    // Log denial
    console.warn(`🚫 Denied: ${tool} — ${reason}`);
  }
});
```

## Statistics

```javascript
const stats = governance.getStats();
// {
//   total: 142,
//   approved: 138,
//   denied: 2,
//   pending: 1,
//   errors: 1,
//   byTier: { T0: 89, T1: 41, T2: 10, T3: 2 }
// }
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  OpenClaw Agent                   │
│    (reasoning, planning, tool selection)          │
└──────────────────┬──────────────────────────────┘
                   │ tool call
                   ▼
┌─────────────────────────────────────────────────┐
│           Vienna Governance Plugin                │
│  ┌──────────┐  ┌─────────┐  ┌───────────────┐  │
│  │ Classify  │→ │ Policy  │→ │ Warrant/Block │  │
│  │ Risk Tier │  │ Check   │  │               │  │
│  └──────────┘  └─────────┘  └───────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │ warranted execution
                   ▼
┌─────────────────────────────────────────────────┐
│              Tool Execution Layer                 │
│    (exec, write, browser, message, etc.)         │
└──────────────────┬──────────────────────────────┘
                   │ result
                   ▼
┌─────────────────────────────────────────────────┐
│         Vienna Verification & Audit              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Verify   │→ │ Record   │→ │ Learn        │  │
│  │ Scope    │  │ Audit    │  │ (improve)    │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────┘
```

## Key Insight

> "We don't ask agents to behave. We remove their ability to misbehave."

The plugin doesn't modify agent reasoning. It controls the execution layer. Agents propose actions; Vienna decides whether they happen. The warrant is consumed by the runtime, not the agent.

## Next Steps

- [Console Dashboard](https://console.regulator.ai) — Monitor governed actions in real-time
- [SDK Docs](https://regulator.ai/docs) — Full API reference
- [Integration Guide](https://regulator.ai/docs/integration-guide) — Connect other frameworks
