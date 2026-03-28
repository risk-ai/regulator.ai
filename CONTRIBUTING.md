# Contributing to Vienna OS

Thank you for your interest in contributing to Vienna OS! This document provides guidelines and instructions for contributing.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must:

- **Be respectful** of differing viewpoints and experiences
- **Accept constructive criticism** gracefully
- **Focus on what is best** for the community and project
- **Show empathy** towards other community members

**Unacceptable behavior includes:**
- Harassment, trolling, or derogatory comments
- Public or private attacks
- Publishing others' private information without permission
- Any conduct that could reasonably be considered inappropriate

**Enforcement:** Violations may result in temporary or permanent ban from the project.

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **pnpm**
- **Git**
- **SQLite** 3
- (Optional) **Docker** for containerized development

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/regulator.ai.git
cd regulator.ai
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/risk-ai/regulator.ai.git
```

4. Create a feature branch:

```bash
git checkout -b feature/my-awesome-feature
```

---

## Development Setup

### Install Dependencies

```bash
# Root dependencies
npm install

# Vienna lib
cd services/vienna-lib
npm install

# Console server
cd ../../apps/console/server
npm install

# Console client
cd ../client
npm install
```

### Initialize Database

```bash
cd services/vienna-lib
npm run db:init
```

This creates `vienna-state.db` with the full schema.

### Environment Configuration

Copy `.env.example` to `.env` in each service directory:

```bash
# services/vienna-lib/.env
DATABASE_PATH=./vienna-state.db

# apps/console/server/.env
DATABASE_PATH=../../services/vienna-lib/vienna-state.db
PORT=3120
DEMO_USERNAME=vienna
DEMO_PASSWORD=vienna2024

# Optional: Notification adapters
SLACK_WEBHOOK_URL=...
RESEND_API_KEY=...
```

### Start Development Servers

**Terminal 1 (Console Server):**
```bash
cd apps/console/server
npm run dev
```

**Terminal 2 (Console Client):**
```bash
cd apps/console/client
npm run dev
```

Console available at: **http://localhost:5173**

---

## Project Structure

```
regulator.ai/
├── services/
│   └── vienna-lib/           # Core governance library
│       ├── core/              # Intent Gateway, Policy Engine
│       ├── state/             # State Graph (SQLite)
│       ├── adapters/          # Slack, Email, GitHub
│       ├── governance/        # Warrant, Quota, Cost
│       ├── attestation/       # Verification, Audit
│       └── test/              # Test suite (111 tests)
│
├── apps/
│   ├── console/
│   │   ├── server/            # Express API server
│   │   └── client/            # React frontend
│   └── marketing/             # Next.js marketing site
│
├── packages/
│   └── sdk/                   # TypeScript SDK (coming soon)
│
├── docs/                      # Documentation
├── scripts/                   # Build and deployment scripts
├── LICENSE                    # BSL 1.1
├── README.md                  # Project overview
└── CONTRIBUTING.md            # This file
```

---

## Development Workflow

### 1. Choose an Issue

Browse [open issues](https://github.com/risk-ai/regulator.ai/issues) or create a new one.

**Good first issues** are labeled `good-first-issue`.

**Areas to contribute:**
- **Adapters** (Linear, Jira, PagerDuty, etc.)
- **Policy templates** (finance, healthcare, legal domains)
- **SDKs** (Python, Go, Rust)
- **Documentation** improvements
- **Test coverage** expansion
- **Bug fixes**

### 2. Sync with Upstream

Before starting work, sync your fork:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### 3. Create Feature Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/bug-description
```

**Branch naming convention:**
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Test improvements

### 4. Make Changes

