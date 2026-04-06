# Vienna OS Quickstart

Go from zero to governed AI agent in 5 minutes.

## Prerequisites

- Node.js 18+
- A Vienna OS account ([sign up free](https://console.regulator.ai/signup))

## Setup

1. Get your API key from [Settings → API Keys](https://console.regulator.ai/settings)

2. Run the quickstart:

```bash
git clone https://github.com/risk-ai/vienna-os.git
cd vienna-os/examples/quickstart
npm install
VIENNA_API_KEY=vos_xxx node index.js
```

Or against a local instance:

```bash
VIENNA_API_KEY=vos_xxx VIENNA_URL=http://localhost:3001 node index.js
```

## What it does

| Step | What happens | Risk tier |
|------|-------------|-----------|
| 1 | Connects to Vienna OS | — |
| 2 | Registers a demo agent | — |
| 3 | Submits a T0 intent | 🟢 Auto-approved |
| 4 | Submits a T1 intent | 🟡 Queued for approval |
| 5 | Checks the audit trail | — |

## Risk Tiers

| Tier | Risk | Approval required | Example |
|------|------|-------------------|---------|
| T0 | Low | None (auto-approved) | Read a log file |
| T1 | Medium | Single human | Process a refund |
| T2 | High | Multi-party + MFA | Deploy to production |
| T3 | Critical | Board-level | Delete customer data |

## Self-hosted / Local Development

```bash
# Start Vienna OS locally with Docker
docker compose up -d

# Run quickstart against local instance
VIENNA_API_KEY=vos_xxx VIENNA_URL=http://localhost:3001 node index.js
```

## Next Steps

- [Full Documentation](https://regulator.ai/docs)
- [SDK Reference](https://regulator.ai/docs/sdk)
- [Policy Guide](https://regulator.ai/docs/policies)
- [Integration Guide](https://regulator.ai/docs/integrations) (LangChain, CrewAI, AutoGen)
- [GitHub Discussions](https://github.com/risk-ai/vienna-os/discussions)
