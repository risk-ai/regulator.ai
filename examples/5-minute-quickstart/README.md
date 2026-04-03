# Vienna OS — 5-Minute Quickstart

**See Vienna OS governance in action with zero setup required**

Run this example to understand how Vienna OS protects AI agents without slowing them down.

## Prerequisites

**None!** This example works out of the box using Vienna OS demo endpoints.

- No API keys needed
- No Vienna OS installation required  
- No authentication setup

## Quick Run

```bash
# Clone repository  
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai/examples/5-minute-quickstart

# Install dependencies (uses local SDK)
npm install

# Run the demo
npm start
# OR: node index.js
```

**Note:** This example uses Vienna OS's demo API, so it works even if you don't have Vienna OS running locally.

## Troubleshooting

**Error: `npm: command not found`**
- Install Node.js from https://nodejs.org/

**Error: `permission denied`**
- Run with `npm start` instead of `node index.js`

**Connection issues:**
- This example uses sandbox APIs - no local Vienna OS needed
- Check your internet connection

## What It Does

Runs 4 scenarios against the Vienna OS sandbox API:

1. **T0 Auto-Approved** — Analytics agent queries revenue metrics (instant)
2. **T1 Policy-Approved** — DevOps agent deploys to production (policy auto-approves)
3. **T2 Human Approval** — Finance agent requests $75K wire transfer (2 humans approve)
4. **DENIED** — Analytics bot tries to export user data (scope violation, blocked)

Each scenario shows the full pipeline: intent → policy → risk tier → approval → warrant → execute → verify → audit.

## What You'll See

```
━━━ Scenario 1: Auto-Approved Read (T0) ━━━
  ✅ Intent received (2ms)
  ✅ Policy evaluation (12ms)
  ✅ Risk assessment: T0 (1ms)
  ✅ Auto-approved (0ms)
  ✅ Warrant issued (3ms)
  ✅ Execution complete (45ms)
  ✅ Verified (2ms)
  ✅ Audit logged (1ms)

  ✅ RESULT: AUTO-APPROVED (T0) — 66ms total
  🔑 Warrant: wrt_7f3a2b1c… | TTL: 300s | Sig: hmac-sha256…
```

## Next Steps

- Try it live: https://regulator.ai/try
- Install the SDK: `npm install @vienna-os/sdk`
- Read the docs: https://regulator.ai/docs
