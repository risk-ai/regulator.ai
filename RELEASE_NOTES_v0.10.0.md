# Vienna OS v0.10.0 — First Public Release

The governance layer AI agents answer to.

## Highlights

**Vienna OS is the first execution control plane for autonomous AI systems.** It sits between agent intent and execution — every action gets policy evaluation, risk tiering, cryptographic authorization, and immutable audit logging.

### Core Platform
- **9 Governance Engines** — Intent Gateway, Policy Engine, Risk Tiering, Approval Workflows, Warrant Authority, Execution Router, Verification Engine, Audit Trail, Fleet Management
- **Execution Warrants** — Cryptographically signed (HMAC-SHA256), time-limited, scope-constrained authorization tokens. No warrant, no execution.
- **4 Risk Tiers** — T0 (auto-approve), T1 (policy auto), T2 (human approval), T3 (multi-party)
- **Policy-as-Code** — Define governance rules programmatically with 45+ pre-built templates

### SDK & Integrations
- **TypeScript SDK** — [`@vienna-os/sdk`](https://www.npmjs.com/package/@vienna-os/sdk) on npm
- **Framework Adapters** — LangChain, CrewAI, AutoGen, OpenClaw (5 lines of code to integrate)
- **Adapter Ecosystem** — Slack (interactive approvals), Email (Resend), GitHub (deployment governance), Webhooks

### Infrastructure
- **Console** — 16-page management UI at [console.regulator.ai](https://console.regulator.ai)
- **Marketing Site** — 28+ routes at [regulator.ai](https://regulator.ai)
- **Interactive Playground** — Try governance scenarios live at [regulator.ai/try](https://regulator.ai/try)
- **Cinematic Demo** — Auto-playing walkthrough at [regulator.ai/demo](https://regulator.ai/demo)

### Compliance & Security
- SOC 2 policy documentation (98% complete)
- EU AI Act alignment
- HIPAA, SOX, FINRA, NIST AI RMF governance templates
- USPTO Patent #64/018,152

## Breaking Changes

- **Infrastructure migration:** Console backend migrated from Fly.io to NUC + Cloudflare Tunnel. Console URL unchanged (console.regulator.ai).
- **Database:** Migrated to Neon Postgres (from Fly Postgres)

## Installation

```bash
npm install @vienna-os/sdk
```

```typescript
import { ViennaClient } from '@vienna-os/sdk';

const client = new ViennaClient({
  baseUrl: 'https://console.regulator.ai',
  apiKey: 'vos_your_key',
});

const result = await client.intent.submit({
  action: 'deploy_service',
  source: 'my-agent',
  parameters: { version: 'v2.3' },
});
```

## What's Next

- Python SDK (`pip install vienna-os`)
- npm/PyPI SDK publish automation
- GitHub Actions governance plugin
- Enterprise pilot program
- SOC 2 Type I certification

## Links

- **Website:** https://regulator.ai
- **Console:** https://console.regulator.ai
- **npm:** https://www.npmjs.com/package/@vienna-os/sdk
- **Docs:** https://regulator.ai/docs
- **License:** BSL 1.1 (converts to Apache 2.0 on 2030-03-28)

---

Built by [ai.ventures](https://ai.ventures) × Cornell Law
