# Vienna OS — 5-Minute Quickstart

See the complete governance pipeline in action without any setup.

## Run It

```bash
node index.js
```

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