Follow [coding standards](#coding-standards) below.

**Key principles:**
- **Small, focused commits** — One logical change per commit
- **Clear commit messages** — Explain *why*, not just *what*
- **Add tests** — All new features need test coverage
- **Update docs** — Document new features or API changes

### 5. Test Your Changes

```bash
# Run test suite
cd services/vienna-lib
npm test

# Run specific test
npm test -- --grep "Intent Gateway"

# Watch mode
npm run test:watch
```

**All tests must pass before submitting PR.**

### 6. Commit Your Changes

```bash
git add .
git commit -m "feat(policy-engine): add regex operator for pattern matching

- Implements regex operator for policy conditions
- Adds test coverage for regex matching
- Updates documentation with examples

Closes #123"
```

**Commit message format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `refactor` — Code refactoring
- `test` — Test changes
- `chore` — Build/tooling changes

**Scopes:**
- `intent-gateway`, `policy-engine`, `state-graph`, `adapters`, `console`, `docs`, etc.

### 7. Push and Open PR

```bash
git push origin feature/my-feature
```

Open a pull request on GitHub:
- **Title:** Brief description (50 chars max)
- **Description:** What changed, why, and how to test
- **Link to issue:** "Closes #123" or "Fixes #456"
- **Screenshots:** For UI changes

---

## Testing

### Test Structure

Tests live in `services/vienna-lib/test/`:

```
test/
├── 01-validation/          # Intent validation tests
├── 02-normalization/       # Intent normalization tests
├── 11-intent-tracing/      # Tracing tests
├── 15-policy-engine/       # Policy evaluation tests
├── 22-quota-enforcement/   # Quota tests
├── 23-attestation/         # Attestation tests
└── 28-integration/         # End-to-end tests
```

### Writing Tests

Use Mocha + Chai:

```javascript
const { expect } = require('chai');
const { IntentGateway } = require('../core/intent-gateway');

describe('Policy Engine', () => {
  let gateway;

  beforeEach(() => {
    gateway = new IntentGateway(mockStateGraph);
  });

  it('should block intent when policy matches', async () => {
    const intent = {
      intent_type: 'wire_transfer',
      payload: { amount: 50000 },
      source: { id: 'agent-1', platform: 'test' }
    };

    const result = await gateway.submitIntent(intent);
    
    expect(result.accepted).to.be.false;
    expect(result.error).to.include('Blocked by policy');
  });
});
```

**Test guidelines:**
- One assertion per test (when practical)
- Clear test names (`should...when...`)
- Mock external dependencies (no real Slack/Email calls)
- Use `beforeEach` for setup, `afterEach` for cleanup

### Running Tests

```bash
# All tests
npm test

# Specific phase
npm test test/15-policy-engine/

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Coverage target:** 80%+ for new code

---

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Documentation updated (if applicable)
- [ ] Changelog updated (for significant changes)
- [ ] Commit messages follow convention
- [ ] Branch is up-to-date with `main`

### PR Checklist

Your PR description should include:

```markdown
## Description
Brief summary of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (requires major version bump)
- [ ] Documentation update

## Testing
- [ ] Added tests for new code
- [ ] All tests pass locally
- [ ] Manual testing completed

## Documentation
- [ ] Updated README (if applicable)
- [ ] Updated API docs (if applicable)
- [ ] Added code comments (for complex logic)

## Related Issues
Closes #123
```

### Review Process

1. **Automated checks** run (tests, linter)
2. **Maintainer review** (usually within 48 hours)
3. **Feedback addressed** (if any)
4. **Approval + merge**

**Merge criteria:**
- All checks pass
- At least one maintainer approval
- No unresolved comments
- Branch up-to-date with `main`

---

## Coding Standards

### JavaScript/TypeScript

**Style:**
- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Line length:** 100 characters max
- **Naming:**
  - `camelCase` for variables and functions
  - `PascalCase` for classes
  - `UPPER_SNAKE_CASE` for constants

**ESLint config:** `.eslintrc.json`

```javascript
// Good
const intentGateway = new IntentGateway(stateGraph);
const result = await gateway.submitIntent(intent);

// Bad
const IntentGateway = new IntentGateway(stateGraph);  // Should be camelCase
const result = await gateway.submitIntent(intent)     // Missing semicolon
```

### Database Queries

**Always use parameterized queries:**

```javascript
// Good
const stmt = db.prepare('SELECT * FROM policies WHERE tenant_id = ?');
const rows = stmt.all(tenant_id);

// Bad (SQL injection risk)
const rows = db.prepare(`SELECT * FROM policies WHERE tenant_id = '${tenant_id}'`).all();
```

### Error Handling

**Always handle errors gracefully:**

```javascript
// Good
try {
  await adapter.sendNotification(payload);
} catch (error) {
  console.error('[IntentGateway] Notification failed:', error.message);
  // Continue execution (notification is non-blocking)
}

// Bad (unhandled rejection)
await adapter.sendNotification(payload);
```

### Comments

**Use comments for:**
- Complex logic that isn't self-explanatory
- Why decisions were made (not what the code does)
- TODOs with issue numbers

```javascript
// Good
// Policy evaluation happens AFTER validation but BEFORE execution
// to ensure policies can modify approval requirements
const policyActions = this.stateGraph.evaluatePolicies(tenant_id, intent);

// Bad
// Get policy actions
const policyActions = this.stateGraph.evaluatePolicies(tenant_id, intent);
```

---

## Documentation

### Code Documentation

**JSDoc for public APIs:**

```javascript
/**
 * Submit intent for governance evaluation
 * 
 * @param {Intent} intent - Intent object with type, payload, source
 * @returns {Promise<IntentResult>} Result with acceptance status
 * @throws {ValidationError} If intent schema invalid
 * 
 * @example
 * const result = await gateway.submitIntent({
 *   intent_type: 'check_system_health',
 *   payload: {},
 *   source: { id: 'operator-1', platform: 'api' }
 * });
 */
async submitIntent(intent) {
  // ...
}
```

### README Updates

When adding features, update:
- **Quick Start** (if setup changes)
- **Key Features** (if user-facing)
- **API Reference** (if new endpoints)
- **Architecture** (if pipeline changes)

### Changelog

Add entry to `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- Policy Builder notify action for Slack/Email integration (#123)
- Agent Fleet Dashboard with auto-tracking (#124)

### Fixed
- Warrant expiration check now respects timezone (#125)

### Changed
- Risk tier classification now uses Policy Engine (#126)
```

---

## Community

### Communication Channels

- **GitHub Issues** — Bug reports, feature requests
- **GitHub Discussions** — General questions, ideas
- **Discord** (coming soon) — Real-time chat
- **Email** — hello@regulator.ai for sensitive topics

### Getting Help

**Before asking:**
1. Check [documentation](https://regulator.ai/docs)
2. Search [existing issues](https://github.com/risk-ai/regulator.ai/issues)
3. Review [examples](https://github.com/risk-ai/regulator.ai/tree/main/examples)

**When asking:**
- Provide context (what you're trying to do)
- Include error messages (full stack trace)
- Share minimal reproduction code
- Mention your environment (Node version, OS)

### Recognition

Contributors are recognized in:
- **GitHub contributors page**
- **README credits section**
- **Release notes** (for significant contributions)

**Top contributors may be invited to:**
- Maintainer team
- Private Slack channel
- Early access to new features

---

## License

By contributing to Vienna OS, you agree that your contributions will be licensed under the **Business Source License 1.1**.

See [LICENSE](LICENSE) for full terms.

---

## Questions?

Reach out to:
- **Max Anderson** — [@maxanderson](https://github.com/maxanderson95) (Architecture, backend)
- **Aiden** — [@aiden](https://github.com/aidenfrog) (Frontend, adapters)

Or email: **hello@regulator.ai**

---

**Thank you for contributing to Vienna OS!** 🛡️
