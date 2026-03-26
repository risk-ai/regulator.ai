# Contributing to Vienna OS

Thank you for your interest in contributing to Vienna OS — the governance control plane for autonomous AI agents.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/regulator.ai.git`
3. **Install dependencies**: `npm install`
4. **Set up environment**: Copy `.env.example` to `.env` and configure

## Project Structure

```
regulator.ai/
├── apps/
│   ├── marketing/          # Next.js marketing site (regulator.ai)
│   └── console/            # Vienna OS operator console
│       ├── client/          # React SPA (Vite)
│       └── server/          # Express API server
├── services/
│   └── vienna-lib/          # Core governance engine
│       ├── core/            # Intent gateway, policy engine, warrants
│       ├── execution/       # Action execution & verification
│       ├── governance/      # Risk tiers, warrant authority
│       ├── distributed/     # Multi-node coordination
│       └── learning/        # Feedback & policy optimization
├── packages/
│   └── sdk/                 # TypeScript SDK for agent integration
└── scripts/                 # Utility scripts
```

## Development

### Marketing Site
```bash
npm run dev:marketing     # http://localhost:3000
```

### Console (Client + Server)
```bash
npm run dev:server        # API server on :3001
npm run dev:console       # React SPA on :5174
```

### Environment Variables
```
VIENNA_OPERATOR_NAME=vienna
VIENNA_OPERATOR_PASSWORD=vienna2024
VIENNA_SESSION_SECRET=your-secret-here
ANTHROPIC_API_KEY=sk-ant-...       # Optional: for chat provider
```

## Making Changes

### Code Style
- TypeScript strict mode where possible
- Use the design system CSS variables (see `apps/console/client/src/styles/variables.css`)
- Inline styles with CSS variables for console components
- Tailwind for marketing site
- JetBrains Mono for data/monospace, Inter for body text

### Commit Messages
We follow conventional commits:
```
feat(console): add policy builder UI
fix(auth): password hashing with scrypt
docs: update API reference
chore: update dependencies
```

### Pull Requests
1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Test locally
4. Push and open a PR against `main`
5. Describe what changed and why

## Architecture Principles

1. **Governance is infrastructure, not advice.** Vienna controls the execution layer — agents never have direct access.
2. **Policy-as-code.** All governance rules are programmable, version-controlled, and auditable.
3. **Zero-trust agents.** Every action requires a warrant. No exceptions.
4. **Append-only audit.** Nothing is deleted from the audit trail. Ever.
5. **Runtime-agnostic.** Works with any agent framework that can make HTTP requests.

## Areas We Need Help

- **Integration adapters** — Slack, Teams, PagerDuty, GitHub, AWS
- **Policy templates** — Industry-specific rule sets (finserv, healthcare, legal)
- **Testing** — Unit tests, integration tests, E2E tests
- **Documentation** — Tutorials, guides, API examples
- **Security review** — Warrant crypto, session management, OWASP compliance

## Code of Conduct

Be professional. Be respectful. We're building governance infrastructure — act like it.

## License

Apache License 2.0. See [LICENSE](./LICENSE).

## Questions?

- Open an issue on GitHub
- Email: admin@ai.ventures
- Docs: https://regulator.ai/docs
