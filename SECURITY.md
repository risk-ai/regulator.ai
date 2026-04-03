# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.10.x  | ✅ Current release |
| < 0.10  | ❌ No longer supported |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues via one of the following:

- **Email:** [security@ai.ventures](mailto:security@ai.ventures)
- **Subject line format:** `[SECURITY] Vienna OS — Brief description`

### What to include

- Description of the vulnerability
- Steps to reproduce (proof of concept if possible)
- Affected component(s) — console, runtime, SDK, marketing site, etc.
- Impact assessment (what an attacker could achieve)
- Any suggested fixes

### Response timeline

| Action | Timeframe |
| ------ | --------- |
| Acknowledgment | Within 48 hours |
| Initial triage | Within 5 business days |
| Status update | Within 10 business days |
| Fix release (critical) | Within 30 days |
| Fix release (moderate) | Within 90 days |

### What to expect

1. We'll acknowledge your report and assign a tracking ID
2. We'll investigate and determine severity using CVSS scoring
3. We'll develop and test a fix
4. We'll coordinate disclosure timing with you
5. We'll credit you in the advisory (unless you prefer anonymity)

## Scope

The following are in scope for security reports:

- **Console application** (console.regulator.ai)
- **Marketing site** (regulator.ai)
- **API endpoints** and authentication flows
- **SDK packages** (@vienna-os/sdk, vienna-os Python SDK)
- **Cryptographic warrant** signing and verification
- **Policy evaluation engine**
- **Database access controls** and tenant isolation

### Out of scope

- Social engineering attacks against team members
- Denial of service (volumetric/network-layer)
- Issues in third-party dependencies (report upstream, but let us know)
- Self-hosted instances with modified source code

## Security Architecture

Vienna OS is built with security as a core design principle:

- **Cryptographic warrants** — HMAC-SHA256 signed, time-limited execution tokens
- **Row-level tenant isolation** — Multi-tenant data separation at the database level
- **Rate limiting** — Applied to authentication, API, and execution endpoints
- **Input validation** — All inputs validated and sanitized before processing
- **Audit logging** — Immutable, tamper-evident logs of all governance actions
- **Least privilege** — Agents receive only the permissions their warrants authorize

## Responsible Disclosure

We follow coordinated disclosure practices. We ask that you:

- Give us reasonable time to fix issues before public disclosure
- Don't access or modify other users' data during research
- Don't perform actions that could harm service availability
- Act in good faith to avoid privacy violations and data destruction

We will not pursue legal action against researchers who follow this policy.

## Bug Bounty

We don't currently operate a formal bug bounty program. However, we recognize and credit researchers who report valid security issues. Significant findings may receive discretionary rewards.

## Contact

- **Security reports:** security@ai.ventures
- **General inquiries:** admin@ai.ventures
- **PGP key:** Available upon request
